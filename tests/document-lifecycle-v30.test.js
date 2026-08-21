'use strict';

const fs=require('fs');
const assert=require('assert');

const client=fs.readFileSync('v1/document-lifecycle-v30.js','utf8');
const management=fs.readFileSync('v1/document-management-v30.js','utf8');
const managementCss=fs.readFileSync('v1/document-management-v30.css','utf8');
const loader=fs.readFileSync('v1/organization-simple.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260821203000_add_document_proof_lifecycle.sql','utf8');
const edge=fs.readFileSync('supabase/functions/evo-document-lifecycle/index.ts','utf8');

assert(migration.includes('evo_document_events_one_terminal_idx'),'database must enforce a single terminal lifecycle event');
assert(migration.includes('grant select on table public.evo_document_events to anon, authenticated'),'public access must remain read-only');
assert(migration.includes('revoke all on table public.evo_document_events from anon, authenticated'),'direct writes must not be granted to public roles');
assert(edge.includes('issuer_signature_required'),'only original issuer may change document lifecycle');
assert(edge.includes('replacement_is_not_current'),'supersede target must itself be current');
assert(edge.includes('MAX_BODY_BYTES'),'lifecycle endpoint must cap request size');
assert(edge.includes('verifyMessage'),'wallet signature must be cryptographically verified');
assert(edge.includes('document_lifecycle_conflict'),'race-condition conflicts must fail closed');

assert(client.includes("DOCUMENT_REVOKED"),'client must understand revoked state');
assert(client.includes("DOCUMENT_SUPERSEDED"),'client must understand superseded state');
assert(client.includes("EVO · DOCUMENT PROOF"),'public view must identify Document Proof explicitly');
assert(client.includes("label==='propietario actual'||label==='current owner'"),'document public view must hide physical ownership language');
assert(client.includes('Esto no certifica por sí solo'),'public copy must avoid claiming content truth or legal validity');
assert(client.includes('dataset.renderKey'),'public lifecycle rendering must be idempotent');

assert(management.includes("eventType:'DOCUMENT_REVOKED'"),'issuer management must support revocation');
assert(management.includes("eventType:'DOCUMENT_SUPERSEDED'"),'issuer management must support version replacement');
assert(management.includes("replace(/[&<>\"']/g"),'management-rendered user data must be HTML-escaped');
assert(managementCss.includes('#passport.evoDocumentManageMode>.grid'),'document management must replace asset event/transfer UI');
assert(loader.includes('document-proof-v30.js?v=20260821-v30-document-proof'),'Document Proof UI must be versioned in loader');
assert(loader.includes('document-lifecycle-v30.js?v=20260821-v30-document-lifecycle'),'Document lifecycle must be versioned in loader');
assert(loader.includes('document-management-v30.js?v=20260821-v30-document-management'),'Document management must be versioned in loader');

console.log('EVO V3.0 Document Proof lifecycle checks passed');
