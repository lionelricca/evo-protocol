'use strict';

const fs=require('fs');
const assert=require('assert');

const source=fs.readFileSync('v1/document-proof-v30.js','utf8');
const css=fs.readFileSync('v1/document-proof-v30.css','utf8');

assert(source.includes("type.value==='Documento'"),'Document Proof mode must be limited to document assets');
assert(source.includes('file.required=doc'),'Document Proof must require an original document');
assert(source.includes("crypto.subtle.digest('SHA-256'"),'Document Proof must calculate SHA-256 locally');
assert(source.includes('El original no se sube'),'UI must state that the original is not uploaded');
assert(source.includes('Crear Document Proof'),'Document mode needs a dedicated creation action');
assert(source.includes('Referencia / número de documento'),'Document mode needs a document reference field');
assert(source.includes('esc(f.name)'),'local file names must be escaped before HTML rendering');
assert(!source.includes('fetch('),'The Document Proof enhancer must not upload the selected original');
assert(css.includes('.documentHashPreview'),'Document hash preview must be styled');

console.log('EVO V3.0 Document Proof UI checks passed');
