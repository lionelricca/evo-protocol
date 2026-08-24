'use strict';

const fs=require('fs');
const assert=require('assert');

const verifier=fs.readFileSync('v1/origin-verifier-v322.js','utf8');
const css=fs.readFileSync('v1/origin-verifier-v322.css','utf8');
const proof=fs.readFileSync('v1/document-proof-v30.js','utf8');

assert(verifier.includes("crypto.subtle.digest('SHA-256',bytes)"),'Verifier must calculate SHA-256 locally');
assert(verifier.includes('file.arrayBuffer()'),'Verifier must read the selected local file in-browser');
assert(!verifier.includes('FormData'),'Verifier must not package the selected file for upload');
assert(verifier.includes("String(seal.asset_type||'').toLowerCase()!=='documento'"),'Premium verifier must be limited to Document Proof records');
assert(verifier.includes('✓ COINCIDENCIA EXACTA'),'Spanish UI must expose an exact-file match state');
assert(verifier.includes('✓ EXACT FILE MATCH'),'English UI must expose an exact-file match state');
assert(verifier.includes('✕ FILE DOES NOT MATCH'),'Mismatch state must be explicit');
assert(verifier.includes('✓ ANOTHER EVO VERSION'),'Verifier must distinguish a different known EVO version from an unknown mismatch');
assert(verifier.includes("related_seal_id',`eq.${sealId}`"),'Verifier must discover predecessor versions through supersession links');
assert(verifier.includes("event.event_type==='DOCUMENT_SUPERSEDED'"),'Verifier must follow newer versions through lifecycle events');
assert(verifier.includes('sameIssuer(candidate,root)'),'Version-chain matches must remain bound to the same issuer wallet');
assert(verifier.includes('100% LOCAL · NO SE SUBE'),'UI must state that file comparison is local');
assert(verifier.includes('El archivo no se envía al servidor.'),'Privacy explanation must be explicit');
assert(css.includes('.originVerifierDrop'),'Verifier must have an isolated drag-and-drop style');
assert(css.includes('.originVerifierResult.is-match'),'Verifier must visually distinguish successful matches');
assert(proof.includes('origin-verifier-v322.js?v=20260821-v322-origin-verifier'),'Document Proof loader must load the immutable V3.2.2 verifier script');
assert(proof.includes('origin-verifier-v322.css?v=20260821-v322-origin-verifier'),'Document Proof loader must load the immutable V3.2.2 verifier styles');

console.log('EVO V3.2.2 Origin verifier checks passed');
