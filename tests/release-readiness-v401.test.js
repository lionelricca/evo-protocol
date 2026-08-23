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

const readme = read('README.md');
assert.match(readme, /Current code status — V4\.0\.0 RC1/, 'README must expose the current code status');
assert.doesNotMatch(readme, /Current stage:\s*V1\.5 Commercial Pilot/i, 'README must not regress to the obsolete V1.5 status');
assert.match(readme, /DEVELOPMENT\.md/, 'README must point developers to the reproducible setup guide');
assert.match(readme, /RELEASE_READINESS_V400\.md/, 'README must point to the release-readiness audit');

const launcher = read('index.html');
assert.match(launcher, /20260823-v400-rc1/, 'root launcher must use the V4 RC cache key');
assert.doesNotMatch(launcher, /20260821-v25/, 'root launcher must not restore the stale V2.5 cache key');

const development = read('DEVELOPMENT.md');
assert.match(development, /Never|nunca/i, 'development guide must preserve explicit secret-handling rules');
assert.match(development, /EVO_ALLOW_LOCAL_ORIGINS=true/, 'local CORS development switch must be documented explicitly');
assert.match(development, /No habilitar esa opción en producción/, 'local-origin switch must be prohibited in production guidance');

const readiness = read('docs/RELEASE_READINESS_V400.md');
assert.match(readiness, /Not equivalent to production readiness/, 'release audit must distinguish code readiness from deployment readiness');
assert.match(readiness, /independent penetration\/security review/i, 'release audit must preserve the independent review gate');
assert.match(readiness, /unhackable/, 'release audit must preserve the prohibited-claims guidance');

const gitignore = read('.gitignore');
assert.match(gitignore, /^\.env$/m, '.env must remain ignored');
assert.match(gitignore, /^\.env\.\*$/m, 'environment variants must remain ignored');

console.log('EVO V4.0 RC1 release-readiness checks passed');
