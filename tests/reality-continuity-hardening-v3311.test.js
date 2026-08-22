const fs = require('fs');

const source = fs.readFileSync('supabase/functions/evo-reality-continuity/index.ts', 'utf8');

function requireMatch(pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

requireMatch(/supabase-js@2\.105\.4/, 'supabase-js must be pinned');
requireMatch(/MAX_BODY_BYTES\s*=\s*16_384/, 'request body limit missing');
requireMatch(/content-length/i, 'declared content length guard missing');
requireMatch(/TextEncoder\(\)\.encode\(raw\)\.byteLength/, 'actual body byte limit missing');
requireMatch(/Cache-Control["']:\s*["']no-store/, 'no-store response header missing');
requireMatch(/X-Content-Type-Options["']:\s*["']nosniff/, 'nosniff response header missing');
requireMatch(/\['get', 'prepare', 'commit'\]\.includes\(action\)/, 'action allowlist missing');
requireMatch(/signature\.length\s*<\s*1[\s\S]*signature\.length\s*>\s*512/, 'signature bound missing');
requireMatch(/signatureMessage\.length\s*>\s*2048/, 'signature message bound missing');
requireMatch(/return json\(\{ error: "internal_error" \}, 500\)/, 'generic internal error response missing');

if (/supabase-js@2["']/.test(source)) throw new Error('floating supabase-js major version detected');
if (/return json\(\{error:String\(\(err as any\)\?\.message/.test(source)) throw new Error('raw internal error message leak detected');

console.log('Reality Continuity hardening V3.3.11: PASS');