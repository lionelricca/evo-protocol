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

(async()=>{
  const mod=await import(pathToFileURL(path.join(root,'standards/trust-authority-v330.mjs')).href);
  const classify=mod.classifyTrustAuthority;

  const baseline=classify({issuerTrust:'SELF_DECLARED'});
  assert.equal(baseline.level,1,'self-declared registration starts at signed identity');

  const telemetryOnly=classify({
    issuerTrust:'SELF_DECLARED',
    publicPulseCount:5000,
    softwareChallengesAccepted:5000,
  });
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

  const guardian=read('v1/guardian-v04.js');
  assert(guardian.includes('OBSERVATIONAL ONLY'),'Guardian UI must label public telemetry as observational only');
  assert(guardian.includes('Math.min(backendLevel,authority.maxLevel)'),'Guardian must cap backend Reality Level by authoritative evidence');
  assert(!guardian.includes('historyPresent=pulses>0||passportEvents>0'),'legacy public-telemetry trust elevation must stay removed');
  assert(guardian.includes("'\"':'&quot;'"),'canonical HTML escaper must encode double quotes');
  assert(guardian.includes("\"'\":'&#39;'"),'canonical HTML escaper must encode single quotes');

  const frontendFiles=walk(path.join(root,'v1')).filter(file=>/\.(?:js|html|css)$/i.test(file));
  for(const file of frontendFiles){
    const text=fs.readFileSync(file,'utf8');
    assert(!text.includes('SUPABASE_SERVICE_ROLE_KEY'),`service role secret reference must never appear in frontend: ${path.relative(root,file)}`);
    assert(!/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/.test(text),`private key material detected in frontend: ${path.relative(root,file)}`);
    assert(!/seed phrase/i.test(text),`seed phrase request/reference detected in frontend: ${path.relative(root,file)}`);
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

  console.log('EVO V3.3 security hardening checks passed');
})().catch(error=>{console.error(error);process.exit(1)});
