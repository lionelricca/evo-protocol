import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const hex64 = /^[0-9a-f]{64}$/;
const hex32 = /^[0-9a-f]{32}$/;
const walletRe = /^0x[0-9a-fA-F]{40}$/;
const MAX_BODY_BYTES = 32768;
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
function stableObject(obj: Record<string, unknown>) {
  return Object.keys(obj).sort().reduce((acc, key) => {
    const v = obj[key];
    acc[key] = typeof v === "string" ? v.trim() : v;
    return acc;
  }, {} as Record<string, unknown>);
}
async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function issuerIdFor(wallet: string) {
  const h = (await sha256(`EVO-ISSUER-V1|${wallet}`)).toUpperCase();
  return `EVO-I-${h.slice(0,8)}-${h.slice(8,16)}-${h.slice(16,24)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const declaredLength = Number(req.headers.get("content-length") || "0");
    if (declaredLength > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);

    let body: Record<string, unknown>;
    try { body = JSON.parse(rawBody || "{}"); }
    catch { return json({ error: "invalid_json" }, 400); }

    const seal = (body as { seal?: Record<string, unknown> })?.seal;
    if (!seal || typeof seal !== "object") return json({ error: "invalid_payload" }, 400);

    const required = ["sealId","version","assetType","title","issuerWallet","metadataHash","digest","nonce","signature","signatureMessage","createdAt"];
    for (const k of required) if (!seal[k]) return json({ error: `missing_${k}` }, 400);
    if (seal.version !== "EVO-SEAL-V1") return json({ error: "invalid_version" }, 400);
    if (!walletRe.test(String(seal.issuerWallet))) return json({ error: "invalid_wallet" }, 400);
    if (!hex64.test(String(seal.metadataHash)) || !hex64.test(String(seal.digest))) return json({ error: "invalid_hash" }, 400);
    if (seal.assetHash && !hex64.test(String(seal.assetHash))) return json({ error: "invalid_asset_hash" }, 400);
    if (!hex32.test(String(seal.nonce))) return json({ error: "invalid_nonce" }, 400);
    if (typeof seal.title !== "string" || seal.title.length > 160) return json({ error: "invalid_title" }, 400);
    if (typeof seal.description === "string" && seal.description.length > 2000) return json({ error: "description_too_long" }, 400);
    if (String(seal.assetType || "").length > 80) return json({ error: "asset_type_too_long" }, 400);
    if (String(seal.issuerLabel || "").length > 160) return json({ error: "issuer_label_too_long" }, 400);
    if (String(seal.serial || "").length > 160) return json({ error: "serial_too_long" }, 400);
    if (String(seal.fileName || "").length > 255) return json({ error: "file_name_too_long" }, 400);
    if (String(seal.fileType || "").length > 160) return json({ error: "file_type_too_long" }, 400);

    const normalizedFileSize = Number(seal.fileSize || 0);
    if (!Number.isSafeInteger(normalizedFileSize) || normalizedFileSize < 0) return json({ error: "invalid_file_size" }, 400);
    const created = new Date(String(seal.createdAt));
    if (Number.isNaN(created.getTime())) return json({ error: "invalid_created_at" }, 400);
    if (Math.abs(Date.now() - created.getTime()) > 10 * 60 * 1000) return json({ error: "stale_or_future_timestamp" }, 400);

    let assetDetails: Record<string, unknown> | null = null;
    if (seal.assetDetails !== undefined) {
      if (!seal.assetDetails || typeof seal.assetDetails !== "object" || Array.isArray(seal.assetDetails)) return json({ error: "invalid_asset_details" }, 400);
      const details = seal.assetDetails as Record<string, unknown>;
      const manufacturer = String(details.manufacturer || "").trim();
      const model = String(details.model || "").trim();
      const manufactureYear = String(details.manufactureYear || "").trim();
      const publicLocation = String(details.publicLocation || "").trim();
      const serviceIntervalHours = Number(details.serviceIntervalHours || 0);
      if (manufacturer.length > 160 || model.length > 160 || publicLocation.length > 160) return json({ error: "asset_detail_too_long" }, 400);
      if (manufactureYear && !/^(?:19|20|21)\d{2}$/.test(manufactureYear)) return json({ error: "invalid_manufacture_year" }, 400);
      if (!Number.isInteger(serviceIntervalHours) || serviceIntervalHours < 0 || serviceIntervalHours > 100000) return json({ error: "invalid_service_interval" }, 400);
      assetDetails = { manufacturer, model, manufactureYear, publicLocation, serviceIntervalHours };
    }

    const issuerWallet = String(seal.issuerWallet).toLowerCase();
    const metadata: Record<string, unknown> = {
      assetType: String(seal.assetType || ""),
      title: String(seal.title || ""),
      issuerLabel: String(seal.issuerLabel || ""),
      serial: String(seal.serial || ""),
      description: String(seal.description || ""),
      fileName: String(seal.fileName || ""),
      fileSize: normalizedFileSize,
      fileType: String(seal.fileType || ""),
      assetHash: String(seal.assetHash || ""),
      issuerWallet,
      createdAt: String(seal.createdAt),
      nonce: String(seal.nonce),
    };
    if (assetDetails) metadata.assetDetails = assetDetails;

    const expectedMetadataHash = await sha256(JSON.stringify(stableObject(metadata)));
    if (expectedMetadataHash !== seal.metadataHash) return json({ error: "metadata_hash_mismatch" }, 400);
    const expectedDigest = await sha256(`${seal.assetHash || seal.metadataHash}|${seal.metadataHash}|${seal.createdAt}|${seal.nonce}|${issuerWallet}`);
    if (expectedDigest !== seal.digest) return json({ error: "digest_mismatch" }, 400);
    const expectedSealId = `EVO-${String(seal.digest).slice(0,8).toUpperCase()}-${String(seal.digest).slice(8,16).toUpperCase()}-${String(seal.digest).slice(16,24).toUpperCase()}`;
    if (expectedSealId !== seal.sealId) return json({ error: "seal_id_mismatch" }, 400);

    const expectedMessage = `EVO SEAL V1\nSeal ID: ${seal.sealId}\nDigest: ${seal.digest}\nIssuer: ${issuerWallet}\nCreated: ${seal.createdAt}`;
    if (seal.signatureMessage !== expectedMessage) return json({ error: "signature_message_mismatch" }, 400);
    const valid = await verifyMessage({
      address: String(seal.issuerWallet) as `0x${string}`,
      message: expectedMessage,
      signature: String(seal.signature) as `0x${string}`,
    });
    if (!valid) return json({ error: "invalid_signature" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const now = new Date().toISOString();
    const { data: walletAccount, error: walletReadError } = await supabase.from("evo_wallet_accounts")
      .select("issuer_wallet,issuer_id,first_chain_id,last_chain_id,status,created_at,proven_at")
      .eq("issuer_wallet", issuerWallet).maybeSingle();
    if (walletReadError) { console.error(walletReadError); return json({ error: "wallet_account_error" }, 500); }
    if (walletAccount?.status === "SUSPENDED") return json({ error: "issuer_suspended" }, 403);

    const issuerId = walletAccount?.issuer_id || await issuerIdFor(issuerWallet);
    const walletRow = {
      issuer_wallet: issuerWallet,
      issuer_id: issuerId,
      first_chain_id: walletAccount?.first_chain_id || null,
      last_chain_id: walletAccount?.last_chain_id || null,
      status: "WALLET_PROVEN",
      created_at: walletAccount?.created_at || now,
      updated_at: now,
      proven_at: walletAccount?.proven_at || now,
    };
    const { error: walletUpsertError } = await supabase.from("evo_wallet_accounts").upsert(walletRow, { onConflict: "issuer_wallet" });
    if (walletUpsertError) { console.error(walletUpsertError); return json({ error: "wallet_account_error" }, 500); }

    // Friendly preflight duplicate check. The atomic RPC repeats this inside its transaction,
    // so a concurrent request cannot bypass the business rule. An exact same-Seal retry is
    // allowed through so the RPC can return its original idempotent result without recharging.
    if (metadata.assetHash && metadata.serial) {
      const { data: dup, error: dupError } = await supabase.from("evo_seals")
        .select("seal_id,registered_at,status")
        .eq("issuer_wallet", issuerWallet)
        .eq("asset_hash", metadata.assetHash)
        .eq("serial", metadata.serial)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();
      if (dupError) { console.error(dupError); return json({ error: "database_error" }, 500); }
      if (dup && String(dup.seal_id).toUpperCase() !== String(seal.sealId).toUpperCase()) {
        return json({ error: "duplicate_asset_serial", existingSealId: dup.seal_id, meaning: "An active EVO Seal already exists for this issuer with the same asset hash and serial/reference." }, 409);
      }
    }

    const row = {
      seal_id: seal.sealId,
      version: seal.version,
      asset_type: metadata.assetType,
      title: metadata.title,
      issuer_wallet: issuerWallet,
      issuer_label: metadata.issuerLabel,
      serial: metadata.serial,
      description: metadata.description,
      file_name: metadata.fileName,
      file_size: metadata.fileSize,
      file_type: metadata.fileType,
      asset_hash: metadata.assetHash,
      metadata_hash: seal.metadataHash,
      digest: seal.digest,
      nonce: seal.nonce,
      signature: seal.signature,
      signature_message: seal.signatureMessage,
      created_at: seal.createdAt,
      status: "ACTIVE",
      metadata,
    };

    // Critical economic invariant: credit consumption and Seal insertion happen inside
    // one SECURITY DEFINER database transaction. Any failure rolls both back.
    const { data: registration, error: registrationError } = await supabase
      .rpc("evo_register_seal_with_credit", { p_row: row })
      .single();

    if (registrationError) {
      const message = String(registrationError.message || "");
      if (message.includes("insufficient_passport_credits")) {
        return json({
          error: "passport_credit_required",
          meaning: "Tu pasaporte de demostración ya fue utilizado. Comprá un crédito para crear otro EVO Passport.",
        }, 402);
      }
      if (message.includes("duplicate_asset_serial")) return json({ error: "duplicate_asset_serial" }, 409);
      if (message.includes("seal_id_conflict")) return json({ error: "seal_id_conflict" }, 409);
      if (message.includes("seal_credit_state_missing")) return json({ error: "seal_credit_state_missing" }, 409);
      if (message.includes("seal_already_exists") || String(registrationError.code || "") === "23505") return json({ error: "seal_already_exists" }, 409);
      console.error(registrationError);
      return json({ error: "atomic_registration_error" }, 500);
    }

    return json({
      ok: true,
      seal: {
        seal_id: registration.seal_id,
        registered_at: registration.registered_at,
        status: registration.status,
      },
      issuer: { issuerId, status: "WALLET_PROVEN" },
      entitlement: {
        source: registration.credit_source,
        remainingCredits: registration.remaining_credits,
      },
      atomic: true,
    }, 201);
  } catch (err) {
    console.error(err instanceof Error ? err.name : "unknown");
    return json({ error: "internal_error" }, 500);
  }
});
