const fs = require('fs');
const assert = require('assert');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const pulse = read('supabase/functions/evo-pulse/index.ts');
const challenge = read('supabase/functions/evo-challenge/index.ts');
const guardian = read('supabase/functions/evo-ai-guardian-v04/index.ts');

for (const [name, source] of [['pulse', pulse], ['challenge', challenge], ['guardian', guardian]]) {
  assert(!source.includes('"Access-Control-Allow-Origin":"*"'), `${name}: wildcard CORS must not return`);
  assert(!source.includes('"Access-Control-Allow-Origin": "*"'), `${name}: wildcard CORS must not return`);
  assert(source.includes('origin_not_allowed'), `${name}: origin allowlist enforcement is required`);
  assert(source.includes('payload_too_large'), `${name}: request body limit is required`);
  assert(source.includes('X-Content-Type-Options'), `${name}: nosniff header is required`);
  assert(source.includes('Cache-Control'), `${name}: sensitive API responses must be no-store`);
}

assert(pulse.includes('trustWeight: 0'), 'Pulse must remain zero-weight public evidence');
assert(pulse.includes('PUBLIC_OBSERVATION'), 'Pulse must identify itself as public observation only');
assert(pulse.includes('>= 60'), 'Pulse hourly abuse threshold must exist');
assert(pulse.includes('>= 300'), 'Pulse daily abuse threshold must exist');

assert(challenge.includes('PUBLIC_SOFTWARE_FRESHNESS'), 'Challenge must be explicitly classified as public software freshness');
assert(challenge.includes('trustWeight: 0'), 'Challenge must remain zero-weight public evidence');
assert(challenge.includes('physicalPresence: false'), 'Challenge must never imply physical presence');
assert(challenge.includes('ownershipProof: false'), 'Challenge must never imply ownership proof');
assert(challenge.includes('challenge_attempt_limit'), 'Challenge attempts must be capped');
assert(challenge.includes('reused: true'), 'A live pending challenge should be reused instead of multiplied');

assert(guardian.includes('publicPulseTrustWeight: 0'), 'Guardian must publish Pulse zero-weight semantics');
assert(guardian.includes('publicChallengeTrustWeight: 0'), 'Guardian must publish Challenge zero-weight semantics');
assert(guardian.includes('signedLifecycle || providerCountersigned'), 'Reality elevation must depend on signed evidence');
assert(!guardian.includes('historyPresent&&chainOk'), 'Legacy public-activity trust elevation must not return');
assert(guardian.includes('EVO AI Guardian V0.6 SECURITY-HARDENED'), 'Hardened Guardian version marker required');

console.log('EVO V3.3 security hardening checks passed');
