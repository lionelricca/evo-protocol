import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MAX_BODY_BYTES = 131_072;
const MAX_BATCH = 100;
const MAX_UPI_LENGTH = 50;
const IDENTIFIER_MAX = 128;
const CONTRACT = "EVO_DPP_REGISTRY_ENVELOPE_V430";
const PRODUCT_GROUP = "BATTERIES";
const GRANULARITY = "ITEM";
const TEST_REGISTRY = "https://registry.acc.product-passport.ec.europa.eu/";
const PROD_REGISTRY = "https://registry.product-passport.ec.europa.eu/";
const ACTIONS = new Set(["status", "validate", "prepare", "batch_prepare", "submit"]);

type AnyRecord = Record<string, unknown>;
type RegistryRecord = {
  upi: string;
  productGroup: "BATTERIES";
  granularity: "ITEM";
  modelIdentifier?: string;
  batchIdentifier?: string;
};

function response(data: unknown, status = 200) {
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

function textBytes(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as AnyRecord)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const octets = parts.map(Number);
  if (octets.some((n) => n < 0 || n > 255)) return false;
  const [a, b] = octets;
  return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0;
}

function validateUpi(raw: unknown) {
  const value = String(raw ?? "").trim();
  if (!value) throw new Error("upi_required");
  if (value.length > MAX_UPI_LENGTH) throw new Error("upi_too_long");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("upi_invalid_url");
  }

  if (url.protocol !== "https:") throw new Error("upi_https_required");
  if (url.username || url.password) throw new Error("upi_credentials_forbidden");
  if (url.port && url.port !== "443") throw new Error("upi_port_forbidden");

  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("upi_private_host_forbidden");
  }
  if (isPrivateIpv4(host) || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) {
    throw new Error("upi_private_host_forbidden");
  }

  return value;
}

function optionalIdentifier(raw: unknown, field: string) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const value = String(raw).trim();
  if (!value) return undefined;
  if (value.length > IDENTIFIER_MAX) throw new Error(`${field}_too_long`);
  if (/[^\p{L}\p{N}._:\/-]/u.test(value)) throw new Error(`${field}_invalid_characters`);
  return value;
}

function normalizeRecord(input: unknown): RegistryRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("record_object_required");
  const record = input as AnyRecord;
  const productGroup = String(record.productGroup ?? PRODUCT_GROUP).trim().toUpperCase();
  const granularity = String(record.granularity ?? GRANULARITY).trim().toUpperCase();
  if (productGroup !== PRODUCT_GROUP) throw new Error("battery_product_group_required");
  if (granularity !== GRANULARITY) throw new Error("battery_item_granularity_required");

  return {
    upi: validateUpi(record.upi),
    productGroup: PRODUCT_GROUP,
    granularity: GRANULARITY,
    modelIdentifier: optionalIdentifier(record.modelIdentifier, "model_identifier"),
    batchIdentifier: optionalIdentifier(record.batchIdentifier, "batch_identifier"),
  };
}

function normalizeBatch(raw: unknown) {
  if (!Array.isArray(raw)) throw new Error("records_array_required");
  if (raw.length < 1) throw new Error("records_empty");
  if (raw.length > MAX_BATCH) throw new Error("records_exceed_commission_batch_limit");
  const records = raw.map(normalizeRecord);
  const upis = new Set<string>();
  for (const record of records) {
    if (upis.has(record.upi)) throw new Error("duplicate_upi_in_batch");
    upis.add(record.upi);
  }
  return records;
}

async function secureEqual(provided: string, expected: string) {
  const [a, b] = await Promise.all([sha256(provided), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function requireAdmin(req: Request) {
  const expected = Deno.env.get("EVO_DPP_ADMIN_SECRET") || "";
  if (expected.length < 32) return { ok: false as const, status: 503, error: "dpp_admin_secret_not_configured" };
  const provided = req.headers.get("x-evo-dpp-admin") || "";
  if (!provided || !(await secureEqual(provided, expected))) return { ok: false as const, status: 403, error: "dpp_admin_authorization_failed" };
  return { ok: true as const };
}

function externalState() {
  const semanticFlag = String(Deno.env.get("EVO_DPP_BATTERY_SEMANTIC_CATALOG_READY") || "").toLowerCase() === "true";
  const apiContract = String(Deno.env.get("EVO_DPP_REGISTRY_API_CONTRACT") || "").trim();
  return {
    registryOperational: true,
    testRegistry: TEST_REGISTRY,
    productionRegistry: PROD_REGISTRY,
    batterySemanticCatalogue: semanticFlag ? "CONFIGURED_READY_REQUIRES_EVIDENCE" : "PENDING_COMMISSION_ENABLEMENT",
    apiContractPinned: Boolean(apiContract),
    liveSubmissionImplemented: false,
    canSubmit: false,
    reason: "Commission user guide v1.01 states successful battery registration is not yet available while the battery semantic catalogue/content is under development; EVO therefore fails closed for live submission.",
  };
}

async function prepareEnvelope(records: RegistryRecord[]) {
  const payload = {
    contract: CONTRACT,
    environment: "TEST",
    productGroup: PRODUCT_GROUP,
    granularity: GRANULARITY,
    records,
    commissionSubmissionCompatibility: "NOT_CLAIMED",
    externalBlocker: "BATTERY_SEMANTIC_CATALOGUE_PENDING",
  };
  const fingerprint = await sha256(canonical(payload));
  return {
    ...payload,
    requestFingerprint: fingerprint,
    recordCount: records.length,
    generatedAt: new Date().toISOString(),
    note: "This is an EVO internal deterministic registration envelope, not a claim of conformance to the Commission JSON/XML submission schema. Pin the official battery semantic schema/API contract before enabling submission.",
  };
}

function errorStatus(message: string) {
  if (message.includes("required") || message.includes("invalid") || message.includes("forbidden") || message.includes("too_long") || message.includes("exceed") || message.includes("duplicate") || message.includes("granularity") || message.includes("product_group") || message.includes("empty")) return 400;
  return 422;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response({ ok: false, error: "method_not_allowed" }, 405);

  const raw = await req.text();
  if (textBytes(raw) > MAX_BODY_BYTES) return response({ ok: false, error: "request_too_large" }, 413);

  let body: AnyRecord;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return response({ ok: false, error: "invalid_json" }, 400);
  }

  const action = String(body.action || "status").trim().toLowerCase();
  if (!ACTIONS.has(action)) return response({ ok: false, error: "unsupported_action" }, 400);

  if (action === "status") {
    return response({
      ok: true,
      service: "EVO DPP Registry Adapter V4.3",
      boundary: "SERVER_ONLY_FAIL_CLOSED",
      commission: externalState(),
      limits: { maxBatch: MAX_BATCH, maxUpiLength: MAX_UPI_LENGTH, productGroup: PRODUCT_GROUP, granularity: GRANULARITY },
      adminSecretConfigured: (Deno.env.get("EVO_DPP_ADMIN_SECRET") || "").length >= 32,
    });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return response({ ok: false, error: auth.error }, auth.status);

  try {
    if (action === "validate") {
      const records = body.records ? normalizeBatch(body.records) : [normalizeRecord(body.record ?? body)];
      return response({ ok: true, valid: true, records, commission: externalState() });
    }

    if (action === "prepare") {
      const record = normalizeRecord(body.record ?? body);
      return response({ ok: true, envelope: await prepareEnvelope([record]), commission: externalState() });
    }

    if (action === "batch_prepare") {
      const records = normalizeBatch(body.records);
      return response({ ok: true, envelope: await prepareEnvelope(records), commission: externalState() });
    }

    if (action === "submit") {
      return response({
        ok: false,
        error: "live_submit_not_implemented_until_official_api_contract_is_pinned",
        commission: externalState(),
        requiredNextEvidence: [
          "verified economic-operator organisation in the Commission test environment",
          "official battery semantic catalogue/schema enabled",
          "documented API authentication and endpoint contract",
          "successful controlled test registration with correlation ID and returned URI",
        ],
      }, 503);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "validation_failed";
    return response({ ok: false, error: message }, errorStatus(message));
  }

  return response({ ok: false, error: "unreachable" }, 500);
});
