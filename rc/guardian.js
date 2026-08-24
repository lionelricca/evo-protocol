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
  return `<div class="guardianTop"><div class="guardianIdentity"><span class="kicker">${esc(g.engine||'EVO AI Guardian')}</span><h3>${esc(g.verdict||'ANALYSIS')}</h3><p class="mono">${esc(g.sealId||'')}</p></div>${guardianBadge(g.riskLevel||'LOW')}</div>
  <div class="guardianMeters"><div class="guardianMeter"><div><span>Risk score</span><b>${risk}/100</b></div><progress class="guardianProgress riskProgress" max="100" value="${risk}" aria-label="Risk score ${risk} of 100"></progress></div><div class="guardianMeter"><div><span>Evidence confidence</span><b>${confidence}%</b></div><progress class="guardianProgress confidenceProgress" max="100" value="${confidence}" aria-label="Evidence confidence ${confidence} percent"></progress></div></div>
  <div class="guardianStats"><div><span>Passport events</span><b>${Number(g.stats?.passportEvents||0)}</b></div><div><span>Transfers</span><b>${Number(g.stats?.transferEvents||0)}</b></div><div><span>Asset duplicates</span><b>${Number(g.stats?.duplicateAssetCount||0)}</b></div><div><span>EVO Pulses</span><b>${Number(g.stats?.pulsesTotal||0)}</b></div><div><span>Pulses 24h</span><b>${Number(g.stats?.pulses24h||0)}</b></div><div><span>Pulse chain</span><b>${esc(pulseChain)}</b></div></div>
  <div class="guardianSignals"><h3>Signals</h3>${(g.signals||[]).map(guardianSignalMarkup).join('')}</div><div class="guardianLimits"><b>Qué significa este resultado</b>${(g.limitations||[]).map(x=>`<p>• ${esc(x)}</p>`).join('')}</div><div class="eventMeta">Analizado: ${esc(g.analyzedAt||'')} · ${esc(g.mode||'')}</div>`;
}
async function analyzeGuardian(sealId){
  const id=String(sealId||$('guardianSealId')?.value||'').trim().toUpperCase(),out=$('guardianResult');
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

// EVO Challenge V0 — freshness + one-time anti-replay. SOFTWARE_V0 does not prove physical presence.
let activeEvoChallenge=null;
let evoChallengeCountdownTimer=null;

function injectChallengeUi(){
  const guardian=$('guardian');if(!guardian||$('challenge'))return;
  guardian.insertAdjacentHTML('beforebegin',`<section id="challenge" class="wrap block"><h2>EVO Challenge</h2><p class="sub">Challenge V0 crea un desafío aleatorio de corta duración y acepta su respuesta una sola vez. Prueba frescura y anti-replay de esta sesión; todavía no prueba presencia física.</p><div class="grid"><div class="panel form"><span class="kicker">LIVE PROOF · SOFTWARE V0</span><label>Seal ID<input id="challengeSealId" placeholder="EVO-XXXXXXXX-XXXXXXXX-XXXXXXXX"></label><div class="actions"><button id="issueChallengeBtn" class="btn primary" type="button">1 · Crear desafío vivo</button><button id="respondChallengeBtn" class="btn gold" type="button" disabled>2 · Responder desafío</button></div><div id="challengeClockBox" class="challengeClockBox"><div><span>EVO LIVE TIMER</span><small id="challengeClockState">Esperando desafío</small></div><strong id="challengeCountdown">01:30</strong><small id="challengeClockHint">90 segundos</small></div><div class="passportNotice">El contador permanece visible durante toda la prueba. En SOFTWARE V0 la respuesta la calcula el navegador; en la versión física la generará un NFC seguro con una clave secreta.</div></div><div class="panel"><h3>Proof result</h3><div id="challengeResult" class="empty">Creá un desafío para comenzar.</div></div></div></section>`);
  const navGuardian=document.querySelector('.links a[href="#guardian"]');
  if(navGuardian&&!document.querySelector('.links a[href="#challenge"]'))navGuardian.insertAdjacentHTML('beforebegin','<a href="#challenge">Challenge</a>');
  const q=new URLSearchParams(location.search).get('seal');if(q)$('challengeSealId').value=q.toUpperCase();
  $('issueChallengeBtn').onclick=issueEvoChallenge;
  $('respondChallengeBtn').onclick=()=>respondEvoChallenge(false);
}
function formatChallengeTime(ms){
  const total=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(total/60),s=total%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function setChallengeClock(mode,text,hint=''){
  const box=$('challengeClockBox'),clock=$('challengeCountdown'),state=$('challengeClockState'),h=$('challengeClockHint');
  if(!box||!clock||!state||!h)return;
  box.classList.remove('live','done','expired');if(mode)box.classList.add(mode);
  clock.textContent=text;state.textContent=mode==='live'?'DESAFÍO ACTIVO':mode==='done'?'COMPLETADO':mode==='expired'?'EXPIRADO':'Esperando desafío';h.textContent=hint;
}
function stopChallengeCountdown(){if(evoChallengeCountdownTimer){clearInterval(evoChallengeCountdownTimer);evoChallengeCountdownTimer=null}}
function startEvoChallengeCountdown(){
  stopChallengeCountdown();
  if(!activeEvoChallenge)return;
  const expires=Date.parse(activeEvoChallenge.expiresAt),btn=$('respondChallengeBtn');
  const tick=()=>{
    const ms=expires-Date.now();
    if(ms<=0){setChallengeClock('expired','00:00','Creá un desafío nuevo');if(btn)btn.disabled=true;stopChallengeCountdown();return}
    setChallengeClock('live',formatChallengeTime(ms),'Respondé antes de 00:00');
  };
  tick();evoChallengeCountdownTimer=setInterval(tick,250);
}
async function challengeCall(action,payload){
  const r=await fetch(CHALLENGE_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload})});
  let data={};try{data=await r.json()}catch{}
  if(!r.ok){const err=new Error(data.error||`Challenge error (${r.status})`);err.code=data.error;err.status=r.status;throw err}
  return data;
}
async function issueEvoChallenge(){
  const out=$('challengeResult'),sealId=$('challengeSealId').value.trim().toUpperCase();
  if(!sealId){toast('Ingresá un Seal ID');return}
  stopChallengeCountdown();setChallengeClock('', '01:30','Generando…');
  out.className='result';out.textContent='Generando desafío aleatorio en el servidor…';
  try{
    const seal=await fetchSeal(sealId);if(!seal)throw new Error('Ese sello no existe o no está activo.');
    const data=await challengeCall('issue',{sealId});
    activeEvoChallenge={...data.challenge,sealDigest:seal.digest};
    $('respondChallengeBtn').disabled=false;
    out.innerHTML=`<span class="status warn">● CHALLENGE PENDING</span><div class="kv"><span>Challenge ID</span><b class="mono">${esc(data.challenge.challengeId)}</b></div><div class="kv"><span>Modo</span><b>${esc(data.challenge.mode)}</b></div><div class="kv"><span>Expira</span><span>${esc(data.challenge.expiresAt)}</span></div><p>El servidor generó un nonce nuevo. Todavía no existe una prueba aceptada.</p>`;
    startEvoChallengeCountdown();toast('Desafío creado. El contador ya está corriendo.');
  }catch(e){setChallengeClock('', '01:30','Esperando desafío');out.innerHTML=`<span class="status bad">✕ CHALLENGE ERROR</span><p>${esc(e.message||String(e))}</p>`}
}
async function respondEvoChallenge(replayTest=false){
  const out=$('challengeResult');if(!activeEvoChallenge){toast('Primero creá un desafío');return}
  const c=activeEvoChallenge;
  try{
    const responseHash=await shaText(`${c.challengeId}|${c.sealId}|${c.challengeNonce}|${c.sealDigest}|SOFTWARE_V0`);
    const data=await challengeCall('respond',{challengeId:c.challengeId,responseHash});
    stopChallengeCountdown();$('respondChallengeBtn').disabled=true;
    const remaining=formatChallengeTime(Date.parse(c.expiresAt)-Date.now());setChallengeClock('done',remaining,'Respuesta fresca aceptada');
    out.innerHTML=`<span class="status ok">✓ FRESH RESPONSE ACCEPTED</span><div class="kv"><span>Challenge ID</span><b class="mono">${esc(c.challengeId)}</b></div><div class="kv"><span>Estado</span><b>${esc(data.proof.status)}</b></div><div class="kv"><span>Anti-replay</span><b class="status ok">ENFORCED</b></div><div class="kv"><span>Presencia física</span><b>NO · SOFTWARE V0</b></div><p>Esta respuesta fue aceptada una sola vez. El reloj permanece visible y muestra cuánto tiempo quedaba cuando se consumió el desafío.</p><div class="actions"><button id="testReplayBtn" class="btn" type="button">3 · Probar replay</button></div><div id="replayResult"></div>`;
    $('testReplayBtn').onclick=()=>respondEvoChallenge(true);toast('Respuesta fresca aceptada');
  }catch(e){
    if(replayTest&&e.code==='challenge_already_consumed'){
      const replay=$('replayResult');if(replay)replay.innerHTML='<p><span class="status ok">✓ REPLAY REJECTED</span></p><p>La misma respuesta no puede reutilizarse. La prueba one-time está funcionando.</p>';
      const btn=$('testReplayBtn');if(btn)btn.disabled=true;setChallengeClock('done',$('challengeCountdown')?.textContent||'—','Replay rechazado');toast('Replay rechazado correctamente');return;
    }
    if(e.code==='challenge_expired'){
      stopChallengeCountdown();$('respondChallengeBtn').disabled=true;setChallengeClock('expired','00:00','Creá un desafío nuevo');
      out.innerHTML='<span class="status bad">✕ CHALLENGE EXPIRED</span><p>El desafío venció antes de recibir la respuesta. Una prueba vieja no puede aceptarse como presencia viva.</p><p>Creá un desafío nuevo y respondelo antes de 00:00.</p>';return;
    }
    if(replayTest){const replay=$('replayResult');if(replay)replay.innerHTML=`<p><span class="status bad">✕ ${esc(e.message||String(e))}</span></p>`;return}
    out.innerHTML=`<span class="status bad">✕ RESPONSE REJECTED</span><p>${esc(e.message||String(e))}</p>`;
  }
}

injectChallengeUi();
console.info('EVO AI Guardian V0.2 + Challenge V0',{mode:'EXPLAINABLE RISK / PULSE CHAIN / PERSISTENT LIVE TIMER / ONE-TIME SOFTWARE CHALLENGE / NO TOKEN MOVEMENT'});