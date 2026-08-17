# EVO ISMS Scope — Draft V0.1

Target standard: ISO/IEC 27001:2022

## Scope statement

The EVO Information Security Management System (ISMS) covers the design, development, deployment, operation and support of the EVO Protocol cloud software used to create, store, process, verify and maintain Digital Product Passport records, product identity evidence, lifecycle events, continuity proofs and related trust services.

## In-scope services

- EVO Seal
- EVO Battery Passport / DPP services
- Issuer Trust
- EVO Passport lifecycle records
- ownership transfer workflow
- EVO Pulse
- EVO Challenge
- Reality Evidence Root
- Proof of Continuity
- EVO AI Guardian
- future secure NFC verification and provisioning services
- public verification APIs and web interfaces

## In-scope information

- product and battery passport data
- issuer/account identifiers
- cryptographic signatures and public wallet addresses
- hashes and evidence roots
- lifecycle and ownership records
- service configuration
- operational logs
- security logs
- customer configuration and integration metadata
- future secure NFC provisioning metadata

Cryptographic secret keys for secure physical tags, if introduced, require a stricter dedicated key-management boundary and must never be stored in public repositories or browser clients.

## In-scope technology

- source-code repositories
- cloud database and serverless functions
- deployment environments
- DNS/domains used by EVO
- CI/CD systems
- administrator endpoints and credentials
- third-party infrastructure required to deliver EVO services

## In-scope people and roles

- EVO owners/management
- software developers
- system administrators
- security administrators
- support personnel with access to customer or operational data
- approved contractors with in-scope access

## Initial physical boundary

EVO is operated primarily as a cloud-based service. The ISMS therefore treats cloud infrastructure, administrator workstations and approved remote-access processes as security boundaries rather than relying on a single physical office perimeter.

## Interfaces and dependencies

Key dependencies may include:

- GitHub
- Supabase
- domain/DNS providers
- wallet providers used for customer-side signatures
- future GS1/DPP registry integrations
- future NFC hardware and key-management providers
- external certification/audit providers

Each material supplier must be assessed through the supplier-risk process.

## Exclusions

The following are not claimed as controlled by EVO unless explicitly contracted and documented:

- security of a customer's own ERP or internal systems
- truthfulness of data supplied by customers
- customer wallet private-key custody
- physical authenticity of products without an approved secure physical binding mechanism
- third-party systems beyond EVO's contractual/control boundary

Exclusions must never be used to avoid controls for risks EVO actually owns.

## Security objectives

The ISMS shall protect:

- confidentiality of restricted customer and operational information;
- integrity of DPP, lifecycle and continuity records;
- availability of public verification and customer services;
- authenticity of security-sensitive administrative actions;
- traceability of changes to critical systems;
- resilience against unauthorized modification, replay, credential theft and supply-chain compromise.

## Review

This scope must be reviewed at least annually and whenever EVO materially changes its product architecture, legal entity, hosting model, physical-proof infrastructure or regulated-market responsibilities.
