'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.private, true, 'release package metadata must stay private/non-publishable');
assert.match(pkg.version, /^4\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'release metadata must stay on the EVO V4 version line');
assert.equal(pkg.version, '4.5.0', 'release metadata must identify the promoted V4.5 software-authority line');
assert.match(String(pkg.engines && pkg.engines.node || ''), />=20/, 'Node development baseline must stay explicit');
assert.equal(read('VERSION').trim(), pkg.version, 'VERSION and package.json must remain aligned');
assert.match(pkg.scripts['test:nfc'], /nfc-proof-v421\.test\.mjs/, 'NFC test command must preserve the public-proof contract regression');
assert.match(pkg.scripts['test:nfc'], /nfc-crypto-v440\.test\.mjs/, 'NFC test command must execute the NXP crypto vectors');
assert.match(pkg.scripts['test:nfc'], /nfc-verifier-v440\.test\.js/, 'NFC test command must execute verifier/claim-boundary checks');
assert.match(pkg.scripts['test:nfc:authority'], /nfc-replay-authority-v450\.sql/, 'NFC DB authority command must expose the V4.5 replay regression');

const readme = read('README.md');
assert.match(readme, /Current stage:\s*V4\.5 Software Authority Line/, 'README must expose the current V4.5 software-authority stage');
assert.match(readme, /V4\.0 RC1 was promoted to `main`/, 'README must preserve the V4 promotion history');
assert.match(readme, /V4\.2 added EU DPP Registry integration readiness/, 'README must preserve the promoted V4.2 DPP line');
assert.match(readme, /V4\.3 added a fail-closed server adapter/, 'README must expose the promoted V4.3 DPP adapter line');
assert.match(readme, /V4\.4 implemented NTAG 424 DNA SDM\/SUN cryptographic verification/, 'README must expose the promoted V4.4 NFC crypto line');
assert.match(readme, /V4\.5 completed the software NFC authority/, 'README must expose the promoted V4.5 replay-authority line');
assert.doesNotMatch(readme, /Current stage:\s*V4\.2\.1 Development Line/, 'README must not regress to the obsolete V4.2.1 current-stage label');
assert.doesNotMatch(readme, /Current stage:\s*V1\.5 Commercial Pilot/i, 'README must not regress to the obsolete V1.5 status');
assert.match(readme, /PROJECT_TRUTH_V400\.md/, 'README must point to the V4 product-truth source');
assert.match(readme, /RELEASE_CHECKLIST_V400\.md/, 'README must preserve the V4 promotion checklist reference');
assert.match(readme, /one benefit per eligible user/i, 'README must preserve the server-side Free Proof policy');
assert.doesNotMatch(readme, /Free Proof:\*\* one demonstration Proof per wallet/i, 'README must not restore one-free-proof-per-wallet marketing');
assert.match(readme, /DPP_REGISTRY_INTEGRATION_V420\.md/, 'README must expose the current EU DPP Registry readiness track');
assert.match(readme, /NFC_PILOT_V421\.md/, 'README must preserve the physical NFC pilot boundary');
assert.match(readme, /CRYPTO_AND_REPLAY_VALIDATED_PENDING_PHYSICAL_PILOT/, 'README must preserve the pre-physical-pilot claim boundary');
assert.match(readme, /nfc-replay-authority-v450\.sql/, 'README must expose the V4.5 replay-authority regression evidence');
assert.match(readme, /physicalAuthenticity=false/, 'README must preserve the physical-authenticity claim boundary');

const launcher = read('index.html');
const launcherJs = read('root-launch.js');
assert.match(launcher, /20260824-v410-dev1/, 'root launcher must use the current V4 browser cache key');
assert.match(launcherJs, /20260824-v410-dev1/, 'root launcher JS must target the current V4 browser app');
assert.doesNotMatch(launcher, /20260823-v400-rc1/, 'root launcher must not keep the retired RC1 cache key');
assert.doesNotMatch(launcherJs, /20260823-v400-rc1/, 'root launcher JS must not keep the retired RC1 target');

const development = read('DEVELOPMENT.md');
assert.match(development, /`main` es siempre la base promovida del código/, 'development guide must define main as the promoted baseline');
assert.match(development, /git checkout main/, 'development guide must start new work from main');
assert.match(development, /git checkout -b codex\/evo-vXYZ-descripcion/, 'development guide must create a fresh branch per change');
assert.doesNotMatch(development, /codex\/evo-v410-origin-truth-integration/, 'development guide must not hard-code an already merged branch');
assert.match(development, /EVO_ALLOW_LOCAL_ORIGINS=true/, 'local CORS development switch must be documented explicitly');
assert.match(development, /No habilitar esa opción en producción/, 'local-origin switch must be prohibited in production guidance');
assert.match(development, /no reescribir una migración ya aplicada en producción/i, 'applied production migrations must remain immutable');
assert.match(development, /1 Free Proof por usuario elegible/, 'development guide must preserve the anti-abuse product rule');
assert.match(development, /npm run test:nfc/, 'development guide must expose the NFC regression command');
assert.match(development, /docs\/NFC_PILOT_V421\.md/, 'development guide must reference the NFC physical-pilot boundary');
assert.match(development, /docs\/DPP_REGISTRY_INTEGRATION_V420\.md/, 'development guide must preserve the DPP Registry integration track');

const readiness = read('docs/RELEASE_READINESS_V400.md');
assert.match(readiness, /Not equivalent to production readiness/, 'release audit must distinguish code readiness from deployment readiness');
assert.match(readiness, /Passport Transfer/, 'release audit must keep Passport Transfer CORS review visible');
assert.match(readiness, /Battery Passport/, 'release audit must keep Battery Passport CORS review visible');
assert.match(readiness, /independent penetration\/security review/i, 'release audit must preserve the independent review gate');
assert.match(readiness, /unhackable/, 'release audit must preserve prohibited-claims guidance');
assert.match(readiness, /explicit owner authorization/i, 'release audit must require explicit authorization before promotion');

const releaseBundle = read('.github/workflows/evo-release-bundle.yml');
assert.match(releaseBundle, /Checkout exact candidate head/, 'release bundle must explicitly checkout the candidate head');
assert.match(releaseBundle, /github\.event\.pull_request\.head\.sha \|\| github\.sha/, 'PR bundles must select the actual PR head SHA');
assert.match(releaseBundle, /SOURCE_SHA="\$\(git rev-parse HEAD\)"/, 'release bundle must derive source identity from checked-out HEAD');
assert.match(releaseBundle, /VERSION="\$\(tr -d/, 'release bundle must derive artifact version from VERSION');
assert.match(releaseBundle, /ZIP_FILE="EVO_Protocol_\$\{SAFE_VERSION\}\.zip"/, 'release bundle filename must be version-aware');
assert.match(releaseBundle, /EVO_SOURCE_COMMIT\.txt/, 'release bundle must record the exact source commit');
assert.match(releaseBundle, /source_commit=\$SOURCE_SHA/, 'release manifest must bind evidence to the checked-out candidate commit');
assert.match(releaseBundle, /version=\$VERSION/, 'release manifest must bind evidence to the project version');
assert.match(releaseBundle, /workflow_trigger_sha=\$GITHUB_SHA/, 'release manifest must separately record the GitHub trigger/integration SHA');
assert.match(releaseBundle, /zip_sha256=/, 'release manifest must record the final source ZIP SHA-256');
assert.match(releaseBundle, /branches:\s*\n\s*- main/, 'release bundle must also run after promotion to main');
assert.doesNotMatch(releaseBundle, /EVO_Protocol_V4_RC1\.zip/, 'release bundle must not hard-code the retired RC1 artifact name');

const nfc = read('standards/evo-nfc-proof-v421.mjs');
const nfcSchema = read('schemas/evo-nfc-proof-v1.schema.json');
assert.match(nfc, /SERVER_SIDE_NTAG424/, 'NFC public proof must require a server-side verifier decision');
assert.match(nfc, /physicalAuthenticity:false/, 'NFC public proof must not claim physical authenticity');
assert.match(nfcSchema, /"physicalAuthenticity": \{ "const": false \}/, 'NFC schema must encode the physical-authenticity boundary');
assert.doesNotMatch(nfc, /aesKey\s*:/i, 'public NFC proof contract must not expose AES key fields');

const nfcAuthorityWorkflow = read('.github/workflows/evo-nfc-authority-checks.yml');
assert.match(nfcAuthorityWorkflow, /postgres:17/, 'NFC authority workflow must execute against an isolated PostgreSQL service');
assert.match(nfcAuthorityWorkflow, /nfc-replay-authority-v450\.sql/, 'NFC authority workflow must run the V4.5 atomic replay regression');
assert.match(nfcAuthorityWorkflow, /persist-credentials: false/, 'NFC authority workflow checkout must not persist GitHub credentials');

const gitignore = read('.gitignore');
assert.match(gitignore, /^\.env$/m, '.env must remain ignored');
assert.match(gitignore, /^\.env\.\*$/m, 'environment variants must remain ignored');
assert.match(gitignore, /^!\.env\.example$/m, 'safe env template must remain allowlisted');

console.log('EVO V4.5 release-readiness checks passed');
