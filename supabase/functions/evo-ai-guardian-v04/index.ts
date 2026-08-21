import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";

const ALLOWED_ORIGINS = new Set(["https://lionelricca.github.io"]);
const MAX_BODY_BYTES = 1024;
const sealRe = /^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;

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
function canonicalJson(value: Record<string, unknown>) { const out: Record<string, unknown> = {}; for (const k of Object.keys(value).sort()) out[k] = value[k]; return JSON.stringify(out); }
function maxIso(values: (string | null | undefined)[]) { const valid = values.filter(Boolean).map(String).filter(v => !Number.isNaN(Date.parse(v))); if (!valid.length) return new Date(0).toISOString(); return new Date(Math.max(...valid.map(v => Date.parse(v)))).toISOString(); }

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
    const sealId = String(body.sealId || "").trim().toUpperCase();
    if (!sealRe.test(sealId)) return json(req, { error: "invalid_seal_id" }, 400);

    const baseUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/evo-ai-guardian`;
    const baseResponse = await fetch(baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sealId }) });
    const base = await baseResponse.json();
    if (!baseResponse.ok) return json(req, base, baseResponse.status);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: seal, error: sealError } = await db.from("evo_seals").select("issuer_wallet,issuer_label,digest,status,registered_at").eq("seal_id", sealId).single();
    if (sealError || !seal) return json(req, { error: "seal_not_found" }, 404);
    const issuerWallet = String(seal.issuer_wallet || "").toLowerCase();

    const [profileResult, latestEventResult, latestTransferResult, latestPulseResult, latestChallengeResult, serviceResult] = await Promise.all([
      db.from("evo_issuer_profiles").select("issuer_wallet,display_name,slug,website,status,created_at,updated_at,verified_at").eq("issuer_wallet", issuerWallet).maybeSingle(),
      db.from("evo_passport_events").select("event_digest,event_type,new_owner_wallet,registered_at,status").eq("seal_id", sealId).eq("status", "ACTIVE").order("registered_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("evo_passport_events").select("new_owner_wallet,registered_at").eq("seal_id", sealId).eq("event_type", "TRANSFERRED").eq("status", "ACTIVE").order("registered_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("evo_pulses").select("pulse_hash,observed_at,status").eq("seal_id", sealId).eq("status", "ACTIVE").order("observed_ms", { ascending: false }).limit(1).maybeSingle(),
      db.from("evo_challenges").select("challenge_id,status,created_at,expires_at,completed_at").eq("seal_id", sealId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("evo_service_proofs").select("proof_id,evidence_level,registered_at,status").eq("seal_id", sealId).eq("status", "ACTIVE").order("registered_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    for (const r of [profileResult, latestEventResult, latestTransferResult, latestPulseResult, latestChallengeResult, serviceResult]) if (r.error) return json(req, { error: "database_error" }, 500);

    const profile = profileResult.data;
    const latestEvent = latestEventResult.data;
    const latestTransfer = latestTransferResult.data;
    const latestPulse = latestPulseResult.data;
    const latestChallenge = latestChallengeResult.data;
    const latestService = serviceResult.data;

    let risk = Number(base.riskScore || 0);
    let confidence = Number(base.evidenceConfidence || 0);
    const signals = Array.isArray(base.signals) ? [...base.signals] : [];
    let issuerTrust = "SELF_DECLARED";
    let issuerDisplay = String(seal.issuer_label || issuerWallet);

    if (!profile) {
      signals.push({ code: "ISSUER_SELF_DECLARED", severity: "INFO", title: "Emisor auto-declarado", detail: "El nombre mostrado no demuestra identidad legal u organizacional.", points: 0 });
    } else {
      issuerTrust = String(profile.status || "WALLET_PROVEN");
      issuerDisplay = String(profile.display_name || issuerDisplay);
      if (issuerTrust === "WALLET_PROVEN") {
        signals.push({ code: "ISSUER_WALLET_PROVEN", severity: "INFO", title: "Control de wallet probado", detail: "Prueba control criptográfico de la wallet, no representación legal de una organización.", points: 0 });
        confidence += 3;
      } else if (issuerTrust === "DOMAIN_VERIFIED") {
        signals.push({ code: "ISSUER_DOMAIN_VERIFIED", severity: "INFO", title: "Dominio verificado", detail: "El emisor demostró control del dominio asociado.", points: 0 });
        confidence += 6;
      } else if (issuerTrust === "ORGANIZATION_VERIFIED") {
        signals.push({ code: "ISSUER_ORGANIZATION_VERIFIED", severity: "INFO", title: "Organización verificada", detail: "EVO tiene una verificación organizacional activa para esta wallet.", points: 0 });
        confidence += 10;
      } else if (issuerTrust === "SUSPENDED") {
        signals.push({ code: "ISSUER_SUSPENDED", severity: "HIGH", title: "Emisor suspendido", detail: "El perfil asociado está suspendido.", points: 40 });
        risk += 40;
      }
    }

    // Public Pulse and SOFTWARE_V0 Challenge are deliberately zero-weight.
    // They can show activity/freshness, but any visitor can trigger them.
    if (latestPulse) signals.push({ code: "PUBLIC_PULSE_PRESENT", severity: "INFO", title: "Actividad pública registrada", detail: "Pulse es telemetría pública y no aumenta el nivel de confianza.", points: 0 });
    if (latestChallenge?.status === "CONSUMED") signals.push({ code: "PUBLIC_SOFTWARE_CHALLENGE", severity: "INFO", title: "Challenge de software completado", detail: "Demuestra frescura anti-replay del software, no posesión ni presencia física; peso de confianza 0.", points: 0 });

    const signedLifecycle = Boolean(latestEvent);
    const providerCountersigned = String(latestService?.evidence_level || "") === "PROVIDER_COUNTERSIGNED";
    if (signedLifecycle) confidence += 3;
    if (providerCountersigned) confidence += 8;

    risk = Math.max(0, Math.min(100, risk));
    confidence = Math.max(0, Math.min(95, confidence));
    const riskLevel = risk >= 50 ? "HIGH" : risk >= 20 ? "MEDIUM" : "LOW";
    const verdict = riskLevel === "LOW" ? "NO MATERIAL ANOMALIES DETECTED" : riskLevel === "MEDIUM" ? "REVIEW RECOMMENDED" : "HIGH RISK — MANUAL REVIEW REQUIRED";

    let challengeState = "NONE";
    if (latestChallenge) {
      const status = String(latestChallenge.status || "").toUpperCase();
      if (status === "CONSUMED") challengeState = "PUBLIC_FRESHNESS_ACCEPTED";
      else if (status === "EXPIRED") challengeState = "EXPIRED";
      else if (status === "PENDING" && Date.parse(String(latestChallenge.expires_at || "")) <= Date.now()) challengeState = "EXPIRED";
      else if (status === "PENDING") challengeState = "PENDING";
    }

    const currentOwner = String(latestTransfer?.new_owner_wallet || issuerWallet || "NONE").toLowerCase();
    const passportHead = String(latestEvent?.event_digest || "NONE");
    const pulseHead = String(latestPulse?.pulse_hash || "NONE");
    const physicalProofState = "NONE";
    const updatedAt = maxIso([seal.registered_at, profile?.updated_at, profile?.verified_at, latestEvent?.registered_at, latestTransfer?.registered_at, latestPulse?.observed_at, latestChallenge?.completed_at, latestChallenge?.created_at, latestService?.registered_at]);

    const realityState = { version: "EVO-REALITY-STATE-V0", sealId, issuerTrust, currentOwner: currentOwner || "NONE", passportHead, pulseHead, challengeState, physicalProofState, riskState: riskLevel, previousRealityRoot: "GENESIS", updatedAt };
    const realityRoot = await sha256(canonicalJson(realityState));

    const strongerIssuer = ["DOMAIN_VERIFIED", "ORGANIZATION_VERIFIED"].includes(issuerTrust);
    const trustedIssuer = ["WALLET_PROVEN", "DOMAIN_VERIFIED", "ORGANIZATION_VERIFIED"].includes(issuerTrust);
    let realityLevel = 1;
    let realityLabel = "SIGNED IDENTITY";
    if (issuerTrust === "SUSPENDED") {
      realityLevel = 1;
    } else if (physicalProofState === "NFC_VERIFIED") {
      realityLevel = 4;
      realityLabel = "PHYSICAL CRYPTO PROOF";
    } else if (strongerIssuer && (signedLifecycle || providerCountersigned)) {
      realityLevel = 3;
      realityLabel = "TRUSTED DIGITAL IDENTITY";
    } else if (signedLifecycle || providerCountersigned) {
      realityLevel = 2;
      realityLabel = "SIGNED CONTINUITY";
    }

    const limitations = Array.isArray(base.limitations) ? [...base.limitations] : [];
    limitations.push("PUBLIC Pulse y SOFTWARE_V0 Challenge tienen peso de confianza 0 porque cualquier visitante puede activarlos.");
    limitations.push("Los niveles 2+ requieren evidencia firmada o contrafirmada; actividad pública por sí sola no eleva Reality Level.");
    limitations.push("Reality Root V0 todavía no está encadenado ni anclado externamente.");

    return json(req, {
      ...base,
      engine: "EVO AI Guardian V0.6 SECURITY-HARDENED",
      mode: "EXPLAINABLE_RISK_ENGINE + ZERO_TRUST_PUBLIC_SIGNALS + SIGNED_EVIDENCE_LEVELS",
      verdict, riskScore: risk, riskLevel, evidenceConfidence: confidence, signals, limitations,
      stats: { ...(base.stats || {}), issuerTrust, signedLifecycle, providerCountersigned, publicPulseTrustWeight: 0, publicChallengeTrustWeight: 0, realityLevel, realityRoot },
      issuer: { wallet: issuerWallet, displayName: issuerDisplay, trust: issuerTrust, profile: profile || null },
      reality: { version: "EVO-REALITY-STATE-V0", level: realityLevel, label: realityLabel, root: realityRoot, chainState: "UNANCHORED_V0", trustedIssuer, state: realityState },
      analyzedAt: new Date().toISOString(),
    });
  } catch {
    return json(req, { error: "internal_error" }, 500);
  }
});
