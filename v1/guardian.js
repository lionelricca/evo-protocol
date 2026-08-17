const GUARDIAN_URL=`${SUPABASE_URL}/functions/v1/evo-ai-guardian`;

function guardianBadge(level){
  const cls=level==='LOW'?'ok':level==='MEDIUM'?'warn':'bad';
  return `<span class="status ${cls}">${esc(level)} RISK</span>`;
}
function guardianSignalMarkup(s){
  const cls=s.severity==='HIGH'?'bad':s.severity==='MEDIUM'?'warn':s.severity==='LOW'?'warn':'ok';
  return `<div class="guardianSignal"><div><span class="status ${cls}">${esc(s.severity)}</span><b>${esc(s.title)}</b></div><p>${esc(s.detail)}</p></div>`;
}
function guardianMarkup(g){
  const risk=Math.max(0,Math.min(100,Number(g.riskScore||0)));
  const confidence=Math.max(0,Math.min(100,Number(g.evidenceConfidence||0)));
  return `<div class="guardianTop">
    <div class="guardianIdentity"><span class="kicker">${esc(g.engine||'EVO AI Guardian')}</span><h3>${esc(g.verdict||'ANALYSIS')}</h3><p class="mono">${esc(g.sealId||'')}</p></div>
    ${guardianBadge(g.riskLevel||'LOW')}
  </div>
  <div class="guardianMeters">
    <div class="guardianMeter"><div><span>Risk score</span><b>${risk}/100</b></div><div class="meterTrack"><i style="width:${risk}%"></i></div></div>
    <div class="guardianMeter"><div><span>Evidence confidence</span><b>${confidence}%</b></div><div class="meterTrack confidence"><i style="width:${confidence}%"></i></div></div>
  </div>
  <div class="guardianStats">
    <div><span>Passport events</span><b>${Number(g.stats?.passportEvents||0)}</b></div>
    <div><span>Transfers</span><b>${Number(g.stats?.transferEvents||0)}</b></div>
    <div><span>Pending offers</span><b>${Number(g.stats?.pendingTransferOffers||0)}</b></div>
    <div><span>Asset duplicates</span><b>${Number(g.stats?.duplicateAssetCount||0)}</b></div>
  </div>
  <div class="guardianSignals"><h3>Signals</h3>${(g.signals||[]).map(guardianSignalMarkup).join('')}</div>
  <div class="guardianLimits"><b>Qué significa este resultado</b>${(g.limitations||[]).map(x=>`<p>• ${esc(x)}</p>`).join('')}</div>
  <div class="eventMeta">Analizado: ${esc(g.analyzedAt||'')} · ${esc(g.mode||'')}</div>`;
}

async function analyzeGuardian(sealId){
  const id=String(sealId||$('guardianSealId')?.value||'').trim().toUpperCase();
  const out=$('guardianResult');
  if(!id){toast('Ingresá un Seal ID');return}
  if($('guardianSealId'))$('guardianSealId').value=id;
  out.className='result';out.textContent='EVO AI Guardian está analizando el registro…';
  try{
    const r=await fetch(GUARDIAN_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sealId:id})});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data.error||`Guardian error (${r.status})`);
    out.innerHTML=guardianMarkup(data);
  }catch(e){out.innerHTML=`<span class="status bad">✕ GUARDIAN ERROR</span><p>${esc(e.message||String(e))}</p>`}
}

$('guardianBtn').onclick=()=>analyzeGuardian();
$('verifyBtn').addEventListener('click',()=>setTimeout(()=>{const id=$('verifyId').value.trim().toUpperCase();if(id)analyzeGuardian(id)},550));
$('passportLoadBtn').addEventListener('click',()=>setTimeout(()=>{const id=$('passportSealId').value.trim().toUpperCase();if(id)analyzeGuardian(id)},550));

const guardianQuerySeal=new URLSearchParams(location.search).get('seal');
if(guardianQuerySeal){$('guardianSealId').value=guardianQuerySeal.toUpperCase();setTimeout(()=>analyzeGuardian(guardianQuerySeal),900)}

console.info('EVO AI Guardian V0',{mode:'EXPLAINABLE RISK ENGINE / READ ONLY / NO TOKEN MOVEMENT'});
