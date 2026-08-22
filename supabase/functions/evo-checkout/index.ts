import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";
import { canonicalAllowedBrowserOrigin, rejectUntrustedBrowserOrigin, restrictedPreflight, withRestrictedCors } from "../_shared/evo-cors.ts";

const CHAINS = {
  "1": { name: "Ethereum", usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", confirmations: 12n, rpc: ["https://eth.drpc.org", "https://ethereum-rpc.publicnode.com"] },
  "10": { name: "Optimism", usdc: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", confirmations: 64n, rpc: ["https://optimism.drpc.org", "https://optimism-rpc.publicnode.com"] },
  "137": { name: "Polygon", usdc: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", confirmations: 64n, rpc: ["https://polygon.drpc.org", "https://polygon.publicnode.com"] },
  "8453": { name: "Base", usdc: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", confirmations: 64n, rpc: ["https://base.drpc.org", "https://mainnet.base.org"] },
  "42161": { name: "Arbitrum", usdc: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", confirmations: 64n, rpc: ["https://arbitrum-one.public.blastapi.io", "https://arbitrum.api.onfinality.io/public", "https://arb1.arbitrum.io/rpc", "https://arbitrum.drpc.org"] },
  "43114": { name: "Avalanche", usdc: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e", confirmations: 12n, rpc: ["https://api.avax.network/ext/bc/C/rpc", "https://avalanche-c-chain-rpc.publicnode.com"] },
};
const MERCHANT = "0xdc6740245e026a19ea9ee2b62968ea8aeffeab16";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const PLANS = {
  INDIVIDUAL: { amount: 9900000n, credits: 1 },
  PACK_10: { amount: 49000000n, credits: 10 },
};
const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;
const TX_RE = /^0x[0-9a-fA-F]{64}$/;
const NONCE_RE = /^[0-9a-f]{32}$/;
const MAX_BODY_BYTES = 4096;
const BALANCE_SIGNATURE_MAX_AGE_MS = 2 * 60 * 1000;
const BALANCE_SIGNATURE_FUTURE_SKEW_MS = 60 * 1000;
function json(data: unknown, status = 200, extraHeaders: Record<string,string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders } });
}
function normalize(value: unknown) { return String(value || "").toLowerCase(); }
function topicAddress(address: string) { return "0x" + "0".repeat(24) + address.slice(2).toLowerCase(); }
function parseHex(value: unknown) {
  const text = String(value || "");
  if (!/^0x[0-9a-fA-F]+$/.test(text)) throw new Error("invalid_rpc_hex");
  return BigInt(text);
}
function canonicalBrowserOrigin(value: unknown) {
  return canonicalAllowedBrowserOrigin(value);
}
function balanceMessage(wallet: string, origin: string, nonce: string, signedAt: string) {
  return `EVO CHECKOUT BALANCE V1\nWallet: ${wallet}\nOrigin: ${origin}\nNonce: ${nonce}\nSigned: ${signedAt}`;
}
async function rpc(endpoint: string, method: string, params: unknown[]) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: controller.signal });
    if (!response.ok) throw new Error("rpc_http_" + response.status);
    const body = await response.json();
    if (body.error) throw new Error("rpc_error");
    return body.result;
  } finally { clearTimeout(timer); }
}
async function readChain(endpoint: string, chainId: bigint, txHash: string) {
  const rpcChainId = await rpc(endpoint, "eth_chainId", []);
  if (parseHex(rpcChainId) !== chainId) throw new Error("wrong_rpc_chain");
  const receipt = await rpc(endpoint, "eth_getTransactionReceipt", [txHash]);
  const tx = await rpc(endpoint, "eth_getTransactionByHash", [txHash]);
  if (!receipt || !tx) return { pending: true };
  const head = await rpc(endpoint, "eth_blockNumber", []);
  const block = await rpc(endpoint, "eth_getBlockByNumber", [receipt.blockNumber, false]);
  if (!block) return { pending: true };
  return { pending: false, receipt, tx, head, block };
}
function verifyTransfer(view: any, chain: any, txHash: string, payer: string, amount: bigint) {
  const receipt = view.receipt;
  const tx = view.tx;
  if (normalize(receipt.transactionHash) !== txHash || normalize(tx.hash) !== txHash) throw new Error("transaction_hash_mismatch");
  if (normalize(receipt.status) !== "0x1") throw new Error("transaction_failed");
  if (normalize(tx.from) !== payer) throw new Error("payer_mismatch");
  if (normalize(receipt.blockHash) !== normalize(view.block.hash)) throw new Error("block_hash_mismatch");
  const toTopic = topicAddress(MERCHANT);
  const match = (receipt.logs || []).some((log: any) => {
    const topics = log.topics || [];
    if (normalize(log.address) !== chain.usdc) return false;
    if (normalize(topics[0]) !== TRANSFER_TOPIC) return false;
    if (normalize(topics[2]) !== toTopic) return false;
    try { return parseHex(log.data) === amount; } catch { return false; }
  });
  if (!match) throw new Error("verified_transfer_not_found");
  const blockNumber = parseHex(receipt.blockNumber);
  const confirmations = parseHex(view.head) - blockNumber + 1n;
  if (confirmations < 0n) throw new Error("invalid_block_height");
  return { blockNumber, blockHash: normalize(receipt.blockHash), confirmations, confirmedAt: new Date(Number(parseHex(view.block.timestamp)) * 1000).toISOString() };
}
async function readEntitlement(supabase: any, wallet: string) {
  const { data: entitlement, error } = await supabase.rpc("evo_get_passport_entitlement", { p_wallet: wallet }).single();
  if (error) throw new Error("entitlement_lookup_failed");
  const purchasedCredits = Number(entitlement?.purchased_credits || 0);
  const consumedCredits = Number(entitlement?.consumed_credits || 0);
  return { demoAvailable: Boolean(entitlement?.demo_available), purchasedCredits, consumedCredits, remainingCredits: Math.max(purchasedCredits - consumedCredits, 0) };
}

async function handle(req: Request) {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const declaredLength = Number(req.headers.get("content-length") || 0);
    if (declaredLength > MAX_BODY_BYTES) return json({ error: "request_too_large" }, 413);
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "request_too_large" }, 413);
    let body: Record<string,unknown>;
    try { body = JSON.parse(raw || "{}"); } catch { return json({ error: "invalid_json" }, 400); }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    if (body.action === "status") {
      const wallet = normalize(body.wallet);
      if (!WALLET_RE.test(wallet)) return json({ error: "invalid_wallet" }, 400);
      try {
        const entitlement = await readEntitlement(supabase, wallet);
        const paidCapability = entitlement.remainingCredits > 0;
        return json({
          ok: true,
          wallet,
          demoAvailable: entitlement.demoAvailable,
          canCreate: entitlement.demoAvailable || paidCapability,
          balanceRedacted: true,
          privacy: "PUBLIC_SUMMARY",
          exactBalanceRequiresWalletSignature: true,
        });
      } catch (error) {
        console.error(error instanceof Error ? error.message : "entitlement_lookup_failed");
        return json({ error: "entitlement_lookup_failed" }, 500);
      }
    }

    if (body.action === "balance") {
      const wallet = normalize(body.wallet);
      const nonce = normalize(body.nonce);
      const signedAt = String(body.signedAt || "");
      const signature = String(body.signature || "");
      const signatureMessage = String(body.signatureMessage || "");
      if (!WALLET_RE.test(wallet)) return json({ error: "invalid_wallet" }, 400);
      if (!NONCE_RE.test(nonce)) return json({ error: "invalid_nonce" }, 400);
      if (signature.length < 1 || signature.length > 512 || signatureMessage.length < 1 || signatureMessage.length > 2048) return json({ error: "invalid_signature_evidence" }, 400);
      let origin: string;
      try { origin = canonicalBrowserOrigin(body.origin); } catch { return json({ error: "invalid_origin" }, 400); }
      const requestOrigin = String(req.headers.get("origin") || "");
      if (requestOrigin && requestOrigin !== origin) return json({ error: "origin_mismatch" }, 403);
      const signedMs = Date.parse(signedAt);
      if (Number.isNaN(signedMs)) return json({ error: "invalid_signed_at" }, 400);
      const age = Date.now() - signedMs;
      if (age > BALANCE_SIGNATURE_MAX_AGE_MS || age < -BALANCE_SIGNATURE_FUTURE_SKEW_MS) return json({ error: "stale_or_future_signature" }, 409);
      const expectedMessage = balanceMessage(wallet, origin, nonce, signedAt);
      if (signatureMessage !== expectedMessage) return json({ error: "signature_message_mismatch" }, 400);
      let valid = false;
      try { valid = await verifyMessage({ address: wallet as `0x${string}`, message: expectedMessage, signature: signature as `0x${string}` }); } catch { valid = false; }
      if (!valid) return json({ error: "invalid_signature" }, 401);
      try {
        const entitlement = await readEntitlement(supabase, wallet);
        return json({ ok: true, wallet, ...entitlement, canCreate: entitlement.demoAvailable || entitlement.remainingCredits > 0, balanceRedacted: false, privacy: "SIGNED_PRIVATE_BALANCE", proof: "EIP191_PERSONAL_SIGN" });
      } catch (error) {
        console.error(error instanceof Error ? error.message : "entitlement_lookup_failed");
        return json({ error: "entitlement_lookup_failed" }, 500);
      }
    }

    if (body.action !== "verify") return json({ error: "invalid_action" }, 400);
    const txHash = normalize(body.txHash);
    const payer = normalize(body.payerWallet);
    const planCode = String(body.planCode || "").toUpperCase();
    const chainIdText = String(Number(body.chainId));
    const chain = CHAINS[chainIdText as keyof typeof CHAINS];
    if (!TX_RE.test(txHash)) return json({ error: "invalid_tx_hash" }, 400);
    if (!WALLET_RE.test(payer)) return json({ error: "invalid_payer_wallet" }, 400);
    if (!chain) return json({ error: "unsupported_chain" }, 400);
    const plan = PLANS[planCode as keyof typeof PLANS];
    if (!plan) return json({ error: "invalid_plan" }, 400);

    const { data: existingPayment, error: existingPaymentError } = await supabase
      .from("evo_checkout_payments")
      .select("tx_hash,payer_wallet,plan_code,amount_minor,credits,chain_id,token_contract,merchant_wallet,block_number,confirmations,confirmed_at")
      .eq("tx_hash", txHash)
      .maybeSingle();
    if (existingPaymentError) { console.error(existingPaymentError); return json({ error: "payment_cache_lookup_failed" }, 500); }
    if (existingPayment) {
      const requestMatches = normalize(existingPayment.payer_wallet) === payer && String(existingPayment.plan_code) === planCode && Number(existingPayment.chain_id) === Number(chainIdText);
      if (!requestMatches) return json({ error: "payment_replay_mismatch" }, 409);
      let amountMatches = false;
      try { amountMatches = BigInt(String(existingPayment.amount_minor)) === plan.amount; } catch { amountMatches = false; }
      const storedCanonical = amountMatches && Number(existingPayment.credits) === plan.credits && normalize(existingPayment.token_contract) === chain.usdc && normalize(existingPayment.merchant_wallet) === MERCHANT;
      if (!storedCanonical) return json({ error: "stored_payment_integrity_error" }, 500);
      return json({ ok: true, pending: false, applied: false, cached: true, planCode, network: chain.name, chainId: Number(chainIdText), planCredits: plan.credits, transactionHash: txHash, confirmations: Number(existingPayment.confirmations), balancePrivate: true });
    }

    const { data: verificationRate, error: verificationRateError } = await supabase.rpc("evo_checkout_take_verification_slot", { p_payer_wallet: payer, p_tx_hash: txHash }).single();
    if (verificationRateError || !verificationRate) { console.error(verificationRateError || "verification_rate_guard_unavailable"); return json({ error: "verification_guard_unavailable" }, 503); }
    if (!verificationRate.allowed) {
      const retryAfter = Math.max(1, Number(verificationRate.retry_after_seconds || 1));
      return json({ error: "verification_rate_limited", retryAfterSeconds: retryAfter }, 429, { "Retry-After": String(retryAfter) });
    }

    let views;
    try {
      const chainId = BigInt(chainIdText);
      views = [];
      for (const endpoint of chain.rpc) {
        try { views.push(await readChain(endpoint, chainId, txHash)); if (views.length === 2) break; }
        catch (error) { console.warn("RPC fallback", chain.name, error); }
      }
      if (views.length < 2) throw new Error("rpc_quorum_unavailable");
    } catch (error) { console.error(error); return json({ error: "blockchain_temporarily_unavailable" }, 503); }
    if (views.some((view: any) => view.pending)) return json({ ok: false, pending: true, reason: "transaction_not_indexed" }, 202);

    let checks;
    try { checks = views.map((view: any) => verifyTransfer(view, chain, txHash, payer, plan.amount)); }
    catch (error) { const reason = error instanceof Error ? error.message : "payment_verification_failed"; return json({ error: "payment_verification_failed", reason }, 400); }
    if (checks[0].blockNumber !== checks[1].blockNumber || checks[0].blockHash !== checks[1].blockHash) return json({ error: "rpc_consensus_failed" }, 503);
    const confirmations = checks.reduce((minimum: bigint, check: any) => check.confirmations < minimum ? check.confirmations : minimum, checks[0].confirmations);
    if (confirmations < chain.confirmations) return json({ ok: false, pending: true, reason: "waiting_confirmations", confirmations: Number(confirmations), requiredConfirmations: Number(chain.confirmations) }, 202);

    const { data, error } = await supabase.rpc("evo_apply_checkout_payment", {
      p_tx_hash: txHash,
      p_payer_wallet: payer,
      p_plan_code: planCode,
      p_amount_minor: Number(plan.amount),
      p_credits: plan.credits,
      p_chain_id: Number(chainIdText),
      p_token_contract: chain.usdc,
      p_block_number: Number(checks[0].blockNumber),
      p_confirmations: Number(confirmations),
      p_confirmed_at: checks[0].confirmedAt,
    }).single();
    if (error) { console.error(error); return json({ error: "credit_application_failed" }, 500); }
    return json({ ok: true, pending: false, applied: Boolean(data.applied), cached: false, planCode, network: chain.name, chainId: Number(chainIdText), planCredits: plan.credits, transactionHash: txHash, confirmations: Number(confirmations), balancePrivate: true });
  } catch (error) {
    console.error(error instanceof Error ? error.name : "unknown");
    return json({ error: "invalid_request" }, 400);
  }
}

Deno.serve(async (req: Request) => {
  const preflight = restrictedPreflight(req);
  if (preflight) return preflight;
  const denied = rejectUntrustedBrowserOrigin(req);
  if (denied) return denied;
  return withRestrictedCors(req, await handle(req));
});
