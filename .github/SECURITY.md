# EVO Protocol Security Policy

Security reports are welcome. Please avoid publishing exploit details, credentials, private keys, seed phrases, customer data or other sensitive evidence in public issues.

## Supported line

The actively maintained security baseline is the current V4 release line on `main`. Historical development branches, retired `/rc/` surfaces and experimental token work are not separate supported products.

When reporting an issue, identify the exact commit, release version or deployed component whenever possible.

## How to report a vulnerability

### Preferred: GitHub private vulnerability reporting

If this repository shows **Report a vulnerability** under its Security section, use that private channel. Include enough information to reproduce and assess the issue without including unrelated secrets or third-party data.

### If the private reporting control is unavailable

Do **not** publish the vulnerability details in a public issue.

Open a minimal public issue titled `Security contact request` containing only:

- the affected EVO component or surface;
- a statement that you have security information to share privately;
- your preferred safe contact method, if you choose to provide one.

Do not include payloads, credentials, exploit steps, private data or screenshots containing secrets. The project owner can then establish a private disclosure channel.

## Useful report contents

A high-quality private report should include, where relevant:

- affected component and version/commit;
- security impact;
- prerequisites;
- minimal reproduction steps;
- expected versus observed behavior;
- whether the issue is reproducible against production, a test environment or source only;
- suggested remediation, if known.

For NFC issues, never send production AES keys through a public GitHub surface. Redacted tag IDs, counters and non-secret protocol evidence are preferable.

For wallet/payment issues, never send seed phrases or private keys. Use public transaction identifiers only when disclosure is safe and relevant.

## Coordinated disclosure

Please allow reasonable time for triage and remediation before public disclosure. EVO will distinguish confirmed vulnerabilities from product limitations or unsupported claims and will preserve an auditable fix path when remediation is required.

No fixed response-time SLA is promised by this open-source repository policy.

## Research boundaries

Good-faith testing should avoid:

- accessing or modifying data that does not belong to the researcher;
- denial of service or resource exhaustion;
- social engineering;
- physical intrusion;
- destructive changes to production records;
- extraction or publication of secrets;
- moving funds or consuming paid/free entitlements without authorization.

Use test data and the smallest safe proof needed to demonstrate the finding.

## Product-security claim boundary

EVO uses defense-in-depth controls and automated security gates. This policy does not claim that EVO is unhackable, 100% secure, independently penetration-tested, ISO-certified, a QTSP or otherwise certified unless separate current evidence supports that exact statement.

The internal engineering rules and release gates are documented in `docs/SECURITY.md`.
