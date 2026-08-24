'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const readme=read('README.md');
const truth=read('docs/PROJECT_TRUTH_V400.md');
const checklist=read('docs/RELEASE_CHECKLIST_V400.md');
const index=read('v1/index.html');
const app=read('v1/app.js');
const connector=read('v1/wallet-autoconnect.js');
const proof=read('v1/document-proof-v30.js');
const provenance=read('standards/document-provenance-v321.mjs');
const provenanceSchema=read('schemas/document-provenance-v1.schema.json');
const vcExport=read('standards/evo-vc-dm-export-v400.mjs');
const vcSchema=read('schemas/evo-vc-dm-export-v400.schema.json');
const i18n=read('v1/i18n-v275.js');
const nfc=read('standards/evo-nfc-proof-v411.mjs');
const nfcSchema=read('schemas/evo-nfc-proof-v1.schema.json');

assert(readme.startsWith('# EVO Protocol'),'umbrella brand must be EVO Protocol');
assert(readme.includes('Current stage: V4.1 Development Line'),'README must expose the current V4.1 development stage');
assert(readme.includes('V4.0 RC1 was promoted to `main`'),'README must preserve the promoted V4 baseline');
assert(!readme.includes('Current stage: V1.5'),'stale V1.5 stage must stay removed');
assert(!readme.includes('Creating trust may consume EVO'),'current commercial trust model must not depend on token consumption');
assert(readme.includes('There is **no active US$39/month company subscription'),'inactive company-plan reference must be explicitly corrected');
assert(readme.includes('historical EVO token experiment is **not required'),'legacy token must be separated from current purchases');
assert(readme.includes('EVO Origin'),'commercial focus must name EVO Origin');
assert(/B2B|industrial/i.test(readme),'commercial focus must retain industrial/B2B scope');
assert(/technical and quality documentation|document provenance|technical-document/i.test(readme),'commercial wedge must remain document provenance');
assert(/one benefit per eligible user/i.test(readme),'Free Proof policy must remain user-eligibility based');

assert(index.includes('<title>EVO Protocol · Verificación documental y pasaportes digitales</title>'),'browser title must use EVO Protocol');
assert(index.includes('ORIGIN · PROOF · PASSPORT · VERIFY'),'hero must lead with Origin');
assert(index.includes('Verificá documentos. Conservá evidencia.'),'hero must communicate the document-provenance wedge');
assert(!index.includes('<h1>EVO <span>TRUST LAYER</span></h1>'),'stale ambiguous hero brand must stay removed');
assert(!index.includes('<h2>El pasaporte digital de cada activo</h2>'),'asset-passport-only positioning must stay removed');
assert(index.includes('US$9,90')&&index.includes('US$49'),'implemented pilot prices must remain visible');
assert(!index.includes('US$39'),'inactive monthly company plan must not appear in the browser entrypoint');
assert(index.includes('1 EVO Proof · US$9,90'),'payment recovery must use Proof terminology');
assert(index.includes('1 por usuario elegible'),'default Free Proof surface must use eligible-user language');
assert(!index.includes('1 por wallet'),'default V4.1 surface must not market Free Proof per wallet');
const documentOption=index.indexOf('<option value="Documento">Informe / documento</option>');
const productOption=index.indexOf('<option value="Producto">Equipo / producto</option>');
assert(documentOption>=0&&productOption>=0&&documentOption<productOption,'Origin/document mode must be the default first creation path');
assert(!index.includes('id="guardian"'),'advanced Guardian panel must not ship on the default commercial surface');
assert(!index.includes('./guardian.js'),'default commercial surface must not execute Guardian analysis');
assert(!index.includes('./guardian-v04.js'),'default commercial surface must not activate Guardian authority UI or Battery DPP loader');
assert(!index.includes('./guardian.css'),'default commercial surface must not load dormant Guardian presentation');
assert(!index.includes('./pulse.js'),'default commercial surface must not emit background EVO Pulse observations');
assert(!index.includes('Security Gate'),'internal release terminology must not appear in the customer entrypoint');
assert(!index.includes('Battery DPP'),'advanced Battery DPP terminology must not appear in the customer entrypoint');

assert(proof.includes('origin-verifier-v322.js?v=20260821-v322-origin-verifier'),'Origin exact-file verifier must be activated');
assert(proof.includes('origin-authority-v323.js?v=20260821-v323-origin-authority'),'Origin issuer authority must be activated');
assert(i18n.includes('ensureOriginDocumentModules'),'V4 runtime must activate the consolidated Origin document modules');
assert(provenance.includes('provesContentTruth:false'),'provenance must not claim factual truth');
assert(provenance.includes('provesLegalOriginality:false'),'provenance must not claim legal originality');
assert(provenanceSchema.includes('"provesLegalOriginality": {"const": false}'),'schema must encode legal-originality boundary');
assert(!provenanceSchema.includes('evo.example'),'public provenance schema must use no placeholder domain');

assert(vcExport.includes("secured:false"),'VC interoperability export must be explicitly unsecured');
assert(vcExport.includes("status:'UNSECURED_EXPORT'"),'VC interoperability status must be explicit');
assert(vcExport.includes('credential_not_cryptographically_secured'),'secured-credential boundary must fail closed');
assert(!vcExport.includes('evo.example')&&!vcSchema.includes('evo.example'),'VC release files must use no placeholder EVO domain');
assert(!vcExport.includes('proof:{'),'unsecured VC export must not fabricate a proof');

assert(nfc.includes("EVO_NFC_TRUSTED_VERIFIER='SERVER_SIDE_NTAG424'"),'NFC evidence must require the trusted server-side verifier mode');
assert(nfc.includes('physicalAuthenticity:false'),'NFC public evidence must preserve the physical-authenticity claim boundary');
assert(nfc.includes("addRisk(risks,'REPLAY_DETECTED')"),'NFC contract must reject replayed proof decisions');
assert(nfc.includes("addRisk(risks,'MAC_INVALID')"),'NFC contract must reject invalid cryptographic decisions');
assert(nfcSchema.includes('"physicalAuthenticity": { "const": false }'),'NFC schema must make the physical-authenticity boundary machine-readable');
assert(!nfcSchema.includes('aesKey')&&!nfcSchema.includes('masterKey'),'public NFC schema must expose no key fields');

// Security Gate already executes this product-truth test, so the behavioral NFC
// boundary becomes mandatory without modifying the long PostgreSQL gate workflow.
execFileSync(process.execPath,[path.join(root,'tests','nfc-proof-v411.test.mjs')],{stdio:'inherit'});

assert(!app.includes('0x622b09038bc1ae90ee13a35ba5756b931d9dcc9f'),'legacy EVO token contract must not remain coupled to the V4 browser client');
assert(!app.includes("x.fillText('EVO VERIFIED'"),'printable evidence must not use a generic VERIFIED claim');
assert(app.includes("x.fillText('EVO PROOF'"),'printable evidence must identify itself as an EVO Proof');
assert(connector.includes('EPHEMERAL')||connector.includes('ephemeral'),'wallet connector must make unsigned identity resolution ephemeral');
assert(connector.includes('persisted'),'wallet UX must distinguish persistent from provisional identity');
assert(connector.includes('SIGNED/PROVEN ACTION ONLY'),'persistent identity must be tied to signed/proven action semantics');

assert(i18n.includes("'Verificá documentos. Conservá evidencia.':'Verify documents. Preserve evidence.'"),'new hero must be bilingual');
assert(truth.includes('EVO Pulse and the public SOFTWARE Challenge are observational'),'project truth must preserve telemetry authority rule');
assert(checklist.includes('Protect `main`'),'release checklist must keep branch protection as a gate');

function walk(target){
  const absolute=path.join(root,target);
  const stat=fs.statSync(absolute);
  if(stat.isFile())return [absolute];
  return fs.readdirSync(absolute,{withFileTypes:true}).flatMap(entry=>walk(path.join(target,entry.name)));
}

const browserFiles=walk('v1').filter(file=>/\.(?:html|js|css)$/i.test(file));
for(const file of browserFiles){
  const text=fs.readFileSync(file,'utf8');
  assert(!text.includes('0x622b09038bc1ae90ee13a35ba5756b931d9dcc9f'),`legacy EVO token contract found in browser code: ${path.relative(root,file)}`);
  assert(!/US\$\s*39(?:[,.]00)?(?:\s*\/\s*mes|\s*\/\s*month|\s+monthly)?/i.test(text),`inactive US$39 company plan found in browser code: ${path.relative(root,file)}`);
}

const scanRoots=['README.md','docs','v1','standards','schemas','contexts'];
const forbidden=[/Alexis Paredes/i,/evoprotocol\.io/i];
for(const file of scanRoots.flatMap(walk)){
  if(!/\.(?:md|html|js|mjs|json|css|jsonld)$/i.test(file))continue;
  const text=fs.readFileSync(file,'utf8');
  for(const pattern of forbidden)assert(!pattern.test(text),`unsupported historical identity/domain found in ${path.relative(root,file)}`);
}

console.log('EVO V4.1.1 product-truth + NFC boundary checks passed');
