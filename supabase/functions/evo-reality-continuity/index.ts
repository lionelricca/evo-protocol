import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";
import { rejectUntrustedBrowserOrigin, restrictedPreflight, withRestrictedCors } from "../_shared/evo-cors.ts";

const sealRe = /^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const walletRe = /^0x[0-9a-f]{40}$/;
const hex64 = /^[0-9a-f]{64}$/;
const MAX_BODY_BYTES = 16_384;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
function hex(bytes: Uint8Array) { return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function sha256(text: string) { const b = new TextEncoder().encode(text); return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", b))); }
function canonical(value: Record<string, unknown>) { const out: Record<string, unknown> = {}; for (const key of Object.keys(value).sort()) out[key] = value[key]; return JSON.stringify(out); }
function snapshotId(root: string) { return `EVR-${root.slice(0, 8).toUpperCase()}-${root.slice(8, 16).toUpperCase()}-${root.slice(16, 24).toUpperCase()}`; }

async function buildEvidence(db: any, sealId: string) {
  const { data: seal, error: sealError } = await db.from("evo_seals").select("seal_id,digest,status,issuer_wallet").eq("seal_id", sealId).single();
  if (sealError || !seal) throw Object.assign(new Error("seal_not_found"), { status: 404 });
  const issuerWallet = String(seal.issuer_wallet || "").toLowerCase();
  const [profileResult, latestEventResult, latestTransferResult, latestPulseResult, challengeResult] = await Promise.all([
    db.from("evo_issuer_profiles").select("profile_hash,status").eq("issuer_wallet", issuerWallet).maybeSingle(),
    db.from("evo_passport_events").select("event_digest,registered_at").eq("seal_id", sealId).eq("status", "ACTIVE").order("registered_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("evo_passport_events").select("new_owner_wallet,registered_at").eq("seal_id", sealId).eq("event_type", "TRANSFERRED").eq("status", "ACTIVE").order("registered_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("evo_pulses").select("pulse_hash,observed_ms").eq("seal_id", sealId).eq("status", "ACTIVE").order("observed_ms", { ascending: false }).limit(1).maybeSingle(),
    db.from("evo_challenges").select("challenge_id,completed_at").eq("seal_id", sealId).eq("status", "CONSUMED").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const r of [profileResult, latestEventResult, latestTransferResult, latestPulseResult, challengeResult]) if (r.error) throw Object.assign(new Error("database_error"), { status: 500 });
  const profile = profileResult.data, latestEvent = latestEventResult.data, latestTransfer = latestTransferResult.data, latestPulse = latestPulseResult.data, latestChallenge = challengeResult.data;
  const currentOwner = String(latestTransfer?.new_owner_wallet || issuerWallet).toLowerCase();
  const state = { version: "EVO-REALITY-EVIDENCE-V0", sealId, sealDigest: String(seal.digest || "").toLowerCase(), sealStatus: String(seal.status || "ACTIVE").toUpperCase(), issuerWallet, issuerTrust: String(profile?.status || "SELF_DECLARED").toUpperCase(), issuerProfileHash: String(profile?.profile_hash || "NONE").toLowerCase(), currentOwner, passportHead: String(latestEvent?.event_digest || "NONE").toLowerCase(), pulseHead: String(latestPulse?.pulse_hash || "NONE").toLowerCase(), challengeHead: String(latestChallenge?.challenge_id || "NONE").toUpperCase(), physicalProofHead: "NONE" };
  const evidenceRoot = await sha256(canonical(state));
  return { state, evidenceRoot, currentOwner };
}

async function latestCheckpoint(db: any, sealId: string) {
  const { data, error } = await db.from("evo_reality_snapshots").select("snapshot_id,evidence_root,continuity_root,previous_continuity_root,signer_wallet,signed_at,registered_at,status").eq("seal_id", sealId).eq("status", "ACTIVE").order("registered_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw Object.assign(new Error("database_error"), { status: 500 });
  return data || null;
}
function continuityMessage(sealId: string, evidenceRoot: string, previousRoot: string, signer: string, signedAt: string) { return `EVO PROOF OF CONTINUITY V0\nSeal ID: ${sealId}\nEvidence Root: ${evidenceRoot}\nPrevious Root: ${previousRoot}\nSigner: ${signer}\nSigned: ${signedAt}`; }

async function handle(req: Request) {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const declaredLength = Number(req.headers.get("content-length") || "0"); if (declaredLength > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
    const raw = await req.text(); if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
    let body: Record<string, any>; try { body = JSON.parse(raw || "{}"); } catch { return json({ error: "invalid_json" }, 400); }
    const action = String(body?.action || "get").toLowerCase(); if (!['get', 'prepare', 'commit'].includes(action)) return json({ error: "invalid_action" }, 400);
    const sealId = String(body?.sealId || body?.payload?.sealId || "").trim().toUpperCase(); if (!sealRe.test(sealId)) return json({ error: "invalid_seal_id" }, 400);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const evidence = await buildEvidence(db, sealId); const latest = await latestCheckpoint(db, sealId); const previousRoot = String(latest?.continuity_root || "GENESIS"); const alreadyCheckpointed = String(latest?.evidence_root || "") === evidence.evidenceRoot;
    if (action === "get") return json({ ok: true, sealId, evidenceRoot: evidence.evidenceRoot, evidenceState: evidence.state, currentOwner: evidence.currentOwner, latestCheckpoint: latest, chainState: alreadyCheckpointed ? "CURRENT_CHECKPOINTED" : latest ? "NEW_EVIDENCE_PENDING_CHECKPOINT" : "GENESIS_PENDING_CHECKPOINT" });
    if (action === "prepare") {
      if (alreadyCheckpointed) return json({ ok: true, alreadyCheckpointed: true, sealId, evidenceRoot: evidence.evidenceRoot, currentOwner: evidence.currentOwner, latestCheckpoint: latest, chainState: "CURRENT_CHECKPOINTED" });
      const signedAt = new Date().toISOString(); const payload = { version: "EVO-CONTINUITY-V0", sealId, previousContinuityRoot: previousRoot, evidenceRoot: evidence.evidenceRoot, signerWallet: evidence.currentOwner, signedAt }; const continuityRoot = await sha256(canonical(payload)); const signatureMessage = continuityMessage(sealId, evidence.evidenceRoot, previousRoot, evidence.currentOwner, signedAt);
      return json({ ok: true, alreadyCheckpointed: false, sealId, evidenceRoot: evidence.evidenceRoot, previousContinuityRoot: previousRoot, continuityRoot, currentOwner: evidence.currentOwner, signedAt, signatureMessage, evidenceState: evidence.state, chainState: latest ? "READY_TO_EXTEND" : "READY_FOR_GENESIS" });
    }
    const p = body?.payload || {}; const submittedEvidence = String(p.evidenceRoot || "").toLowerCase(); const submittedPrevious = String(p.previousContinuityRoot || ""); const submittedRoot = String(p.continuityRoot || "").toLowerCase(); const signer = String(p.signerWallet || "").toLowerCase(); const signedAt = String(p.signedAt || ""); const signature = String(p.signature || ""); const signatureMessage = String(p.signatureMessage || "");
    if (!hex64.test(submittedEvidence) || !hex64.test(submittedRoot)) return json({ error: "invalid_root" }, 400); if (!(submittedPrevious === "GENESIS" || hex64.test(submittedPrevious))) return json({ error: "invalid_previous_root" }, 400); if (!walletRe.test(signer)) return json({ error: "invalid_signer" }, 400); if (signature.length < 1 || signature.length > 512 || signatureMessage.length < 1 || signatureMessage.length > 2048) return json({ error: "invalid_signature_evidence" }, 400);
    const signedMs = Date.parse(signedAt); if (Number.isNaN(signedMs)) return json({ error: "invalid_signed_at" }, 400); const age = Date.now() - signedMs; if (age > 5 * 60 * 1000 || age < -60 * 1000) return json({ error: "stale_or_future_signature" }, 409); if (alreadyCheckpointed) return json({ error: "evidence_already_checkpointed", latestCheckpoint: latest }, 409); if (submittedEvidence !== evidence.evidenceRoot) return json({ error: "stale_evidence_root", currentEvidenceRoot: evidence.evidenceRoot }, 409); if (submittedPrevious !== previousRoot) return json({ error: "stale_previous_root", currentPreviousRoot: previousRoot }, 409); if (signer !== evidence.currentOwner) return json({ error: "signer_is_not_current_owner", currentOwner: evidence.currentOwner }, 403);
    const payload = { version: "EVO-CONTINUITY-V0", sealId, previousContinuityRoot: previousRoot, evidenceRoot: evidence.evidenceRoot, signerWallet: signer, signedAt }; const expectedRoot = await sha256(canonical(payload)); if (expectedRoot !== submittedRoot) return json({ error: "continuity_root_mismatch" }, 400); const expectedMessage = continuityMessage(sealId, evidence.evidenceRoot, previousRoot, signer, signedAt); if (signatureMessage !== expectedMessage) return json({ error: "signature_message_mismatch" }, 400); const valid = await verifyMessage({ address: signer as `0x${string}`, message: expectedMessage, signature: signature as `0x${string}` }); if (!valid) return json({ error: "invalid_signature" }, 401);
    const row = { snapshot_id: snapshotId(expectedRoot), seal_id: sealId, version: "EVO-CONTINUITY-V0", evidence_root: evidence.evidenceRoot, continuity_root: expectedRoot, previous_continuity_root: previousRoot, evidence_state: evidence.state, signer_wallet: signer, signature, signature_message: expectedMessage, signed_at: signedAt, status: "ACTIVE" };
    const { data, error } = await db.from("evo_reality_snapshots").insert(row).select("snapshot_id,seal_id,evidence_root,continuity_root,previous_continuity_root,signer_wallet,signed_at,registered_at,status").single();
    if (error) { if (error.code === "23505") return json({ error: "continuity_conflict_reprepare" }, 409); return json({ error: "database_error" }, 500); }
    return json({ ok: true, checkpoint: data, chainState: "CHECKPOINT_ACCEPTED" }, 201);
  } catch (err) { const code = err instanceof Error ? err.message : "internal_error"; if (code === "seal_not_found") return json({ error: code }, 404); if (code === "database_error") return json({ error: code }, 500); return json({ error: "internal_error" }, 500); }
}

Deno.serve(async (req: Request) => {
  const preflight = restrictedPreflight(req); if (preflight) return preflight;
  const denied = rejectUntrustedBrowserOrigin(req); if (denied) return denied;
  return withRestrictedCors(req, await handle(req));
});
