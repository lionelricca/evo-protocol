const PASSPORT_URL=`${SUPABASE_URL}/functions/v1/register-evo-passport-event`;

const passportLabels={
  SOLD:'Venta registrada',
  TRANSFERRED:'Propiedad transferida',
  REPAIRED:'Reparación declarada',
  WARRANTY:'Garantía / cobertura',
  INSPECTED:'Inspección declarada',
  NOTE:'Nota del propietario'
};
const passportDetailRequired=new Set(['SOLD','REPAIRED','WARRANTY','INSPECTED','NOTE']);

async function fetchPassportEvents(sealId){
  const q=new URL(`${SUPABASE_URL}/rest/v1/evo_passport_events`);
  q.searchParams.set('seal_id',`eq.${sealId}`);
  q.searchParams.set('status','eq.ACTIVE');
  q.searchParams.set('select','event_id,seal_id,event_type,actor_wallet,new_owner_wallet,note,event_digest,created_at,registered_at,status');
  q.searchParams.set('order','registered_at.asc');
  const r=await fetch(q,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
  if(!r.ok)throw new Error(`No se pudo consultar el pasaporte (${r.status})`);
  return r.json();
}

function currentOwnerFrom(seal,events){
  let owner=String(seal.issuer_wallet||'').toLowerCase();
  for(const e of events)if(e.event_type==='TRANSFERRED'&&e.new_owner_wallet)owner=String(e.new_owner_wallet).toLowerCase();
  return owner;
}

function shortWallet(w=''){return w?`${w.slice(0,8)}…${w.slice(-6)}`:'—'}

function passportTimelineMarkup(seal,events){
  const owner=currentOwnerFrom(seal,events);
  const created=`<div class="passportEvent"><h4>Registro creado</h4><p>El emisor creó y firmó el EVO Seal.</p><div class="eventMeta">${esc(seal.created_at||'')} · ${esc(shortWallet(seal.issuer_wallet||''))}</div></div>`;
  const items=events.map(e=>{
    const transfer=e.event_type==='TRANSFERRED'&&e.new_owner_wallet?`<p>Nuevo propietario: <span class="passportOwner mono">${esc(e.new_owner_wallet)}</span></p>`:'';
    const note=e.note?`<p>${esc(e.note)}</p>`:'<p class="eventMeta">Sin detalle registrado en esta declaración.</p>';
    return `<div class="passportEvent"><h4>${esc(passportLabels[e.event_type]||e.event_type)}</h4>${note}${transfer}<div class="eventMeta">${esc(e.created_at||'')} · firmado por ${esc(shortWallet(e.actor_wallet||''))} · ${esc(e.event_id||'')}</div></div>`;
  }).join('');
  return `<div class="passportSummary"><div class="passportStat"><span>Propietario actual</span><b class="passportOwner mono">${esc(owner)}</b></div><div class="passportStat"><span>Eventos públicos</span><b>${events.length+1}</b></div></div><div class="passportNotice">V1 registra declaraciones firmadas por el propietario actual. Una reparación o inspección todavía no implica validación independiente por un taller o entidad acreditada.</div><div class="passportTimeline">${created}${items||''}</div>`;
}

async function loadPassport(){
  const id=$('passportSealId').value.trim().toUpperCase();
  const out=$('passportTimeline');
  if(!id){toast('Ingresá un Seal ID');return}
  out.className='result';out.textContent='Consultando EVO Passport…';
  try{
    const seal=await fetchSeal(id);
    if(!seal){out.innerHTML='<span class="status bad">✕ UNKNOWN</span><p>Ese sello no existe o no está activo.</p>';return}
    const events=await fetchPassportEvents(id);
    out.innerHTML=passportTimelineMarkup(seal,events);
    $('passportCurrentOwner').textContent=currentOwnerFrom(seal,events);
  }catch(e){out.innerHTML=`<span class="status bad">✕ ERROR</span><p>${esc(e.message||String(e))}</p>`}
}

async function registerPassportEvent(event){
  const r=await fetch(PASSPORT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event})});
  let data={};try{data=await r.json()}catch{}
  if(!r.ok)throw new Error(data.error||`Error de pasaporte (${r.status})`);
  return data;
}

$('passportType').onchange=()=>{
  const show=$('passportType').value==='TRANSFERRED';
  $('passportTransferWrap').classList.toggle('hidden',!show);
  $('passportNewOwner').required=show;
};

$('passportLoadBtn').onclick=loadPassport;

$('passportEventForm').onsubmit=async e=>{
  e.preventDefault();
  const out=$('passportEventResult');
  try{
    if(!account||!walletProvider)await connectWallet();
    const sealId=$('passportSealId').value.trim().toUpperCase();
    if(!sealId)throw new Error('Ingresá primero el Seal ID.');
    const seal=await fetchSeal(sealId);if(!seal)throw new Error('Ese sello no existe o no está activo.');
    const events=await fetchPassportEvents(sealId);
    const currentOwner=currentOwnerFrom(seal,events);
    if(account.toLowerCase()!==currentOwner)throw new Error(`Sólo el propietario actual puede agregar eventos. Propietario: ${shortWallet(currentOwner)}`);

    const eventType=$('passportType').value;
    const newOwner=eventType==='TRANSFERRED'?$('passportNewOwner').value.trim().toLowerCase():'';
    if(eventType==='TRANSFERRED'&&!/^0x[0-9a-fA-F]{40}$/.test(newOwner))throw new Error('Ingresá una wallet EVM válida para el nuevo propietario.');
    const note=$('passportNote').value.trim();
    if(passportDetailRequired.has(eventType)&&note.length<3)throw new Error('Este tipo de evento requiere un detalle de al menos 3 caracteres.');
    const createdAt=new Date().toISOString();
    const nonce=rand();
    const actorWallet=account.toLowerCase();
    const eventDigest=await shaText([sealId,eventType,actorWallet,newOwner,note,createdAt,nonce].join('|'));
    const eventId=`EVP-${eventDigest.slice(0,8).toUpperCase()}-${eventDigest.slice(8,16).toUpperCase()}-${eventDigest.slice(16,24).toUpperCase()}`;
    const signatureMessage=`EVO PASSPORT V1\nEvent ID: ${eventId}\nSeal ID: ${sealId}\nType: ${eventType}\nActor: ${actorWallet}\nNew owner: ${newOwner||'N/A'}\nDigest: ${eventDigest}\nCreated: ${createdAt}`;
    toast('Confirmá la firma del evento en MetaMask. No mueve fondos.');
    const signature=await walletProvider.request({method:'personal_sign',params:[signatureMessage,account]});
    const payload={eventId,sealId,version:'EVO-PASSPORT-V1',eventType,actorWallet,newOwnerWallet:newOwner,note,eventDigest,nonce,signature,signatureMessage,createdAt};
    await registerPassportEvent(payload);
    out.className='result';out.innerHTML=`<span class="status ok">✓ EVENT REGISTERED</span><div class="kv"><span>Event ID</span><b class="mono">${esc(eventId)}</b></div><div class="kv"><span>Tipo</span><b>${esc(passportLabels[eventType]||eventType)}</b></div>`;
    $('passportNote').value='';if(eventType==='TRANSFERRED')$('passportNewOwner').value='';
    await loadPassport();
    toast('Evento agregado al EVO Passport');
  }catch(err){out.className='result';out.innerHTML=`<span class="status bad">✕ NO REGISTRADO</span><p>${esc(err.message||String(err))}</p>`}
};

const passportQuerySeal=new URLSearchParams(location.search).get('seal');
if(passportQuerySeal){$('passportSealId').value=passportQuerySeal.toUpperCase();setTimeout(loadPassport,450)}
$('verifyBtn').addEventListener('click',()=>setTimeout(()=>{const id=$('verifyId').value.trim().toUpperCase();if(id){$('passportSealId').value=id;loadPassport()}},350));

console.info('EVO Passport V1',{mode:'SIGNED OWNER EVENTS / REQUIRED EVENT DETAIL / PUBLIC HISTORY / NO TOKEN MOVEMENT'});
