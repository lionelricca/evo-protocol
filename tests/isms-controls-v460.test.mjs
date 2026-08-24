import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const required = [
  'docs/isms/ISMS_SCOPE.md',
  'docs/isms/INFORMATION_SECURITY_POLICY.md',
  'docs/isms/RISK_REGISTER.md',
  'docs/isms/INCIDENT_RESPONSE.md',
  'docs/isms/ACCESS_AND_SECRET_MANAGEMENT.md',
  'docs/isms/BACKUP_AND_CONTINUITY.md',
  'docs/isms/VULNERABILITY_MANAGEMENT.md',
  'docs/isms/SUPPLIER_SECURITY.md',
  'docs/isms/CONTROL_EVIDENCE_INDEX.md',
  '.github/SECURITY.md',
];

for (const relative of required) {
  assert.ok(fs.existsSync(path.join(root, relative)), `${relative} must exist`);
  assert.ok(read(relative).trim().length > 300, `${relative} must contain substantive control content`);
}

const incident = read('docs/isms/INCIDENT_RESPONSE.md');
assert.match(incident, /SEV-1 — Critical/);
assert.match(incident, /Preserve evidence|preserve evidence/i);
assert.match(incident, /post-incident review/i);
assert.match(incident, /Never request seed phrases|Never request seed phrase/i);
assert.match(incident, /physicalPilotApproved/);

const access = read('docs/isms/ACCESS_AND_SECRET_MANAGEMENT.md');
assert.match(access, /least privilege/i);
assert.match(access, /MFA/);
assert.match(access, /RESTRICTED/);
assert.match(access, /never be committed to GitHub/i);
assert.match(access, /per-tag|diversified/i);
assert.match(access, /seed phrase/i);

const continuity = read('docs/isms/BACKUP_AND_CONTINUITY.md');
assert.match(continuity, /RPO/);
assert.match(continuity, /RTO/);
assert.match(continuity, /restore exercise/i);
assert.match(continuity, /not customer SLA/i);
assert.match(continuity, /evo_accept_nfc_counter/);

const vulnerabilities = read('docs/isms/VULNERABILITY_MANAGEMENT.md');
assert.match(vulnerabilities, /Critical/);
assert.match(vulnerabilities, /risk-accepted/i);
assert.match(vulnerabilities, /independent penetration|independent pentest/i);
assert.match(vulnerabilities, /unprotected `main` branch/i);
assert.match(vulnerabilities, /SBOM/);

const suppliers = read('docs/isms/SUPPLIER_SECURITY.md');
assert.match(suppliers, /material supplier/i);
assert.match(suppliers, /exit|recovery/i);
assert.match(suppliers, /GitHub/);
assert.match(suppliers, /Supabase/);
assert.match(suppliers, /NFC/);
assert.match(suppliers, /does not make EVO ISO-certified/i);

const index = read('docs/isms/CONTROL_EVIDENCE_INDEX.md');
assert.match(index, /not.*Statement of Applicability/i);
assert.match(index, /E0 — Planned/);
assert.match(index, /E4 — Independently assured/);
assert.match(index, /GitHub `main` branch\/ruleset protection remains disabled/);
assert.match(index, /physical.*pilot pending/i);
assert.match(index, /paid purchase/i);
assert.match(index, /Independent pentest\/security review pending/);
assert.match(index, /Stage 1\/Stage 2 certification pending/);

const disclosure = read('.github/SECURITY.md');
assert.match(disclosure, /vulnerabilit/i);
assert.doesNotMatch(disclosure, /we are ISO[- ]certified/i);
assert.match(
  disclosure,
  /does not claim that EVO is unhackable, 100% secure, independently penetration-tested, ISO-certified/i,
  'public disclosure policy must preserve the explicit unsupported-claim disclaimer',
);

function assertNoAffirmativeAbsoluteSecurityClaim(relative, content) {
  const forbiddenTerms = /\bunhackable\b|\bhacker-proof\b|\b100% secure\b/i;
  const disclaimerContext = /does not claim|do not claim|must not claim|must not describe|not allowed|prohibit|unsupported claim|claims prohibited|cannot claim/i;

  for (const line of content.split(/\r?\n/)) {
    if (!forbiddenTerms.test(line)) continue;
    assert.match(
      line,
      disclaimerContext,
      `${relative} may mention absolute-security wording only inside an explicit prohibition/disclaimer`,
    );
  }
}

for (const relative of required) {
  const content = read(relative);
  assert.doesNotMatch(content, /EVO is ISO[-/ ]?IEC 27001 certified/i, `${relative} must not claim ISO certification`);
  assertNoAffirmativeAbsoluteSecurityClaim(relative, content);
}

console.log('EVO V4.6 ISMS operational-control checks passed');
