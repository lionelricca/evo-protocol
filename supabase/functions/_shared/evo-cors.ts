const BUILTIN_OFFICIAL_ORIGINS = new Set([
  "https://lionelricca.github.io",
]);

const ALLOW_HEADERS = "authorization, x-client-info, apikey, content-type";
const ALLOW_METHODS = "POST, OPTIONS";

function canonicalOrigin(value: unknown) {
  const origin = String(value || "").trim();
  if (!origin || origin.length > 240 || origin === "null") throw new Error("invalid_origin");
  let parsed: URL;
  try { parsed = new URL(origin); } catch { throw new Error("invalid_origin"); }
  if (parsed.origin !== origin) throw new Error("invalid_origin");
  if (parsed.username || parsed.password) throw new Error("invalid_origin");
  return origin;
}

function configuredOrigins() {
  const configured = String(Deno.env.get("EVO_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = new Set(BUILTIN_OFFICIAL_ORIGINS);
  for (const candidate of configured) {
    try {
      const origin = canonicalOrigin(candidate);
      const parsed = new URL(origin);
      if (parsed.protocol === "https:") origins.add(origin);
    } catch {
      console.warn("EVO CORS ignored invalid configured origin");
    }
  }
  return origins;
}

function localOriginAllowed(origin: string) {
  if (Deno.env.get("EVO_ALLOW_LOCAL_ORIGINS") !== "true") return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function isAllowedBrowserOrigin(value: unknown) {
  let origin: string;
  try { origin = canonicalOrigin(value); } catch { return false; }
  return configuredOrigins().has(origin) || localOriginAllowed(origin);
}

export function canonicalAllowedBrowserOrigin(value: unknown) {
  const origin = canonicalOrigin(value);
  if (!isAllowedBrowserOrigin(origin)) throw new Error("untrusted_origin");
  return origin;
}

export function restrictedCorsHeaders(req: Request) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": ALLOW_METHODS,
    "Access-Control-Max-Age": "600",
  };
  const requestOrigin = String(req.headers.get("origin") || "").trim();
  if (requestOrigin) headers.Vary = "Origin";
  if (requestOrigin && isAllowedBrowserOrigin(requestOrigin)) {
    headers["Access-Control-Allow-Origin"] = requestOrigin;
  }
  return headers;
}

export function restrictedPreflight(req: Request) {
  if (req.method !== "OPTIONS") return null;
  const requestOrigin = String(req.headers.get("origin") || "").trim();
  const allowed = !requestOrigin || isAllowedBrowserOrigin(requestOrigin);
  return new Response(null, {
    status: allowed ? 204 : 403,
    headers: {
      ...restrictedCorsHeaders(req),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function rejectUntrustedBrowserOrigin(req: Request) {
  const requestOrigin = String(req.headers.get("origin") || "").trim();
  if (!requestOrigin || isAllowedBrowserOrigin(requestOrigin)) return null;
  return new Response(JSON.stringify({ error: "browser_origin_not_allowed" }), {
    status: 403,
    headers: {
      ...restrictedCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function withRestrictedCors(req: Request, response: Response) {
  const headers = restrictedCorsHeaders(req);
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  return response;
}
