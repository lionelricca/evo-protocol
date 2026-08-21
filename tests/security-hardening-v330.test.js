const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');

const root=path.resolve(__dirname,'..');

function read(rel){return fs.readFileSync(path.join(root,rel),'utf8')}
function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(full));else out.push(full);
  }
  return out;
}

const dangerousSeedRequest=/\b(?:enter|provide|send|share|submit|paste|type|upload|ingresa(?:r)?|ingrese(?:s)?|proporciona(?:r)?|env[ií]a(?:r)?|env[ií]e|comparte|comparta|pega(?:r)?|pegue|escribe|escriba|sube|suba)\b[\s\S]{0,80}\b(?:seed phrase|recovery phrase|frase semilla|frase de recuperaci[oó]n)\b/i;
const reverseDangerousSeedRequest=/\b(?:seed phrase|recovery phrase|frase semilla|frase de recuperaci[oó]n)\b[\s\S]{0,80}\b(?:here|aqu[ií]|form|formulario|campo|input)\b/i;
const protectiveSecretWarning=/\b(?:never|do not|don't|must not|nunca|jam[aá]s|no)\b[\s\S]{0,80}\b(?:enter|provide|send|share|submit|paste|type|upload|ingres\w*|proporcion\w*|env[ií]\w*|compart\w*|peg\w*|escrib\w*|sub\w*)\b/i;
function containsRecoverySecretRequest(text){
  return String(text).split(/\r?\n/).some(line=>{
    const dangerous=dangerousSeedRequest.test(line)||reverseDangerousSeedRequest.test(line);
    return dangerous&&!protectiveSecretWarning.test(line);
  });
}

(async()=>{
  const mod=await import(pathToFileURL(path.join(root,'standards/trust-authority-v330.mjs')).href);
  const classify=mod.classifyTrustAuthority;

  const baseline=classify({issuerTrust:'SELF_DECLARED'});
  assert.equal(baseline.level,1,'self-declared registration starts at signed identity');

  const telemetryOnly=classify({issuerTrust:'SELF_DECLARED',publicPulseCount:5000,softwareChallengesAccepted:5000});
  assert.equal(telemetryOnly.level,1,'public telemetry must never elevate authority');
  assert.equal(telemetryOnly.publicTelemetryAuthoritative,false);

  const signedHistory=classify({issuerTrust:'WALLET_PROVEN',signedContinuityEvents:2});
  assert.equal(signedHistory.level,2,'owner-signed continuity may elevate to level 2');

  const verifiedIssuer=classify({issuerTrust:'DOMAIN_VERIFIED',signedContinuityEvents:1});
  assert.equal(verifiedIssuer.level,3,'verified issuer plus signed continuity may elevate to level 3');

  const countersigned=classify({issuerTrust:'SELF_DECLARED',providerCountersignedProofs:1});
  assert.equal(countersigned.level,3,'independent countersignature may elevate digital authority');

  const highAssurance=classify({issuerTrust:'ORGANIZATION_VERIFIED',regulatedEvidence:1});
  assert.equal(highAssurance.level,4,'regulated evidence may elevate to high assurance');

  const suspended=classify({issuerTrust:'SUSPENDED',signedContinuityEvents:99,regulatedEvidence:1,securePhysicalProofs:1});
  assert.equal(suspended.level,1,'suspended issuer cannot be elevated by normal evidence classification');

  const guardianUi=read('v1/guardian-v04.js');
  assert(guardianUi.includes('OBSERVATIONAL ONLY'),'Guardian UI must label public telemetry as observational only');
  assert(guardianUi.includes('Math.min(backendLevel,authority.maxLevel)'),'Guardian UI must cap backend authority by independently derived evidence');
  assert(guardianUi.includes('Authority Root'),'Guardian UI must surface Authority Root separately');
  assert(guardianUi.includes('Reality Root · telemetry'),'Guardian UI must distinguish telemetry Reality Root');
  assert(!guardianUi.includes('historyPresent=pulses>0||passportEvents>0'),'legacy public-telemetry trust elevation must stay removed');
  assert(guardianUi.includes("'\"':'&quot;'"),'canonical HTML escaper must encode double quotes');
  assert(guardianUi.includes("\"'\":'&#39;'"),'canonical HTML escaper must encode single quotes');

  const guardianBase=read('supabase/functions/evo-ai-guardian/index.ts');
  assert(guardianBase.includes('publicTelemetryAuthoritative:false'),'Guardian backend must declare public telemetry non-authoritative');
  assert(guardianBase.includes('providerCountersignedProofs'),'Guardian backend must recognize independent provider countersignatures');
  assert(!/pulseChainValid\)confidence\s*\+=/i.test(guardianBase),'Pulse must not add Evidence Confidence');
  assert(!/acceptedChallenges\)confidence\s*\+=/i.test(guardianBase),'SOFTWARE Challenge must not add Evidence Confidence');
  assert(guardianBase.includes('MAX_EVENTS=300'),'Guardian must bound Passport-event analysis cost');
  assert(guardianBase.includes('MAX_PULSES_ANALYZED=1500'),'Guardian must bound public Pulse analysis cost');
  assert(guardianBase.includes('MAX_CHALLENGE_ATTEMPTS=750'),'Guardian must bound Challenge-attempt analysis cost');
  assert(guardianBase.includes('MAX_SERVICE_PROOFS=300'),'Guardian must bound Service Proof analysis cost');
  assert(guardianBase.includes('.eq("event_type","TRANSFERRED")'),'Guardian must resolve latest ownership independently of truncated history');
  assert(guardianBase.includes('const currentOwner=String(latestTransfer?.new_owner_wallet||seal.issuer_wallet||"").toLowerCase()'),'Guardian current owner must come from latest transfer, not a capped event slice');
  assert(guardianBase.includes('"X-Content-Type-Options":"nosniff"'),'Guardian responses must disable MIME sniffing');

  const guardianAuthority=read('supabase/functions/evo-ai-guardian-v04/index.ts');
  assert(guardianAuthority.includes('EVO-AUTHORITY-STATE-V1'),'backend must produce a distinct Authority State');
  assert(guardianAuthority.includes('authorityRoot'),'backend must produce Authority Root');
  assert(guardianAuthority.includes('PUBLIC_TELEMETRY_NEVER_ELEVATES_AUTHORITY'),'backend must expose the authority rule');
  assert(guardianAuthority.includes('pulseHead'),'Reality State may retain public telemetry for anomaly analysis');
  const authorityStateBlock=guardianAuthority.slice(guardianAuthority.indexOf('const authorityState='),guardianAuthority.indexOf('const authorityRoot='));
  assert(!authorityStateBlock.includes('pulseHead'),'Authority Root state must exclude Pulse');
  assert(!authorityStateBlock.includes('challengeState'),'Authority Root state must exclude SOFTWARE Challenge');

  const challenge=read('supabase/functions/evo-challenge/index.ts');
  assert(challenge.includes('MAX_ATTEMPTS=10'),'Challenge must cap response attempts');
  assert(challenge.includes('MAX_ISSUES_PER_HOUR=30'),'Challenge must rate-limit issuance per Seal');
  assert(challenge.includes('reused:true'),'Challenge must reuse a still-live pending challenge');
  assert(challenge.includes('authority:"OBSERVATIONAL_ONLY"'),'SOFTWARE Challenge must be explicitly non-authoritative');

  const sealRegistration=read('supabase/functions/register-evo-seal/index.ts');
  assert(sealRegistration.includes('.rpc("evo_register_seal_with_credit"'),'Seal registration must cross the economic boundary through one atomic RPC');
  assert(!sealRegistration.includes('.rpc("evo_claim_passport_credit"'),'Edge registration must not consume credit in a separate transaction');
  assert(!/from\("evo_seals"\)\.insert\(/.test(sealRegistration),'Edge registration must not insert the Seal outside the atomic RPC');
  assert(sealRegistration.includes('atomic: true'),'successful registration must explicitly report the atomic path');
  assert(sealRegistration.includes('"X-Content-Type-Options": "nosniff"'),'Seal-registration responses must disable MIME sniffing');

  const atomicMigration=read('supabase/migrations/20260821234000_atomic_seal_registration_credit.sql');
  assert(atomicMigration.includes('create or replace function public.evo_register_seal_with_credit'),'atomic registration RPC must be migration-controlled');
  assert(atomicMigration.includes("'evo-credit|' || v_wallet"),'credit decisions must use a wallet-wide transaction lock');
  assert(atomicMigration.includes('insert into public.evo_seals as s'),'Seal insert must live inside the database transaction');
  assert(atomicMigration.includes('insert into public.evo_credit_consumptions'),'credit consumption must live inside the same database transaction');
  assert(atomicMigration.includes("raise exception 'duplicate_asset_serial'"),'duplicate asset/serial rule must be rechecked inside the transaction');
  assert(atomicMigration.includes('revoke all on function public.evo_register_seal_with_credit(jsonb) from authenticated'),'browser roles must not execute the atomic SECURITY DEFINER RPC');
  assert(atomicMigration.includes('grant execute on function public.evo_register_seal_with_credit(jsonb) to service_role'),'service role must be the application execution path for the atomic RPC');

  const indexHtml=read('v1/index.html');
  assert(indexHtml.includes('Content-Security-Policy'),'browser entrypoint must enforce a CSP baseline');
  assert(indexHtml.includes("base-uri 'none'"),'CSP must disable base tag rewriting');
  assert(indexHtml.includes("object-src 'none'"),'CSP must disable plugin/object execution');
  assert(indexHtml.includes("script-src-attr 'none'"),'CSP must disable inline event-handler scripts');
  assert(indexHtml.includes('strict-origin-when-cross-origin'),'browser entrypoint must set a restrictive referrer policy');
  assert(indexHtml.includes('security-bootstrap-v331.js'),'browser shield bootstrap must load before the application scripts');
  assert(!/\son[a-z]+\s*=/i.test(indexHtml),'inline event-handler attributes must stay removed from the HTML entrypoint');
  assert(indexHtml.includes('qrcodejs@06c7a5e134f116402699f03cda5819e10a0e5787'),'QR runtime must remain pinned to the reviewed immutable upstream commit while CDN delivery is transitional');

  const browserShield=read('v1/security-bootstrap-v331.js');
  assert(browserShield.includes('EVO-BROWSER-SHIELD-V3.3.1'),'browser shield must expose its security version');
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
    const edgeFiles=walk(edgeRoot).filter(file=>file.endsWith('.ts'));
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

  console.log('EVO V3.3.2 security hardening checks passed');
})().catch(error=>{console.error(error);process.exit(1)});
