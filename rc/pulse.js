const PULSE_URL=`${SUPABASE_URL}/functions/v1/evo-pulse`;
const pulseSessionSeen=new Set();

function pulseNonce(){const b=new Uint8Array(16);crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function recordEvoPulse(sealId,source='PUBLIC_LINK'){
  const id=String(sealId||'').trim().toUpperCase();
  if(!/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(id))return null;
  const key=`${id}|${source}`;if(pulseSessionSeen.has(key))return null;pulseSessionSeen.add(key);
  try{
    const r=await fetch(PULSE_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sealId:id,source,nonce:pulseNonce()})});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok){pulseSessionSeen.delete(key);throw new Error(data.error||`Pulse error (${r.status})`)}
    console.info('EVO Pulse',data);
    return data;
  }catch(e){console.warn('EVO Pulse unavailable',e);return null}
}

const pulseQuery=new URLSearchParams(location.search);
const pulseSeal=pulseQuery.get('seal');
if(pulseSeal){
  const via=String(pulseQuery.get('via')||'').toLowerCase();
  const source=via==='qr'?'QR':'PUBLIC_LINK';
  setTimeout(()=>recordEvoPulse(pulseSeal,source),550);
}

$('verifyBtn').addEventListener('click',()=>setTimeout(()=>{
  const id=$('verifyId').value.trim().toUpperCase();
  const registered=$('verifyResult')?.textContent?.includes('REGISTERED');
  if(id&&registered)recordEvoPulse(id,'MANUAL_VERIFY');
},650));

console.info('EVO Pulse V0',{mode:'CHAINED PUBLIC OBSERVATIONS / PRIVACY FIRST / NO IP / NO LOCATION / NO DEVICE FINGERPRINT'});
