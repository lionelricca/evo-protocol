import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const walletRe = /^0x[0-9a-f]{40}$/;
const sealRe = /^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const eventRe = /^EVD-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const hex64 = /^[0-9a-f]{64}$/;
const hex32 = /^[0-9a-f]{32}$/;
const allowed = new Set(["DOCUMENT_REVOKED", "DOCUMENT_SUPERSEDED", "DOCUMENT_NOTE"]);
const MAX_REASON = 1200;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json();
    const event = body?.event;
    if (!event || typeof event !== "object") return json({ error: "invalid_payload" }, 400);

    const required = ["eventId", "sealId", "version", "eventType", "actorWallet", "eventDigest", "nonce", "signature", "signatureMessage", "createdAt"];
    for (const key of required) if (!event[key]) return json({ error: `missing_${key}` }, 400);

    if (event.version !== "EVO-DOCUMENT-LIFECYCLE-V1") return json({ error: "invalid_version" }, 400);
    if (!sealRe.test(String(event.sealId))) return json({ error: "invalid_seal_id" }, 400);
    if (!eventRe.test(String(event.eventId))) return json({ error: "invalid_event_id" }, 400);
    if (!allowed.has(String(event.eventType))) return json({ error: "invalid_event_type" }, 400);

    const actor = String(event.actorWallet).toLowerCase();
    if (!walletRe.test(actor)) return json({ error: "invalid_actor_wallet" }, 400);
    if (!hex64.test(String(event.eventDigest)) || !hex32.test(String(event.nonce))) return json({ error: "invalid_hash" }, 400);

    const reason = String(event.reason || "").trim();
    if (reason.length > MAX_REASON) return json({ error: "reason_too_long" }, 400);
    if (event.eventType !== "DOCUMENT_NOTE" && reason.length < 3) return json({ error: "reason_required" }, 400);

    const relatedSealId = String(event.relatedSealId || "").trim().toUpperCase();
    if (event.eventType === "DOCUMENT_SUPERSEDED") {
      if (!sealRe.test(relatedSealId)) return json({ error: "related_seal_required" }, 400);
      if (relatedSealId === event.sealId) return json({ error: "cannot_supersede_with_self" }, 400);
    } else if (relatedSealId) {
      return json({ error: "related_seal_only_for_supersede" }, 400);
    }

    const created = new Date(event.createdAt);
    if (Number.isNaN(created.getTime())) return json({ error: "invalid_created_at" }, 400);
    if (Math.abs(Date.now() - created.getTime()) > 10 * 60 * 1000) return json({ error: "stale_or_future_timestamp" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: seal, error: sealError } = await supabase
      .from("evo_seals")
      .select("seal_id,asset_type,issuer_wallet,status")
      .eq("seal_id", event.sealId)
      .eq("status", "ACTIVE")
      .single();

    if (sealError || !seal) return json({ error: "seal_not_found" }, 404);
    if (String(seal.asset_type || "").toLowerCase() !== "documento") return json({ error: "not_a_document_proof" }, 409);
    if (String(seal.issuer_wallet || "").toLowerCase() !== actor) return json({ error: "issuer_signature_required" }, 403);

    if (event.eventType === "DOCUMENT_SUPERSEDED") {
      const { data: replacement, error: replacementError } = await supabase
        .from("evo_seals")
        .select("seal_id,asset_type,issuer_wallet,status")
        .eq("seal_id", relatedSealId)
        .eq("status", "ACTIVE")
        .single();
      if (replacementError || !replacement) return json({ error: "replacement_not_found" }, 404);
      if (String(replacement.asset_type || "").toLowerCase() !== "documento") return json({ error: "replacement_not_document" }, 409);
      if (String(replacement.issuer_wallet || "").toLowerCase() !== actor) return json({ error: "replacement_issuer_mismatch" }, 409);
    }

    const { data: terminalEvents, error: terminalError } = await supabase
      .from("evo_document_events")
      .select("event_type,related_seal_id,registered_at")
      .eq("seal_id", event.sealId)
      .eq("status", "ACTIVE")
      .in("event_type", ["DOCUMENT_REVOKED", "DOCUMENT_SUPERSEDED"])
      .order("registered_at", { ascending: false })
      .limit(1);

    if (terminalError) return json({ error: "database_error" }, 500);
    if (terminalEvents?.length) return json({ error: "document_lifecycle_already_terminal", current: terminalEvents[0] }, 409);

    const expectedDigest = await sha256([
      event.sealId,
      event.eventType,
      actor,
      relatedSealId,
      reason,
      event.createdAt,
      event.nonce,
    ].join("|"));
    if (expectedDigest !== event.eventDigest) return json({ error: "event_digest_mismatch" }, 400);

    const expectedEventId = `EVD-${event.eventDigest.slice(0, 8).toUpperCase()}-${event.eventDigest.slice(8, 16).toUpperCase()}-${event.eventDigest.slice(16, 24).toUpperCase()}`;
    if (expectedEventId !== event.eventId) return json({ error: "event_id_mismatch" }, 400);

    const expectedMessage = `EVO DOCUMENT LIFECYCLE V1\nEvent ID: ${event.eventId}\nSeal ID: ${event.sealId}\nType: ${event.eventType}\nActor: ${actor}\nRelated seal: ${relatedSealId || "N/A"}\nDigest: ${event.eventDigest}\nCreated: ${event.createdAt}`;
    if (event.signatureMessage !== expectedMessage) return json({ error: "signature_message_mismatch" }, 400);

    const valid = await verifyMessage({
      address: actor as `0x${string}`,
      message: expectedMessage,
      signature: event.signature as `0x${string}`,
    });
    if (!valid) return json({ error: "invalid_signature" }, 401);

    const row = {
      event_id: event.eventId,
      seal_id: event.sealId,
      version: event.version,
      event_type: event.eventType,
      actor_wallet: actor,
      related_seal_id: relatedSealId,
      reason,
      event_digest: event.eventDigest,
      nonce: event.nonce,
      signature: event.signature,
      signature_message: event.signatureMessage,
      created_at: event.createdAt,
      status: "ACTIVE",
    };

    const { data, error } = await supabase
      .from("evo_document_events")
      .insert(row)
      .select("event_id,seal_id,event_type,related_seal_id,registered_at,status")
      .single();

    if (error) {
      if (error.code === "23505") return json({ error: "event_already_exists" }, 409);
      console.error(error);
      return json({ error: "database_error" }, 500);
    }

    return json({ ok: true, event: data }, 201);
  } catch (err) {
    console.error(err);
    return json({ error: "internal_error" }, 500);
  }
});
