const GUARDIAN_V04_URL=`${SUPABASE_URL}/functions/v1/evo-ai-guardian-v04`;
const guardianMarkupV03=guardianMarkup;

// V3.3 security hardening: one canonical HTML escaper for legacy templates that
// still render trusted markup plus untrusted text via innerHTML.
const evoEscapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[char]));
if(typeof esc==='function')esc=evoEscapeHtml;

function evoAuthoritativeReality(g){
  const stats=g?.stats||{};
  const issuerTrust=String(stats.issuerTrust||g?.issuer?.trust||'SELF_DECLARED').toUpperCase();
  const passportEvents=Math.max(0,Number(stats.passportEvents||0));
  // Guardian counts the initial Seal registration as one Passport event. Only
  // later owner-signed lifecycle events are continuity evidence.
  const signedContinuityEvents=Math.max(0,passportEvents-1);
  const publicPulses=Math.max(0,Number(stats.pulsesTotal||0));
  const softwareChallenges=Math.max(0,Number(stats.acceptedChallenges||0));
  const chainOk=stats.pulseChainValid!==false;
  const nfcVerified=stats.nfcVerified===true||stats.physicalProofState==='NFC_VERIFIED'||g?.physicalProof?.status==='NFC_VERIFIED'||g?.reality?.state?.physicalProofState==='NFC_VERIFIED';
  const trustedIssuer=['WALLET_PROVEN','DOMAIN_VERIFIED','ORGANIZATION_VERIFIED'].includes(issuerTrust);
  const strongerIssuer=['DOMAIN_VERIFIED','ORGANIZATION_VERIFIED'].includes(issuerTrust);

  let maxLevel=1;
  if(issuerTrust==='SUSPENDED')maxLevel=1;
  else if(nfcVerified)maxLevel=4;
  else if(strongerIssuer&&signedContinuityEvents>0)maxLevel=3;
  else if(signedContinuityEvents>0)maxLevel=2;

  return {
    issuerTrust,
    trustedIssuer,
    strongerIssuer,
    signedContinuityEvents,
    publicPulses,
    softwareChallenges,
    publicTelemetryOnly:publicPulses>0||softwareChallenges>0,
    pulseChainValid:chainOk,
    physical:nfcVerified,
    maxLevel
  };
}

function evoRealityLevel(g){
  const authority=evoAuthoritativeReality(g);
  const backendLevel=Number(g?.reality?.level);
  // Never allow public Pulse / SOFTWARE_V0 Challenge activity to elevate the
  // public authority display above evidence that requires a signer, verified
  // issuer, independent counterparty or secure hardware.
  const level=Number.isFinite(backendLevel)?Math.max(1,Math.min(backendLevel,authority.maxLevel)):authority.maxLevel;
  const labels={1:'SIGNED IDENTITY',2:'SIGNED CONTINUITY',3:'TRUSTED DIGITAL IDENTITY',4:'PHYSICAL CRYPTO PROOF'};
  const label=labels[level]||'SIGNED IDENTITY';
  const physical=level>=4||authority.physical;
  let next='Agregar un evento Passport firmado o un Service Proof firmado para construir continuidad autoritativa.';
  if(level===2)next=authority.trustedIssuer?'Fortalecer la evidencia del emisor o sumar una contrafirma independiente.':'Verificar mejor al emisor o sumar una contrafirma independiente.';
  if(level===3)next='Agregar NFC criptográfico o evidencia externa regulada para pasar de identidad digital a prueba de mayor garantía.';
  if(physical)next='Mantener continuidad física, auditar counters/replays y conservar evidencia independiente.';
  if(authority.issuerTrust==='SUSPENDED')next='Resolver la suspensión del emisor antes de elevar la confianza.';
  return {level,label,className:level>=2?'ok':'warn',physical,next,authority};
}

function shortRoot(root){
  const r=String(root||'');
  return r.length>24?`${r.slice(0,12)}…${r.slice(-12)}`:r;
}

function evoRealityMarkup(g){
  const r=evoRealityLevel(g);
  const issuer=String(r.authority.issuerTrust||'SELF_DECLARED').replaceAll('_',' ');
  const physical=r.physical?'<span class="status ok">NFC VERIFIED</span>':'<span class="status warn">NOT PHYSICAL</span>';
  const root=String(g?.reality?.root||g?.stats?.realityRoot||'').toLowerCase();
  const chain=String(g?.reality?.chainState||'LOCAL_EVIDENCE_ONLY').replaceAll('_',' ');
  const rootRow=root?`<div class="kv"><span>Reality Root</span><b class="mono" title="${esc(root)}">${esc(shortRoot(root))}</b></div>`:'';
  const copyBtn=root?`<button class="btn" type="button" data-copy-reality-root="${esc(root)}">Copiar Reality Root</button>`:'';
  const telemetry=r.authority.publicTelemetryOnly
    ?`${r.authority.publicPulses} Pulse · ${r.authority.softwareChallenges} Software Challenge`
    :'Sin actividad pública';

  return `<div class="guardianSignal realityLevelCard">
    <div><span class="status ${r.className}">ERL ${r.level}</span><b>${esc(r.label)}</b></div>
    <p><b>EVO Reality Level</b> resume la fuerza de evidencia autoritativa disponible. Actividad pública no puede elevar este nivel.</p>
    ${rootRow}
    <div class="kv"><span>Continuity</span><b>${esc(chain)}</b></div>
    <div class="kv"><span>Signed continuity</span><b>${r.authority.signedContinuityEvents} EVENT(S)</b></div>
    <div class="kv"><span>Issuer</span><b>${esc(issuer)}</b></div>
    <div class="kv"><span>Public telemetry</span><b class="status warn">OBSERVATIONAL ONLY</b></div>
    <div class="kv"><span>Pulse / Challenge</span><span>${esc(telemetry)}</span></div>
    <div class="kv"><span>Physical proof</span><b>${physical}</b></div>
    <div class="kv"><span>Next evidence</span><span>${esc(r.next)}</span></div>
    ${copyBtn?`<div class="actions">${copyBtn}</div>`:''}
  </div>`;
}

guardianMarkup=function(g){
  let html=guardianMarkupV03(g);
  const trust=String(g.stats?.issuerTrust||'SELF_DECLARED').replaceAll('_',' ');
  const issuerCard=`<div class="guardianSignal"><div><span class="status ${g.stats?.issuerTrust==='SUSPENDED'?'bad':g.stats?.issuerTrust==='SELF_DECLARED'?'warn':'ok'}">ISSUER</span><b>Issuer Trust: ${esc(trust)}</b></div><p>${esc(g.issuer?.displayName||'')}</p></div>`;
  const realityCard=evoRealityMarkup(g);
  return html.replace('<div class="guardianSignals"><h3>Signals</h3>',`<div class="guardianSignals"><h3>EVO Reality Graph</h3>${realityCard}<h3>Issuer Trust</h3>${issuerCard}<h3>Signals</h3>`);
};

function bindRealityActions(){
  const btn=document.querySelector('[data-copy-reality-root]');
  if(!btn)return;
  btn.onclick=async()=>{
    const root=btn.getAttribute('data-copy-reality-root')||'';
    try{await navigator.clipboard.writeText(root);toast('Reality Root copiado');}
    catch{toast('No se pudo copiar automáticamente');}
  };
}

analyzeGuardian=async function(sealId){
  const id=String(sealId||$('guardianSealId')?.value||'').trim().toUpperCase(),out=$('guardianResult');
  if(!id){toast('Ingresá un Seal ID');return}
  if($('guardianSealId'))$('guardianSealId').value=id;
  out.className='result';out.textContent='EVO AI Guardian está calculando Reality Graph + Reality Root…';
  try{
    const r=await fetch(GUARDIAN_V04_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sealId:id})});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data.error||`Guardian error (${r.status})`);
    out.innerHTML=guardianMarkup(data);
    bindRealityActions();
  }catch(e){out.innerHTML=`<span class="status bad">✕ GUARDIAN ERROR</span><p>${esc(e.message||String(e))}</p>`}
};

if($('guardianBtn'))$('guardianBtn').onclick=()=>analyzeGuardian();
// organization-simple.js is loaded once by index.html.
(()=>{const s=document.createElement('script');s.src='./battery.js?v=20260821-v11';s.async=true;document.body.appendChild(s)})();
console.info('EVO AI Guardian V0.4 UI · V3.3 authority hardening',{mode:'SIGNED AUTHORITY / PUBLIC TELEMETRY NON-AUTHORITATIVE / REALITY ROOT / ISSUER TRUST'});
