'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.private, true, 'release package metadata must stay private/non-publishable');
assert.equal(pkg.version, '4.0.0-rc.1', 'release metadata must identify V4.0.0 RC1');
assert.match(String(pkg.engines && pkg.engines.node || ''), />=20/, 'Node development baseline must stay explicit');
assert.equal(read('VERSION').trim(), pkg.version, 'VERSION and package.json must remain aligned');

const readme = read('README.md');
assert.match(readme, /Current stage:\s*V4\.0 Release Candidate/, 'README must expose the current V4 release-candidate status');
assert.doesNotMatch(readme, /Current stage:\s*V1\.5 Commercial Pilot/i, 'README must not regress to the obsolete V1.5 status');
assert.match(readme, /PROJECT_TRUTH_V400\.md/, 'README must point to the V4 product-truth source');
assert.match(readme, /RELEASE_CHECKLIST_V400\.md/, 'README must point to the V4 release checklist');

const launcher = read('index.html');
const launcherJs = read('root-launch.js');
assert.match(launcher, /20260823-v400-rc1/, 'root launcher must use the V4 RC1 cache key');
assert.match(launcherJs, /20260823-v400-rc1/, 'root launcher JS must target the V4 RC1 app');
assert.doesNotMatch(launcher, /20260821-v25/, 'root launcher must not restore the stale V2.5 cache key');
assert.doesNotMatch(launcherJs, /20260821-v25/, 'root launcher JS must not restore the stale V2.5 target');

const development = read('DEVELOPMENT.md');
assert.match(development, /codex\/evo-v400-release-candidate/, 'development guide must point to the canonical V4 RC branch');
assert.match(development, /EVO_ALLOW_LOCAL_ORIGINS=true/, 'local CORS development switch must be documented explicitly');
assert.match(development, /No habilitar esa opción en producción/, 'local-origin switch must be prohibited in production guidance');
assert.match(development, /no reescribir una migración ya aplicada en producción/i, 'applied production migrations must remain immutable');

const readiness = read('docs/RELEASE_READINESS_V400.md');
assert.match(readiness, /Not equivalent to production readiness/, 'release audit must distinguish code readiness from deployment readiness');
assert.match(readiness, /Passport Transfer/,'release audit must keep Passport Transfer CORS review visible');
assert.match(readiness, /Battery Passport/,'release audit must keep Battery Passport CORS review visible');
assert.match(readiness, /independent penetration\/security review/i, 'release audit must preserve the independent review gate');
assert.match(readiness, /unhackable/, 'release audit must preserve prohibited-claims guidance');
assert.match(readiness, /explicit owner authorization/i, 'release audit must require explicit authorization before promotion');

const releaseBundle = read('.github/workflows/evo-release-bundle.yml');
assert.match(releaseBundle, /Checkout exact candidate head/, 'release bundle must explicitly checkout the candidate head');
assert.match(releaseBundle, /github\.event\.pull_request\.head\.sha \|\| github\.sha/, 'PR bundles must select the actual PR head SHA');
assert.match(releaseBundle, /SOURCE_SHA="\$\(git rev-parse HEAD\)"/, 'release bundle must derive source identity from checked-out HEAD');
assert.match(releaseBundle, /EVO_SOURCE_COMMIT\.txt/, 'release bundle must record the exact source commit');
assert.match(releaseBundle, /source_commit=\$SOURCE_SHA/, 'release manifest must bind evidence to the checked-out candidate commit');
assert.match(releaseBundle, /workflow_trigger_sha=\$GITHUB_SHA/, 'release manifest must separately record the GitHub trigger/integration SHA');
assert.match(releaseBundle, /EVO_Release_Manifest\.txt/, 'release bundle must upload an auditable manifest');
assert.match(releaseBundle, /zip_sha256=/, 'release manifest must record the final source ZIP SHA-256');

const gitignore = read('.gitignore');
assert.match(gitignore, /^\.env$/m, '.env must remain ignored');
assert.match(gitignore, /^\.env\.\*$/m, 'environment variants must remain ignored');
assert.match(gitignore, /^!\.env\.example$/m, 'safe env template must remain allowlisted');

console.log('EVO V4.0 RC1 release-readiness checks passed');
