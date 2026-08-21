'use strict';

const fs=require('fs');
const assert=require('assert');

const source=fs.readFileSync('v1/document-proof-v30.js','utf8');
const css=fs.readFileSync('v1/document-proof-v30.css','utf8');

assert(source.includes("const currentLanguage=()=>language?.value==='en'?'en':'es'"),'Document Proof must use EVO language selector as source of truth');
assert(source.includes('while(label.firstChild&&label.firstChild!==control)label.removeChild(label.firstChild)'),'field captions must remove browser-translation wrappers before the control');
assert(source.includes("label.setAttribute('translate','no')"),'Document Proof labels must resist external browser translation conflicts');
assert(source.includes("setFieldCaption('type',t('Tipo de Proof','Proof type'))"),'Document Proof must not keep generic Asset type caption');
assert(source.includes("setFieldCaption('title',t('Nombre del documento','Document name'))"),'Document title must have one dedicated caption');
assert(source.includes('renderDocumentResultPanel'),'Document mode must customize the result panel');
assert(source.includes('Qué demuestra EVO'),'Document result panel must explain proof semantics');
assert(source.includes('Estado verificable:'),'Document result panel must explain lifecycle state');
assert(source.includes('Original privado:'),'Document result panel must explain original-file privacy');
assert(css.includes('.documentFieldCaption'),'dedicated field captions must be styled');
assert(css.includes('.documentProofResultPanel'),'Document Proof result panel must have a dedicated presentation');

console.log('EVO V3.0.1 Document Proof i18n/UI checks passed');
