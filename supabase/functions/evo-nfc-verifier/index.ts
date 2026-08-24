import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import {
  rejectUntrustedBrowserOrigin,
  restrictedPreflight,
  withRestrictedCors,
} from "../_shared/evo-cors.ts";
// @ts-ignore shared plain ESM is intentionally executed by both Node CI and Supabase Edge
import {
  bytesToHex,
  hexToBytes,
  verifyNtag424Sun,
} from "../_shared/evo-aes-cmac.mjs";

const MAX_BODY_BYTES = 16_384;
const TAG_ID_RE = /^NFC-[A-Z0-9]{12,40}$/;
const SEAL_ID_RE = /^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const HEX_16 = /^[0-9a-fA-F]{32}$/;
const HEX_8 = /^[0-9a-fA-F]{16}$/;
const HEX_UID7 = /^[0-9a-fA-F]{14}$/;
const ACTIONS = new Set(["status", "self_test", "enroll_binding", "verify_crypto"]);

type AnyRecord = Record<string, any>;
type PilotProfile = {
  enabled: boolean;
  sealId: string;
  expectedUid: string;
  metaReadKey: string;
  fileReadKey: string;
  macInputMode?: "ZERO_LENGTH";
  tagType?: "NTAG_424_DNA" | "NTAG_424_DNA_TAGTAMPER";
  physicalPilotApproved?: boolean;
};

function baseJson(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
function json(req: Request, data: unknown, status = 200) {
  return withRestrictedCors(req, baseJson(data, status));
}
function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}
function safeTagId(raw: unknown) {
  const value = String(raw ?? "").trim().toUpperCase();
  if (!TAG_ID_RE.test(value)) throw new Error("tag_id_invalid");
  return value;
}
function safeSealId(raw: unknown) {
  const value = String(raw ?? "").trim().toUpperCase();
  if (!SEAL_ID_RE.test(value)) throw new Error("seal_id_invalid");
  return value;
}
function parseProfiles(): Record<string, PilotProfile> {
  const raw = Deno.env.get("EVO_NFC_PILOT_KEYS") || "";
  if (!raw) throw new Error("nfc_pilot_key_store_not_configured");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("nfc_pilot_key_store_invalid"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("nfc_pilot_key_store_invalid");
  return parsed as Record<string, PilotProfile>;
}
function loadProfile(tagId: string) {
  const profile = parseProfiles()[tagId];
  if (!profile || profile.enabled !== true) throw new Error("nfc_tag_not_enrolled");
  if (!HEX_UID7.test(String(profile.expectedUid || ""))) throw new Error("nfc_profile_uid_invalid");
  if (!HEX_16.test(String(profile.metaReadKey || "")) || !HEX_16.test(String(profile.fileReadKey || ""))) throw new Error("nfc_profile_key_invalid");
  profile.sealId = safeSealId(profile.sealId);
  if ((profile.macInputMode || "ZERO_LENGTH") !== "ZERO_LENGTH") throw new Error("nfc_mac_input_mode_unsupported");
  return profile;
}
function equalHex(a: string, b: string) {
  const left = a.toUpperCase(), right = b.toUpperCase();
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
async function sha256(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function secureEqual(a: string, b: string) {
  const [left, right] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
async function requireAdmin(req: Request) {
  const expected = Deno.env.get("EVO_NFC_ADMIN_SECRET") || "";
  if (expected.length < 32) throw new Error("nfc_admin_secret_not_configured");
  const provided = req.headers.get("x-evo-nfc-admin") || "";
  if (!provided || !(await secureEqual(provided, expected))) throw new Error("nfc_admin_authorization_failed");
}
function secretKey() {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const keys = JSON.parse(modern);
      if (typeof keys?.default === "string") return keys.default;
      const first = Object.values(keys).find((value) => typeof value === "string");
      if (typeof first === "string") return first;
    } catch {}
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new Error("server_secret_unavailable");
  return legacy;
}
function dbClient() {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("supabase_url_unavailable");
  return createClient(url, secretKey(), { auth: { persistSession: false } });
}
async function selfTest() {
  const zero = hexToBytes("00000000000000000000000000000000");
  const result = await verifyNtag424Sun({
    metaReadKey: zero,
    fileReadKey: zero,
    piccEncData: hexToBytes("EF963FF7828658A599F3041510671E88"),
    sdmMac: hexToBytes("94EED9EE65337086"),
  });
  return result.valid && bytesToHex(result.uid) === "04DE5F1EACC040" && result.counter === 61;
}

Deno.serve(async (req: Request) => {
  const preflight = restrictedPreflight(req);
  if (preflight) return preflight;
  const originRejection = rejectUntrustedBrowserOrigin(req);
  if (originRejection) return originRejection;
  if (req.method !== "POST") return json(req, { ok: false, error: "method_not_allowed" }, 405);

  const raw = await req.text();
  if (byteLength(raw) > MAX_BODY_BYTES) return json(req, { ok: false, error: "request_too_large" }, 413);
  let body: AnyRecord;
  try { body = raw ? JSON.parse(raw) : {}; } catch { return json(req, { ok: false, error: "invalid_json" }, 400); }
  const action = String(body.action || "status").trim().toLowerCase();
  if (!ACTIONS.has(action)) return json(req, { ok: false, error: "unsupported_action" }, 400);

  if (action === "status") {
    return json(req, {
      ok: true,
      service: "EVO NFC Verifier V4.5",
      chipProfile: "NXP_NTAG_424_DNA_AES_SDM",
      cryptoEngine: "NXP_AN12196_REV_2_0_VECTOR_VALIDATED",
      replayAuthority: "ATOMIC_TAG_UID_SEAL_COUNTER_RPC",
      productionSecurityLintsAfterMigration: 0,
      publicClaim: "PHYSICAL_PILOT_REQUIRED_PER_TAG",
      tamperStatus: "NOT_YET_IMPLEMENTED",
      pilotKeysConfigured: Boolean(Deno.env.get("EVO_NFC_PILOT_KEYS")),
    });
  }

  if (action === "self_test") {
    try { return json(req, { ok: true, vector: "NXP_AN12196_TABLE_4", passed: await selfTest() }); }
    catch { return json(req, { ok: false, error: "nfc_crypto_self_test_failed" }, 500); }
  }

  try {
    const tagId = safeTagId(body.tagId);
    const profile = loadProfile(tagId);

    if (action === "enroll_binding") {
      await requireAdmin(req);
      const db = dbClient();
      const { data: seal, error: sealError } = await db.from("evo_seals").select("seal_id,status").eq("seal_id", profile.sealId).maybeSingle();
      if (sealError) throw new Error("nfc_seal_lookup_failed");
      if (!seal || seal.status !== "ACTIVE") throw new Error("nfc_seal_not_active");
      const { error } = await db.from("evo_nfc_tags").insert({
        tag_id: tagId,
        seal_id: profile.sealId,
        tag_type: profile.tagType || "NTAG_424_DNA",
        expected_uid: String(profile.expectedUid).toUpperCase(),
        status: "ACTIVE",
      });
      if (error) {
        if (String(error.code || "") === "23505") throw new Error("nfc_binding_already_exists");
        throw new Error("nfc_binding_insert_failed");
      }
      return json(req, { ok: true, enrolled: true, tagId, sealId: profile.sealId, tagType: profile.tagType || "NTAG_424_DNA" });
    }

    const piccData = String(body.piccData || "").trim();
    const mac = String(body.mac || "").trim();
    if (!HEX_16.test(piccData)) throw new Error("picc_data_invalid");
    if (!HEX_8.test(mac)) throw new Error("sdm_mac_invalid");

    const result = await verifyNtag424Sun({
      metaReadKey: hexToBytes(profile.metaReadKey),
      fileReadKey: hexToBytes(profile.fileReadKey),
      piccEncData: hexToBytes(piccData),
      sdmMac: hexToBytes(mac),
    });
    const uid = bytesToHex(result.uid);
    const uidMatchesEnrollment = equalHex(uid, profile.expectedUid);
    const cryptoValid = result.valid && uidMatchesEnrollment;
    if (!cryptoValid) {
      return json(req, { ok: true, tagId, sealId: profile.sealId, cryptoValid: false, uidMatchesEnrollment, readCounter: result.counter, evidenceState: "CRYPTO_REJECTED", nfcCryptoVerified: false });
    }

    const db = dbClient();
    const { data: authority, error: authorityError } = await db.rpc("evo_accept_nfc_counter", {
      p_tag_id: tagId,
      p_uid: uid,
      p_seal_id: profile.sealId,
      p_counter: result.counter,
      p_verified_at: new Date().toISOString(),
    });
    if (authorityError) throw new Error("nfc_replay_authority_failed");
    const replayAccepted = Boolean(authority?.accepted);
    const physicalApproved = profile.physicalPilotApproved === true;
    const fullyVerified = cryptoValid && replayAccepted && physicalApproved;
    const evidenceState = !replayAccepted
      ? (authority?.reason === "REPLAY_OR_STALE_COUNTER" ? "REPLAY_REJECTED" : "TAG_BINDING_REJECTED")
      : physicalApproved ? "NFC_CRYPTO_VERIFIED" : "CRYPTO_AND_REPLAY_VALIDATED_PENDING_PHYSICAL_PILOT";

    return json(req, {
      ok: true,
      tagId,
      sealId: profile.sealId,
      tagType: profile.tagType || "NTAG_424_DNA",
      cryptoValid,
      uidMatchesEnrollment,
      replayAccepted,
      replayReason: String(authority?.reason || ""),
      readCounter: result.counter,
      physicalPilotApproved: physicalApproved,
      evidenceState,
      nfcCryptoVerified: fullyVerified,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "nfc_verification_failed";
    const status = message.includes("not_configured") || message.includes("unavailable") ? 503
      : message.includes("authorization_failed") ? 403
      : message.includes("not_enrolled") || message.includes("not_active") ? 404
      : message.includes("already_exists") ? 409
      : 400;
    return json(req, { ok: false, error: message }, status);
  }
});
