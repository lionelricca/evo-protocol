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

const dangerousSeedRequest=/\b(?:enter|provide|send|share|submit|paste|type|upload|ingresa(?:r)?|ingrese|proporciona(?:r)?|env[ií]a(?:r)?|env[ií]e|comparte|comparta|pega(?:r)?|pegue|escribe|escriba|sube|suba)\b[\s\S]{0,80}\b(?:seed phrase|recovery phrase|frase semilla|frase de recuperaci[oó]n)\b/i;
const reverseDangerousSeedRequest=/\b(?:seed phrase|recovery phrase|frase semilla|frase de recuperaci[oó]n)\b[\s\S]{0,80}\b(?:here|aqu[ií]|form|formulario|campo|input)\b/i;

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

  const frontendFiles=walk(path.join(root,'v1')).filter(file=>/\.(?:js|html|css)$/i.test(file));
  for(const file of frontendFiles){
    const text=fs.readFileSync(file,'utf8');
    assert(!text.includes('SUPABASE_SERVICE_ROLE_KEY'),`service role secret reference must never appear in frontend: ${path.relative(root,file)}`);
    assert(!/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/.test(text),`private key material detected in frontend: ${path.relative(root,file)}`);
    assert(!dangerousSeedRequest.test(text),`frontend appears to request a recovery secret: ${path.relative(root,file)}`);
    assert(!reverseDangerousSeedRequest.test(text),`frontend appears to place a recovery secret in an input flow: ${path.relative(root,file)}`);
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

  console.log('EVO V3.3 security hardening checks passed');
})().catch(error=>{console.error(error);process.exit(1)});
