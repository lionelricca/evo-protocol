const GUARDIAN_URL=`${SUPABASE_URL}/functions/v1/evo-ai-guardian`;
const CHALLENGE_URL=`${SUPABASE_URL}/functions/v1/evo-challenge`;

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
  const pulseChain=g.stats?.pulseChainValid===false?'BROKEN':Number(g.stats?.pulsesTotal||0)>0?'VALID':'—';
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
    <div><span>Asset duplicates</span><b>${Number(g.stats?.duplicateAssetCount||0)}</b></div>
    <div><span>EVO Pulses</span><b>${Number(g.stats?.pulsesTotal||0)}</b></div>
    <div><span>Pulses 24h</span><b>${Number(g.stats?.pulses24h||0)}</b></div>
    <div><span>Pulse chain</span><b>${esc(pulseChain)}</b></div>
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
$('verifyBtn').addEventListener('click',()=>setTimeout(()=>{const id=$('verifyId').value.trim().toUpperCase();if(id)analyzeGuardian(id)},850));
$('passportLoadBtn').addEventListener('click',()=>setTimeout(()=>{const id=$('passportSealId').value.trim().toUpperCase();if(id)analyzeGuardian(id)},850));

const guardianQuerySeal=new URLSearchParams(location.search).get('seal');
if(guardianQuerySeal){$('guardianSealId').value=guardianQuerySeal.toUpperCase();setTimeout(()=>analyzeGuardian(guardianQuerySeal),1400)}

// EVO Challenge V0 — software freshness + one-time anti-replay demonstration.
// It intentionally does NOT claim physical presence because SOFTWARE_V0 has no secret hardware key.
let activeEvoChallenge=null;

function injectChallengeUi(){
  const guardian=$('guardian');if(!guardian||$('challenge'))return;
  guardian.insertAdjacentHTML('beforebegin',`<section id="challenge" class="wrap block"><h2>EVO Challenge</h2><p class="sub">Challenge V0 crea un desafío aleatorio de corta duración y acepta su respuesta una sola vez. Prueba frescura y anti-replay de esta sesión; todavía no prueba presencia física.</p><div class="grid"><div class="panel form"><span class="kicker">LIVE PROOF · SOFTWARE V0</span><label>Seal ID<input id="challengeSealId" placeholder="EVO-XXXXXXXX-XXXXXXXX-XXXXXXXX"></label><div class="actions"><button id="issueChallengeBtn" class="btn primary" type="button">1 · Crear desafío vivo</button><button id="respondChallengeBtn" class="btn gold" type="button" disabled>2 · Responder desafío</button></div><div class="passportNotice">El desafío expira en 90 segundos. La respuesta V0 la calcula el navegador con datos públicos. En la versión física, esta respuesta será un MAC/firma generado dentro de un NFC seguro.</div></div><div class="panel"><h3>Proof result</h3><div id="challengeResult" class="empty">Creá un desafío para comenzar.</div></div></div></section>`);
  const navGuardian=document.querySelector('.links a[href="#guardian"]');
  if(navGuardian&&!document.querySelector('.links a[href="#challenge"]'))navGuardian.insertAdjacentHTML('beforebegin','<a href="#challenge">Challenge</a>');
  const q=new URLSearchParams(location.search).get('seal');if(q)$('challengeSealId').value=q.toUpperCase();
  $('issueChallengeBtn').onclick=issueEvoChallenge;
  $('respondChallengeBtn').onclick=()=>respondEvoChallenge(false);
}

async function challengeCall(action,payload){
  const r=await fetch(CHALLENGE_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload})});
  let data={};try{data=await r.json()}catch{}
  if(!r.ok){const err=new Error(data.error||`Challenge error (${r.status})`);err.code=data.error;err.status=r.status;throw err}
  return data;
}

async function issueEvoChallenge(){
  const out=$('challengeResult');
  const sealId=$('challengeSealId').value.trim().toUpperCase();
  if(!sealId){toast('Ingresá un Seal ID');return}
  out.className='result';out.textContent='Generando desafío aleatorio en el servidor…';
  try{
    const seal=await fetchSeal(sealId);if(!seal)throw new Error('Ese sello no existe o no está activo.');
    const data=await challengeCall('issue',{sealId});
    activeEvoChallenge={...data.challenge,sealDigest:seal.digest};
    $('respondChallengeBtn').disabled=false;
    out.innerHTML=`<span class="status warn">● CHALLENGE PENDING</span><div class="kv"><span>Challenge ID</span><b class="mono">${esc(data.challenge.challengeId)}</b></div><div class="kv"><span>Modo</span><b>${esc(data.challenge.mode)}</b></div><div class="kv"><span>Expira</span><span>${esc(data.challenge.expiresAt)}</span></div><p>El servidor generó un nonce nuevo. Todavía no existe una prueba aceptada.</p>`;
    toast('Desafío creado. Tenés 90 segundos para responder.');
  }catch(e){out.innerHTML=`<span class="status bad">✕ CHALLENGE ERROR</span><p>${esc(e.message||String(e))}</p>`}
}

async function respondEvoChallenge(replayTest=false){
  const out=$('challengeResult');
  if(!activeEvoChallenge){toast('Primero creá un desafío');return}
  const c=activeEvoChallenge;
  try{
    const responseHash=await shaText(`${c.challengeId}|${c.sealId}|${c.challengeNonce}|${c.sealDigest}|SOFTWARE_V0`);
    const data=await challengeCall('respond',{challengeId:c.challengeId,responseHash});
    $('respondChallengeBtn').disabled=true;
    out.innerHTML=`<span class="status ok">✓ FRESH RESPONSE ACCEPTED</span><div class="kv"><span>Challenge ID</span><b class="mono">${esc(c.challengeId)}</b></div><div class="kv"><span>Estado</span><b>${esc(data.proof.status)}</b></div><div class="kv"><span>Anti-replay</span><b class="status ok">ENFORCED</b></div><div class="kv"><span>Presencia física</span><b>NO · SOFTWARE V0</b></div><p>Esta respuesta fue aceptada una sola vez. Ahora podemos intentar reutilizarla para comprobar que el servidor la rechaza.</p><div class="actions"><button id="testReplayBtn" class="btn" type="button">3 · Probar replay</button></div><div id="replayResult"></div>`;
    $('testReplayBtn').onclick=()=>respondEvoChallenge(true);
    toast('Respuesta fresca aceptada');
  }catch(e){
    if(replayTest&&e.code==='challenge_already_consumed'){
      const replay=$('replayResult');if(replay)replay.innerHTML='<p><span class="status ok">✓ REPLAY REJECTED</span></p><p>La misma respuesta no puede reutilizarse. La prueba one-time está funcionando.</p>';
      const btn=$('testReplayBtn');if(btn)btn.disabled=true;
      toast('Replay rechazado correctamente');return;
    }
    if(replayTest){const replay=$('replayResult');if(replay)replay.innerHTML=`<p><span class="status bad">✕ ${esc(e.message||String(e))}</span></p>`;return}
    out.innerHTML=`<span class="status bad">✕ RESPONSE REJECTED</span><p>${esc(e.message||String(e))}</p>`;
  }
}

injectChallengeUi();
console.info('EVO AI Guardian V0.2 + Challenge V0',{mode:'EXPLAINABLE RISK / PULSE CHAIN / ONE-TIME SOFTWARE CHALLENGE / NO TOKEN MOVEMENT'});

// UX hardening for short-lived challenges: visible countdown + friendly expiry state.
let evoChallengeCountdownTimer=null;
function startEvoChallengeCountdown(){
  if(evoChallengeCountdownTimer)clearInterval(evoChallengeCountdownTimer);
  const out=$('challengeResult'),btn=$('respondChallengeBtn');
  if(!activeEvoChallenge||!out||!btn)return;
  const expires=Date.parse(activeEvoChallenge.expiresAt);
  let countdown=$('challengeCountdown');
  if(!countdown&&out.textContent.includes('CHALLENGE PENDING')){
    out.insertAdjacentHTML('beforeend','<div class="kv"><span>Tiempo restante</span><b id="challengeCountdown">—</b></div>');
    countdown=$('challengeCountdown');
  }
  const tick=()=>{
    const ms=expires-Date.now();
    if(ms<=0){
      if(countdown)countdown.textContent='EXPIRADO';
      btn.disabled=true;
      clearInterval(evoChallengeCountdownTimer);evoChallengeCountdownTimer=null;
      return;
    }
    if(countdown)countdown.textContent=`${Math.ceil(ms/1000)} s`;
  };
  tick();evoChallengeCountdownTimer=setInterval(tick,250);
}
const evoIssueButton=$('issueChallengeBtn');
if(evoIssueButton){
  const originalIssue=evoIssueButton.onclick;
  evoIssueButton.onclick=async e=>{await originalIssue(e);if(activeEvoChallenge)startEvoChallengeCountdown()};
}
const evoRespondButton=$('respondChallengeBtn');
if(evoRespondButton){
  const originalRespond=evoRespondButton.onclick;
  evoRespondButton.onclick=async e=>{
    await originalRespond(e);
    const out=$('challengeResult');
    if(out?.textContent?.includes('challenge_expired')){
      if(evoChallengeCountdownTimer)clearInterval(evoChallengeCountdownTimer);evoChallengeCountdownTimer=null;
      evoRespondButton.disabled=true;
      out.innerHTML='<span class="status bad">✕ CHALLENGE EXPIRED</span><p>El desafío venció antes de recibir la respuesta. Esto es correcto: una prueba vieja no puede aceptarse como presencia viva.</p><p>Creá un desafío nuevo y respondelo antes de que el contador llegue a cero.</p>';
    }else if(out?.textContent?.includes('FRESH RESPONSE ACCEPTED')){
      if(evoChallengeCountdownTimer)clearInterval(evoChallengeCountdownTimer);evoChallengeCountdownTimer=null;
    }
  };
}
