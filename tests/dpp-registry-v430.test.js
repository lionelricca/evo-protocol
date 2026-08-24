'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'supabase/functions/evo-dpp-registry/index.ts'), 'utf8');
const matrix = fs.readFileSync(path.join(ROOT, 'docs/DPP_COMPLIANCE_MATRIX.md'), 'utf8');
const integration = fs.readFileSync(path.join(ROOT, 'docs/DPP_REGISTRY_INTEGRATION_V420.md'), 'utf8');

assert.match(source, /const MAX_BATCH = 100;/, 'Commission file/batch limit must stay bounded to 100 DPPs');
assert.match(source, /const MAX_UPI_LENGTH = 50;/, 'UPI limit from the current Registry guide must remain explicit');
assert.match(source, /url\.protocol !== "https:"/, 'Registry UPI must require HTTPS');
assert.match(source, /upi_private_host_forbidden/, 'UPI validation must reject obvious local/private targets');
assert.match(source, /duplicate_upi_in_batch/, 'a batch must reject duplicate UPI values before external submission');
assert.match(source, /EVO_DPP_ADMIN_SECRET/, 'privileged Registry preparation must require a server-side secret');
assert.doesNotMatch(source, /Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/, 'server-only Registry adapter must not expose wildcard browser CORS');
assert.match(source, /commissionSubmissionCompatibility: "NOT_CLAIMED"/, 'offline EVO envelope must not pretend to be the Commission submission schema');
assert.match(source, /BATTERY_SEMANTIC_CATALOGUE_PENDING/, 'current Commission battery semantic blocker must be explicit');
assert.match(source, /live_submit_not_implemented_until_official_api_contract_is_pinned/, 'live Registry writes must fail closed until the official API contract is pinned');
assert.match(source, /canSubmit: false/, 'live submission must remain disabled by default');
assert.match(source, /requestFingerprint/, 'prepared envelopes must expose deterministic request fingerprints');

assert.match(matrix, /semantic catalogue|semantic content/i, 'compliance matrix must track the Commission battery semantic blocker');
assert.match(integration, /semantic catalogue|semantic content/i, 'integration plan must track the Commission battery semantic blocker');
assert.match(integration, /QES|QSeal/, 'organisation verification must record qualified signing/sealing requirements');
assert.match(integration, /100/, 'integration plan must preserve the current maximum batch size');
assert.match(integration, /correlation ID/i, 'integration plan must capture external request correlation evidence');

console.log('EVO V4.3 DPP Registry fail-closed integration checks passed');
