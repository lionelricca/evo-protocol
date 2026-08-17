const GUARDIAN_V04_URL=`${SUPABASE_URL}/functions/v1/evo-ai-guardian-v04`;
const guardianMarkupV03=guardianMarkup;

function evoRealityLevel(g){
  const stats=g?.stats||{};
  const issuerTrust=String(stats.issuerTrust||'SELF_DECLARED').toUpperCase();
  const pulses=Math.max(0,Number(stats.pulsesTotal||0));
  const passportEvents=Math.max(0,Number(stats.passportEvents||0));
  const chainOk=stats.pulseChainValid!==false;
  const nfcVerified=stats.nfcVerified===true||stats.physicalProofState==='NFC_VERIFIED'||g?.physicalProof?.status==='NFC_VERIFIED';
  const trustedIssuer=['WALLET_PROVEN','DOMAIN_VERIFIED','ORGANIZATION_VERIFIED'].includes(issuerTrust);
  const strongerIssuer=['DOMAIN_VERIFIED','ORGANIZATION_VERIFIED'].includes(issuerTrust);
  const historyPresent=pulses>0||passportEvents>0;

  if(issuerTrust==='SUSPENDED'){
    return {level:1,label:'SIGNED IDENTITY',className:'warn',physical:false,next:'Resolver la suspensión del emisor antes de elevar la confianza.'};
  }
  if(nfcVerified){
    return {level:4,label:'PHYSICAL CRYPTO PROOF',className:'ok',physical:true,next:'Mantener continuidad física y auditar counters/replays.'};
  }
  if(strongerIssuer&&historyPresent&&chainOk){
    return {level:3,label:'TRUSTED DIGITAL IDENTITY',className:'ok',physical:false,next:'Agregar NFC criptográfico para pasar de evidencia digital a prueba física.'};
  }
  if(historyPresent&&chainOk){
    return {level:2,label:'CONTINUOUS HISTORY',className:'ok',physical:false,next:trustedIssuer?'Fortalecer evidencia del emisor o incorporar NFC seguro.':'Verificar mejor al emisor y luego incorporar NFC seguro.'};
  }
  return {level:1,label:'SIGNED IDENTITY',className:trustedIssuer?'ok':'warn',physical:false,next:'Construir historial con Passport/Pulse y fortalecer evidencia del emisor.'};
}

function evoRealityMarkup(g){
  const r=evoRealityLevel(g);
  const issuer=String(g?.stats?.issuerTrust||'SELF_DECLARED').replaceAll('_',' ');
  const physical=r.physical?'<span class="status ok">NFC VERIFIED</span>':'<span class="status warn">NOT PHYSICAL</span>';
  return `<div class="guardianSignal realityLevelCard"><div><span class="status ${r.className}">ERL ${r.level}</span><b>${esc(r.label)}</b></div><p><b>EVO Reality Level</b> resume la fuerza de la evidencia disponible para este Seal. No es una declaración binaria de autenticidad.</p><div class="kv"><span>Issuer</span><b>${esc(issuer)}</b></div><div class="kv"><span>Physical proof</span><b>${physical}</b></div><div class="kv"><span>Next evidence</span><span>${esc(r.next)}</span></div></div>`;
}

guardianMarkup=function(g){
  let html=guardianMarkupV03(g);
  const trust=String(g.stats?.issuerTrust||'SELF_DECLARED').replaceAll('_',' ');
  const issuerCard=`<div class="guardianSignal"><div><span class="status ${g.stats?.issuerTrust==='SUSPENDED'?'bad':g.stats?.issuerTrust==='SELF_DECLARED'?'warn':'ok'}">ISSUER</span><b>Issuer Trust: ${esc(trust)}</b></div><p>${esc(g.issuer?.displayName||'')}</p></div>`;
  const realityCard=evoRealityMarkup(g);
  return html.replace('<div class="guardianSignals"><h3>Signals</h3>',`<div class="guardianSignals"><h3>EVO Reality Graph</h3>${realityCard}<h3>Issuer Trust</h3>${issuerCard}<h3>Signals</h3>`);
};

analyzeGuardian=async function(sealId){
  const id=String(sealId||$('guardianSealId')?.value||'').trim().toUpperCase(),out=$('guardianResult');
  if(!id){toast('Ingresá un Seal ID');return}
  if($('guardianSealId'))$('guardianSealId').value=id;
  out.className='result';out.textContent='EVO AI Guardian está analizando Reality Graph: Seal + Issuer Trust + Passport + Pulse + Challenge…';
  try{
    const r=await fetch(GUARDIAN_V04_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sealId:id})});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data.error||`Guardian error (${r.status})`);
    out.innerHTML=guardianMarkup(data);
  }catch(e){out.innerHTML=`<span class="status bad">✕ GUARDIAN ERROR</span><p>${esc(e.message||String(e))}</p>`}
};

if($('guardianBtn'))$('guardianBtn').onclick=()=>analyzeGuardian();
(()=>{const s=document.createElement('script');s.src='/evo-protocol/v1/organization-simple.js?v=20260816-2310';s.async=true;document.body.appendChild(s)})();
console.info('EVO AI Guardian V0.5 UI',{mode:'REALITY GRAPH + ERL + ISSUER TRUST + EXISTING GUARDIAN EVIDENCE'});
