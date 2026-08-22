import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import crypto from 'node:crypto';

const root=path.resolve('.');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function walk(dir){
  const files=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())files.push(...walk(full));
    else files.push(full);
  }
  return files;
}
function containsRecoverySecretRequest(text){
  return /(?:seed phrase|mnemonic|private key|recovery phrase).{0,120}(?:input|prompt|textarea|placeholder)/is.test(text)
    || /(?:input|prompt|textarea|placeholder).{0,120}(?:seed phrase|mnemonic|private key|recovery phrase)/is.test(text);
}

(async()=>{
  const classifier=await import(path.join(root,'standards','trust-authority-v330.mjs'));
  const expected={
    PUBLIC_OBSERVATION:0,
    PUBLIC_SOFTWARE_FRESHNESS:0,
    WALLET_SIGNATURE:20,
    PROVIDER_COUNTERSIGNATURE:35,
    DOMAIN_CONTROL:45,
    ORGANIZATION_VERIFICATION:65,
    EXTERNAL_VALIDATED_EVIDENCE:75,
    REGULATED_TRUST_SERVICE:90,
    PHYSICAL_CRYPTO_PROOF:95,
  };
  assert.deepStrictEqual(classifier.ASSURANCE_WEIGHTS,expected,'trust authority weights changed unexpectedly');
  assert.strictEqual(classifier.authorityWeight('PUBLIC_OBSERVATION'),0,'public observations cannot increase authority');
  assert.strictEqual(classifier.authorityWeight('PUBLIC_SOFTWARE_FRESHNESS'),0,'public software freshness cannot increase authority');
  assert.strictEqual(classifier.classifyAuthority({pulse:true,challenge:true}).level,0,'public telemetry alone cannot create authority');
  assert.strictEqual(classifier.classifyAuthority({walletSignature:true}).level,1,'wallet proof should create wallet-level authority');
  assert(classifier.classifyAuthority({organizationVerified:true}).level>=3,'verified organization should be stronger authority');

  const guardian=read('supabase/functions/evo-ai-guardian/index.ts');
  assert(guardian.includes('publicTelemetryAuthoritative:false'),'Guardian must explicitly mark public telemetry non-authoritative');
  assert(!/confidence\s*\+=\s*[^;]*(?:pulse|challenge)/i.test(guardian),'Guardian must not award confidence for Pulse/Challenge');
  assert(guardian.includes('.order("registered_at",{ascending:false})'),'Guardian Passport history query must be latest-first');
  assert(guardian.includes('.eq("event_type","TRANSFERRED")'),'Guardian must resolve current owner independently from the capped event history');
  assert(guardian.includes('MAX_EVENTS=300'),'Guardian event query bound missing');
  assert(guardian.includes('MAX_PULSES_ANALYZED=1500'),'Guardian pulse analysis bound missing');
  assert(guardian.includes('MAX_CHALLENGE_ATTEMPTS=750'),'Guardian challenge analysis bound missing');
  assert(guardian.includes('MAX_SERVICE_PROOFS=300'),'Guardian Service Proof query bound missing');

  const guardianV04=read('supabase/functions/evo-ai-guardian-v04/index.ts');
  assert(guardianV04.includes('authorityRoot'),'Guardian V0.4 must expose Authority Root');
  assert(guardianV04.includes('realityRoot'),'Guardian V0.4 must keep Reality Root separate');
  assert(guardianV04.includes('publicTelemetryAuthoritative:false'),'Guardian V0.4 must preserve public telemetry zero-authority rule');

  const challenge=read('supabase/functions/evo-challenge/index.ts');
  assert(challenge.includes('MAX_BODY_BYTES'),'Challenge must have a request body cap');
  assert(challenge.includes('pending_reused'),'Challenge issue path must reuse an existing live challenge');
  assert(challenge.includes('issue_rate_limited'),'Challenge issue path must throttle repeated issuance');
  assert(challenge.includes('MAX_ATTEMPTS'),'Challenge must bound repeated answers');
  assert(challenge.includes('OBSERVATIONAL_ONLY'),'Challenge response must state its limited authority meaning');

  const pulse=read('supabase/functions/evo-pulse/index.ts');
  assert(pulse.includes('PUBLIC_OBSERVATION'),'Pulse must be explicitly classified as a public observation');
  assert(pulse.includes('authoritative:false'),'Pulse must state it is not authoritative');

  const passportEvent=read('supabase/functions/register-evo-passport-event/index.ts');
  assert(passportEvent.includes('evo_register_passport_event_authoritative'),'Passport owner mutations must cross the authoritative DB boundary');
  assert(passportEvent.includes('atomicAuthority:true'),'Passport owner mutation response must expose atomic authority semantics');

  const workflow=read('.github/workflows/evo-security-gate.yml');
  assert(workflow.includes('node-version: \'24\''),'Security Gate must use Node 24');
  assert(workflow.includes('persist-credentials: false'),'Security Gate checkout credentials must not persist');
  assert(workflow.includes('ON_ERROR_STOP=1'),'psql tests must fail closed on SQL errors');

  const indexHtml=read('v1/index.html');
  assert(indexHtml.includes('Content-Security-Policy'),'browser entrypoint must define a CSP baseline');
  assert(indexHtml.includes("script-src-attr 'none'"),'CSP must block inline script attributes');
  assert(indexHtml.includes("object-src 'none'"),'CSP must block plugin/object content');
  assert(indexHtml.includes("base-uri 'none'"),'CSP must block base-tag rewriting');
  assert(!indexHtml.includes('cdn.jsdelivr.net'),'retired QR CDN must not remain in the browser entrypoint or CSP');

  const browserShield=read('v1/security-bootstrap-v331.js');
  assert(browserShield.includes('EVO-BROWSER-SHIELD-V3.3.1'),'browser shield must expose its security baseline');
  assert(browserShield.includes('securitypolicyviolation'),'browser shield must surface CSP violations for diagnostics');
  assert(browserShield.includes("rel.add('noopener')"),'blank-target links must receive noopener');
  assert(browserShield.includes("rel.add('noreferrer')"),'blank-target links must receive noreferrer');
  assert(browserShield.includes('inlineScriptAttributesAllowed: false'),'browser shield must declare inline script attributes disabled');
  assert(browserShield.includes('publicTelemetryAuthoritative: false'),'browser shield must preserve the zero-authority telemetry rule');

  const checkout=read('v1/checkout.js');
  assert(checkout.includes('https://sdk.depay.com/widgets/v13.0.45.js'),'DePay runtime must remain exact-version pinned while external loading is still required');

  const frontendFiles=walk(path.join(root,'v1')).filter(file=>/\.(?:js|html|css)$/i.test(file));
  for(const file of frontendFiles){
    const text=fs.readFileSync(file,'utf8');
    assert(!text.includes('SUPABASE_SERVICE_ROLE_KEY'),`service role secret reference must never appear in frontend: ${path.relative(root,file)}`);
    assert(!/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/.test(text),`private key material detected in frontend: ${path.relative(root,file)}`);
    assert(!containsRecoverySecretRequest(text),`frontend appears to request a recovery secret: ${path.relative(root,file)}`);
  }

  const edgeRoot=path.join(root,'supabase','functions');
  if(fs.existsSync(edgeRoot)){
    // Only function entrypoints must own HTTP request-body bounds. Shared modules such as
    // _shared/evo-cors.ts do not read request bodies and must not be forced to duplicate
    // endpoint-specific payload controls merely because they are TypeScript modules.
    const edgeFiles=walk(edgeRoot).filter(file=>path.basename(file)==='index.ts');
    for(const file of edgeFiles){
      const text=fs.readFileSync(file,'utf8');
      assert(!/supabase-js@2["']/i.test(text),`unpinned supabase-js major import: ${path.relative(root,file)}`);
      assert(!/viem@2["']/i.test(text),`unpinned viem major import: ${path.relative(root,file)}`);
      assert(/payload_too_large|request_too_large/.test(text),`Edge Function lacks explicit body-size rejection: ${path.relative(root,file)}`);
    }
  }

  const workflowRoot=path.join(root,'.github','workflows');
  if(fs.existsSync(workflowRoot)){
    const workflowFiles=walk(workflowRoot).filter(file=>/\.ya?ml$/i.test(file));
    for(const file of workflowFiles){
      const text=fs.readFileSync(file,'utf8');
      const actionUses=[...text.matchAll(/^\s*uses:\s*(actions\/[\w-]+)@([^\s#]+)/gm)];
      for(const match of actionUses){
        assert(/^[0-9a-f]{40}$/i.test(match[2]),`GitHub Action is not pinned to an immutable commit: ${path.relative(root,file)} -> ${match[0].trim()}`);
      }
      if(/uses:\s*actions\/checkout@/i.test(text))assert(/persist-credentials:\s*false/i.test(text),`checkout credentials must not persist in read-only CI: ${path.relative(root,file)}`);
    }
  }

  console.log('EVO V3.3.18 security hardening checks passed');
})().catch(error=>{console.error(error);process.exit(1)});
