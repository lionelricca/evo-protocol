const GUARDIAN_V04_URL=`${SUPABASE_URL}/functions/v1/evo-ai-guardian-v04`;
const guardianMarkupV03=guardianMarkup;
guardianMarkup=function(g){
  let html=guardianMarkupV03(g);
  const trust=String(g.stats?.issuerTrust||'SELF_DECLARED').replaceAll('_',' ');
  const card=`<div class="guardianSignal"><div><span class="status ${g.stats?.issuerTrust==='SUSPENDED'?'bad':g.stats?.issuerTrust==='SELF_DECLARED'?'warn':'ok'}">ISSUER</span><b>Issuer Trust: ${esc(trust)}</b></div><p>${esc(g.issuer?.displayName||'')}</p></div>`;
  return html.replace('<div class="guardianSignals"><h3>Signals</h3>',`<div class="guardianSignals"><h3>Issuer Trust</h3>${card}<h3>Signals</h3>`);
};
analyzeGuardian=async function(sealId){
  const id=String(sealId||$('guardianSealId')?.value||'').trim().toUpperCase(),out=$('guardianResult');
  if(!id){toast('Ingresá un Seal ID');return}
  if($('guardianSealId'))$('guardianSealId').value=id;
  out.className='result';out.textContent='EVO AI Guardian está analizando Seal + Passport + Pulse + Challenge + Issuer Trust…';
  try{
    const r=await fetch(GUARDIAN_V04_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sealId:id})});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data.error||`Guardian error (${r.status})`);
    out.innerHTML=guardianMarkup(data);
  }catch(e){out.innerHTML=`<span class="status bad">✕ GUARDIAN ERROR</span><p>${esc(e.message||String(e))}</p>`}
};
if($('guardianBtn'))$('guardianBtn').onclick=()=>analyzeGuardian();
console.info('EVO AI Guardian V0.4 UI',{mode:'ISSUER TRUST + EXISTING GUARDIAN EVIDENCE'});
