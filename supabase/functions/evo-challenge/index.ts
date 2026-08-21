import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";

const ALLOWED_ORIGINS = new Set(["https://lionelricca.github.io"]);
const MAX_BODY_BYTES = 2048;
const sealRe = /^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const challengeRe = /^EVC-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const hex64 = /^[0-9a-f]{64}$/;

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (!origin || ALLOWED_ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    if (origin) headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return headers;
}
function json(req: Request, data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...cors(req), "Content-Type": "application/json" } }); }
function hex(bytes: Uint8Array) { return [...bytes].map(b => b.toString(16).padStart(2, "0")).join(""); }
async function sha256(text: string) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))); }
function randomHex(bytes = 32) { const b = new Uint8Array(bytes); crypto.getRandomValues(b); return hex(b); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && !ALLOWED_ORIGINS.has(origin) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return json(req, { error: "origin_not_allowed" }, 403);

  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json(req, { error: "payload_too_large" }, 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw || "{}"); } catch { return json(req, { error: "invalid_json" }, 400); }
    const action = String(body.action || "").toLowerCase();
    const payload = body.payload && typeof body.payload === "object" ? body.payload as Record<string, unknown> : {};
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    const audit = async (challengeId: string, sealId: string, attemptType: "ACCEPTED" | "REPLAY" | "MISMATCH" | "EXPIRED") => {
      const { error } = await db.from("evo_challenge_attempts").insert({ challenge_id: challengeId, seal_id: sealId, attempt_type: attemptType });
      if (error) console.error("challenge_audit_error", error.code);
    };

    if (action === "issue") {
      const sealId = String(payload.sealId || "").trim().toUpperCase();
      if (!sealRe.test(sealId)) return json(req, { error: "invalid_seal_id" }, 400);
      const { data: seal, error: sealError } = await db.from("evo_seals").select("seal_id,digest,status").eq("seal_id", sealId).eq("status", "ACTIVE").single();
      if (sealError || !seal) return json(req, { error: "seal_not_found" }, 404);

      const now = new Date();
      const { data: existing, error: existingError } = await db.from("evo_challenges").select("challenge_id,seal_id,mode,challenge_nonce,status,created_at,expires_at").eq("seal_id", sealId).eq("status", "PENDING").gt("expires_at", now.toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existingError) return json(req, { error: "database_error" }, 500);
      if (existing) return json(req, { ok: true, reused: true, challenge: existing, trustWeight: 0, assurance: "PUBLIC_SOFTWARE_FRESHNESS" });

      await db.from("evo_challenges").update({ status: "EXPIRED" }).eq("seal_id", sealId).eq("status", "PENDING").lt("expires_at", now.toISOString());
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await db.from("evo_challenges").select("challenge_id", { count: "exact", head: true }).eq("seal_id", sealId).gte("created_at", hourAgo);
      if (countError) return json(req, { error: "database_error" }, 500);
      if ((count || 0) >= 30) return json(req, { error: "challenge_rate_limited" }, 429);

      const nonce = randomHex(32);
      const createdAt = now.toISOString();
      const expiresAt = new Date(now.getTime() + 90_000).toISOString();
      const seed = await sha256(`${sealId}|${nonce}|${createdAt}|SOFTWARE_V0`);
      const challengeId = `EVC-${seed.slice(0, 8).toUpperCase()}-${seed.slice(8, 16).toUpperCase()}-${seed.slice(16, 24).toUpperCase()}`;
      const { error } = await db.from("evo_challenges").insert({ challenge_id: challengeId, seal_id: sealId, mode: "SOFTWARE_V0", challenge_nonce: nonce, status: "PENDING", created_at: createdAt, expires_at: expiresAt });
      if (error) return json(req, { error: "database_error" }, 500);
      return json(req, { ok: true, reused: false, challenge: { challengeId, sealId, mode: "SOFTWARE_V0", challengeNonce: nonce, createdAt, expiresAt }, trustWeight: 0, assurance: "PUBLIC_SOFTWARE_FRESHNESS", meaning: "Anti-replay freshness signal only. It does not prove possession, ownership or physical presence." }, 201);
    }

    if (action === "respond") {
      const challengeId = String(payload.challengeId || "").trim().toUpperCase();
      const responseHash = String(payload.responseHash || "").trim().toLowerCase();
      if (!challengeRe.test(challengeId)) return json(req, { error: "invalid_challenge_id" }, 400);
      if (!hex64.test(responseHash)) return json(req, { error: "invalid_response_hash" }, 400);
      const { data: c, error: cError } = await db.from("evo_challenges").select("challenge_id,seal_id,mode,challenge_nonce,status,expires_at,attempt_count").eq("challenge_id", challengeId).single();
      if (cError || !c) return json(req, { error: "challenge_not_found" }, 404);
      if (Number(c.attempt_count || 0) >= 10) return json(req, { error: "challenge_attempt_limit" }, 429);

      if (c.status !== "PENDING") {
        await Promise.all([audit(challengeId, c.seal_id, "REPLAY"), db.from("evo_challenges").update({ attempt_count: Number(c.attempt_count || 0) + 1 }).eq("challenge_id", challengeId)]);
        return json(req, { error: "challenge_already_consumed", status: c.status }, 409);
      }
      const now = new Date();
      if (new Date(c.expires_at).getTime() <= now.getTime()) {
        await Promise.all([audit(challengeId, c.seal_id, "EXPIRED"), db.from("evo_challenges").update({ status: "EXPIRED", attempt_count: Number(c.attempt_count || 0) + 1 }).eq("challenge_id", challengeId).eq("status", "PENDING")]);
        return json(req, { error: "challenge_expired" }, 410);
      }

      const { data: seal, error: sealError } = await db.from("evo_seals").select("digest,status").eq("seal_id", c.seal_id).eq("status", "ACTIVE").single();
      if (sealError || !seal) return json(req, { error: "seal_not_found" }, 404);
      const expected = await sha256(`${challengeId}|${c.seal_id}|${c.challenge_nonce}|${seal.digest}|SOFTWARE_V0`);
      if (expected !== responseHash) {
        await Promise.all([audit(challengeId, c.seal_id, "MISMATCH"), db.from("evo_challenges").update({ attempt_count: Number(c.attempt_count || 0) + 1 }).eq("challenge_id", challengeId).eq("status", "PENDING")]);
        return json(req, { error: "challenge_response_mismatch" }, 401);
      }

      const completedAt = now.toISOString();
      const { data: updated, error: updateError } = await db.from("evo_challenges").update({ status: "CONSUMED", response_hash: responseHash, completed_at: completedAt, attempt_count: Number(c.attempt_count || 0) + 1 }).eq("challenge_id", challengeId).eq("status", "PENDING").gt("expires_at", completedAt).select("challenge_id,seal_id,mode,status,created_at,expires_at,completed_at,attempt_count").maybeSingle();
      if (updateError) return json(req, { error: "database_error" }, 500);
      if (!updated) { await audit(challengeId, c.seal_id, "REPLAY"); return json(req, { error: "challenge_already_consumed" }, 409); }
      await audit(challengeId, c.seal_id, "ACCEPTED");
      return json(req, { ok: true, proof: { ...updated, antiReplay: true, physicalPresence: false, ownershipProof: false, trustWeight: 0, assurance: "PUBLIC_SOFTWARE_FRESHNESS", meaning: "Fresh public software response accepted once; this does not prove possession or physical presence." } });
    }

    return json(req, { error: "invalid_action" }, 400);
  } catch {
    return json(req, { error: "internal_error" }, 500);
  }
});
