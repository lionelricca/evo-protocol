import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

assert.equal(lock.lockfileVersion, 3, 'npm lockfile must use lockfileVersion 3');
assert.equal(lock.name, pkg.name, 'lockfile package name must match package.json');
assert.equal(lock.version, pkg.version, 'lockfile version must match package.json');
assert.equal(lock.packages?.['']?.version, pkg.version, 'root locked package version must match release version');
assert.equal(lock.packages?.['']?.engines?.node, pkg.engines.node, 'locked Node baseline must match package metadata');

const sbomPath = process.argv[2];
if (sbomPath) {
  const sbom = JSON.parse(fs.readFileSync(sbomPath, 'utf8'));
  assert.equal(sbom.spdxVersion, 'SPDX-2.3', 'SBOM must use SPDX 2.3');
  assert.equal(sbom.dataLicense, 'CC0-1.0', 'SPDX document must carry the required data license');
  assert.ok(Array.isArray(sbom.packages) && sbom.packages.length >= 1, 'SBOM must contain at least the EVO root package');
  const rootPackage = sbom.packages.find((entry) => entry.name === pkg.name);
  assert.ok(rootPackage, 'SBOM must include EVO Protocol root package');
  assert.equal(rootPackage.versionInfo, pkg.version, 'SBOM root package version must match release version');
}

console.log('EVO V4.6 supply-chain lockfile/SBOM checks passed');
