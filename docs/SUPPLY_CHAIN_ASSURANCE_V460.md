# EVO V4.6 · Supply-Chain Assurance

Status: **npm dependency SBOM automated / source and vendored-asset inventory still separately governed**

## Purpose

EVO V4.6 generates a machine-readable dependency SBOM on every pull request and on every push to `main`.

The dedicated `EVO SBOM checks` workflow:

1. checks out the candidate source without persisting GitHub credentials;
2. uses the pinned Node setup action already used by the release gates;
3. validates `package-lock.json` against `package.json`;
4. generates an SPDX 2.3 document using the native npm SBOM command;
5. validates the SBOM structure and EVO release version;
6. produces a SHA-256 digest of the SBOM;
7. uploads the SBOM and its digest as CI evidence.

## Evidence files

The workflow produces:

- `EVO_SBOM.spdx.json`;
- `EVO_SBOM.spdx.json.sha256`.

The artifact retention period is 30 days.

## Current package graph

The V4.6 root npm package intentionally has no installed runtime npm dependencies. The lockfile therefore records the EVO root package and its Node baseline without inventing third-party packages that are not installed through npm.

This is still useful evidence because future npm dependency additions will change the lockfile and automatically enter the generated SBOM.

## Scope boundary

The npm SBOM is **not** a complete inventory of every executable or external component used by EVO.

In particular, it does not by itself enumerate:

- vendored browser JavaScript committed directly to the repository;
- GitHub Actions themselves;
- Supabase-managed platform/runtime components;
- browser wallet providers;
- external blockchain infrastructure;
- independently hosted standards or APIs.

Those components remain covered by source review, pinned-action checks, vendoring controls, deployment inventory and supplier/security governance.

EVO must not describe the npm SBOM as a complete product bill of materials until those additional component classes are incorporated into a broader inventory.

## Release rule

A release is supply-chain inconsistent if any of these occur:

- `package.json` and `package-lock.json` versions differ;
- the Node engine baseline differs between package and lockfile;
- SBOM generation fails;
- the output is not valid SPDX 2.3 JSON;
- the EVO root package/version is absent;
- the SBOM SHA-256 file is not produced.

## Certification relevance

This evidence supports software-asset inventory, dependency governance and auditability work for the ISO/IEC 27001 readiness program. It is an engineering evidence artifact, not an ISO certification or an independent security assessment.

The next supply-chain assurance step, if required by an enterprise customer or auditor, is a broader component inventory covering vendored browser assets, hosted services, CI actions and critical external providers.
