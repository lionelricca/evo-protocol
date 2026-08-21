import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";

const ALLOWED_ORIGINS = new Set([
  "https://lionelricca.github.io",
]);
const MAX_BODY_BYTES = 2048;
const sealRe = /^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const nonceRe = /^[0-9a-f]{32}$/;
const sources = new Set(["PUBLIC_LINK", "MANUAL_VERIFY", "QR"]);
const ZERO = "0".repeat(64);

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
    headers["Vary"] = "Origin";
  }
  return headers;
}
function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}
async function sha256(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && !ALLOWED_ORIGINS.has(origin) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return json(req, { error: "origin_not_allowed" }, 403);
  }

  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json(req, { error: "payload_too_large" }, 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw || "{}"); } catch { return json(req, { error: "invalid_json" }, 400); }

    const sealId = String(body.sealId || "").trim().toUpperCase();
    const source = String(body.source || "PUBLIC_LINK").trim().toUpperCase();
    const nonce = String(body.nonce || "").trim().toLowerCase();
    if (!sealRe.test(sealId)) return json(req, { error: "invalid_seal_id" }, 400);
    if (!sources.has(source)) return json(req, { error: "invalid_source" }, 400);
    if (!nonceRe.test(nonce)) return json(req, { error: "invalid_nonce" }, 400);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: seal, error: sealError } = await db.from("evo_seals").select("seal_id,status").eq("seal_id", sealId).eq("status", "ACTIVE").single();
    if (sealError || !seal) return json(req, { error: "seal_not_found" }, 404);

    const nowIso = new Date().toISOString();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ count: hourCount, error: hourError }, { count: dayCount, error: dayError }] = await Promise.all([
      db.from("evo_pulses").select("pulse_id", { count: "exact", head: true }).eq("seal_id", sealId).eq("status", "ACTIVE").gte("observed_at", hourAgo),
      db.from("evo_pulses").select("pulse_id", { count: "exact", head: true }).eq("seal_id", sealId).eq("status", "ACTIVE").gte("observed_at", dayAgo).lte("observed_at", nowIso),
    ]);
    if (hourError || dayError) return json(req, { error: "database_error" }, 500);
    if ((hourCount || 0) >= 60) return json(req, { ok: true, throttled: true, rateLimit: "hourly", trustWeight: 0 });
    if ((dayCount || 0) >= 300) return json(req, { ok: true, throttled: true, rateLimit: "daily", trustWeight: 0 });

    for (let attempt = 0; attempt < 2; attempt++) {
      const { data: last, error: lastError } = await db.from("evo_pulses").select("pulse_id,pulse_hash,observed_at,observed_ms,source").eq("seal_id", sealId).eq("status", "ACTIVE").order("observed_ms", { ascending: false }).limit(1);
      if (lastError) return json(req, { error: "database_error" }, 500);
      const latest = last?.[0] || null;
      const observedMs = Date.now();
      if (latest && observedMs - Number(latest.observed_ms) < 30_000) {
        return json(req, { ok: true, throttled: true, pulse: latest, trustWeight: 0, assurance: "PUBLIC_OBSERVATION" });
      }
      const observedAt = new Date(observedMs).toISOString();
      const prev = String(latest?.pulse_hash || ZERO);
      const pulseHash = await sha256([sealId, prev, String(observedMs), nonce, source].join("|"));
      const pulseId = `PUL-${pulseHash.slice(0, 8).toUpperCase()}-${pulseHash.slice(8, 16).toUpperCase()}-${pulseHash.slice(16, 24).toUpperCase()}`;
      const { data, error } = await db.from("evo_pulses").insert({ pulse_id: pulseId, seal_id: sealId, source, client_nonce: nonce, prev_pulse_hash: prev, pulse_hash: pulseHash, observed_at: observedAt, observed_ms: observedMs, status: "ACTIVE" }).select("pulse_id,seal_id,source,prev_pulse_hash,pulse_hash,observed_at,observed_ms,status").single();
      if (!error) return json(req, { ok: true, throttled: false, pulse: data, trustWeight: 0, assurance: "PUBLIC_OBSERVATION", meaning: "Public activity signal only. It does not increase issuer, ownership, origin or physical-presence assurance." }, 201);
      if (error.code !== "23505") return json(req, { error: "database_error" }, 500);
    }
    return json(req, { error: "pulse_chain_conflict_retry" }, 409);
  } catch {
    return json(req, { error: "internal_error" }, 500);
  }
});
