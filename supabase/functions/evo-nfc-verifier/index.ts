import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  rejectUntrustedBrowserOrigin,
  restrictedPreflight,
  withRestrictedCors,
} from "../_shared/evo-cors.ts";
// Shared runtime is plain ESM so Node CI and Supabase Edge execute the exact same crypto code.
// @ts-ignore relative .mjs module intentionally has no separate declaration file
import {
  bytesToHex,
  hexToBytes,
  verifyNtag424Sun,
} from "../_shared/evo-aes-cmac.mjs";

const MAX_BODY_BYTES = 16_384;
const TAG_ID_RE = /^NFC-[A-Z0-9]{12,40}$/;
const HEX_16 = /^[0-9a-fA-F]{32}$/;
const HEX_8 = /^[0-9a-fA-F]{16}$/;
const HEX_UID7 = /^[0-9a-fA-F]{14}$/;
const ACTIONS = new Set(["status", "self_test", "verify_crypto"]);

type AnyRecord = Record<string, any>;

type PilotProfile = {
  enabled: boolean;
  sealId: string;
  expectedUid: string;
  metaReadKey: string;
  fileReadKey: string;
  macInputMode?: "ZERO_LENGTH";
  tagType?: "NTAG_424_DNA" | "NTAG_424_DNA_TAGTAMPER";
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

function parseProfiles(): Record<string, PilotProfile> {
  const raw = Deno.env.get("EVO_NFC_PILOT_KEYS") || "";
  if (!raw) throw new Error("nfc_pilot_key_store_not_configured");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("nfc_pilot_key_store_invalid");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("nfc_pilot_key_store_invalid");
  return parsed as Record<string, PilotProfile>;
}

function loadProfile(tagId: string) {
  const profile = parseProfiles()[tagId];
  if (!profile || profile.enabled !== true) throw new Error("nfc_tag_not_enrolled");
  if (!HEX_UID7.test(String(profile.expectedUid || ""))) throw new Error("nfc_profile_uid_invalid");
  if (!HEX_16.test(String(profile.metaReadKey || "")) || !HEX_16.test(String(profile.fileReadKey || ""))) {
    throw new Error("nfc_profile_key_invalid");
  }
  if ((profile.macInputMode || "ZERO_LENGTH") !== "ZERO_LENGTH") throw new Error("nfc_mac_input_mode_unsupported");
  return profile;
}

function equalHex(a: string, b: string) {
  const left = a.toUpperCase();
  const right = b.toUpperCase();
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
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
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return json(req, { ok: false, error: "invalid_json" }, 400);
  }

  const action = String(body.action || "status").trim().toLowerCase();
  if (!ACTIONS.has(action)) return json(req, { ok: false, error: "unsupported_action" }, 400);

  if (action === "status") {
    return json(req, {
      ok: true,
      service: "EVO NFC Verifier V4.4",
      chipProfile: "NXP_NTAG_424_DNA_AES_SDM",
      cryptoEngine: "NXP_AN12196_REV_2_0_VECTOR_VALIDATED",
      publicClaim: "NOT_YET_NFC_CRYPTO_VERIFIED",
      replayAuthority: "PENDING_ATOMIC_COUNTER_REGISTRY",
      tamperStatus: "NOT_YET_IMPLEMENTED",
      pilotKeysConfigured: Boolean(Deno.env.get("EVO_NFC_PILOT_KEYS")),
    });
  }

  if (action === "self_test") {
    try {
      return json(req, { ok: true, vector: "NXP_AN12196_TABLE_4", passed: await selfTest() });
    } catch {
      return json(req, { ok: false, error: "nfc_crypto_self_test_failed" }, 500);
    }
  }

  try {
    const tagId = safeTagId(body.tagId);
    const piccData = String(body.piccData || "").trim();
    const mac = String(body.mac || "").trim();
    if (!HEX_16.test(piccData)) throw new Error("picc_data_invalid");
    if (!HEX_8.test(mac)) throw new Error("sdm_mac_invalid");

    const profile = loadProfile(tagId);
    const result = await verifyNtag424Sun({
      metaReadKey: hexToBytes(profile.metaReadKey),
      fileReadKey: hexToBytes(profile.fileReadKey),
      piccEncData: hexToBytes(piccData),
      sdmMac: hexToBytes(mac),
    });
    const uid = bytesToHex(result.uid);
    const uidMatchesEnrollment = equalHex(uid, profile.expectedUid);
    const cryptoValid = result.valid && uidMatchesEnrollment;

    return json(req, {
      ok: true,
      tagId,
      sealId: String(profile.sealId || ""),
      tagType: profile.tagType || "NTAG_424_DNA",
      cryptoValid,
      uidMatchesEnrollment,
      readCounter: result.counter,
      evidenceState: cryptoValid ? "CRYPTO_MATCH_PENDING_REPLAY_AUTHORITY" : "CRYPTO_REJECTED",
      nfcCryptoVerified: false,
      reason: cryptoValid
        ? "Cryptographic SDM proof matches, but atomic replay/counter authority and physical pilot evidence are still required before EVO emits NFC_CRYPTO_VERIFIED."
        : "SDM proof or enrolled UID did not match.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "nfc_verification_failed";
    const status = message.includes("not_configured") ? 503 : message.includes("not_enrolled") ? 404 : 400;
    return json(req, { ok: false, error: message }, status);
  }
});
