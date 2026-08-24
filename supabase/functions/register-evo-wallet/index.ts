import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { rejectUntrustedBrowserOrigin, restrictedPreflight, withRestrictedCors } from "../_shared/evo-cors.ts";

const walletRe = /^0x[0-9a-fA-F]{40}$/;
const chainRe = /^0x[0-9a-fA-F]+$/;
const MAX_BODY_BYTES = 2048;

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

async function issuerIdFor(wallet: string) {
  const bytes = new TextEncoder().encode(`EVO-ISSUER-V1|${wallet}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `EVO-I-${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}`;
}

const publicColumns = "issuer_wallet,issuer_id,first_chain_id,last_chain_id,status,created_at,updated_at,proven_at";

async function handle(req: Request) {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const declaredLength = Number(req.headers.get("content-length") || "0");
    if (declaredLength > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);

    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);

    let body: Record<string, unknown>;
    try { body = JSON.parse(raw || "{}"); }
    catch { return json({ error: "invalid_json" }, 400); }

    const action = String(body?.action || "register").toLowerCase();
    const issuerWallet = String(body?.issuerWallet || "").toLowerCase();
    if (!walletRe.test(issuerWallet)) return json({ error: "invalid_wallet" }, 400);

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: existing, error: readError } = await db
      .from("evo_wallet_accounts")
      .select(publicColumns)
      .eq("issuer_wallet", issuerWallet)
      .maybeSingle();

    if (readError) {
      console.error("wallet_read_failed", readError.code);
      return json({ error: "database_error" }, 500);
    }

    if (action === "lookup") return json({ ok: true, account: existing || null, persisted: Boolean(existing) }, 200);
    if (action !== "register") return json({ error: "invalid_action" }, 400);

    const chainId = String(body?.chainId || "").toLowerCase();
    if (!chainRe.test(chainId)) return json({ error: "invalid_chain_id" }, 400);

    if (existing) {
      return json({
        ok: true,
        created: false,
        persisted: true,
        account: existing,
      }, 200);
    }

    const account = {
      issuer_wallet: issuerWallet,
      issuer_id: await issuerIdFor(issuerWallet),
      first_chain_id: chainId,
      last_chain_id: chainId,
      status: "CONNECTED",
      created_at: null,
      updated_at: null,
      proven_at: null,
    };

    return json({
      ok: true,
      created: false,
      persisted: false,
      registrationMode: "EPHEMERAL_UNTIL_SIGNED",
      account,
    }, 200);
  } catch (err) {
    console.error("wallet_registration_internal_error", err instanceof Error ? err.name : "unknown");
    return json({ error: "internal_error" }, 500);
  }
}

Deno.serve(async (req: Request) => {
  const preflight = restrictedPreflight(req);
  if (preflight) return preflight;
  const denied = rejectUntrustedBrowserOrigin(req);
  if (denied) return denied;
  return withRestrictedCors(req, await handle(req));
});
