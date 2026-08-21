'use strict';

const fs=require('fs');
const assert=require('assert');

const inbox=fs.readFileSync('v1/service-provider-inbox-v313.js','utf8');
const css=fs.readFileSync('v1/service-provider-inbox-v313.css','utf8');
const trust=fs.readFileSync('v1/service-proof-v312-trust.js','utf8');

assert(inbox.includes("provider_wallet',`eq.${wallet}`"),'Provider inbox must query rows designated to the connected wallet');
assert(inbox.includes("evidence_level','eq.OWNER_DECLARED'"),'Provider inbox must show only proofs still waiting for a second signature');
assert(inbox.includes("status','eq.ACTIVE'"),'Provider inbox must ignore inactive proofs');
assert(inbox.includes('Review & countersign'),'Inbox must offer a direct countersign action');
assert(inbox.includes("url.searchParams.set('serviceProof',proofId)"),'Inbox must build a portable countersign URL');
assert(inbox.includes("document.getElementById('myEvo')"),'Inbox must live inside My EVO');
assert(css.includes('.evoProviderInbox'),'Provider inbox must have isolated styling');
assert(trust.includes('service-provider-inbox-v313.js?v=20260821-v313-provider-inbox'),'Trust layer must load V3.1.3 with an immutable cache key');
assert(trust.includes('service-provider-inbox-v313.css?v=20260821-v313-provider-inbox'),'Trust layer must load V3.1.3 styles with an immutable cache key');

console.log('EVO V3.1.3 provider inbox checks passed');
