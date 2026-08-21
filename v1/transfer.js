const TRANSFER_URL=`${SUPABASE_URL}/functions/v1/evo-passport-transfer`;

async function transferCall(action,payload){
  const r=await fetch(TRANSFER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload})});
  let data={};try{data=await r.json()}catch{}
  if(!r.ok)throw new Error(data.error||`Error de transferencia (${r.status})`);
  return data;
}

async function fetchTransferOffer(offerId){
  try{
    const data=await transferCall('lookup',{offerId:String(offerId||'').toUpperCase()});
    return data.offer||null;
  }catch(e){
    if(e.message==='offer_not_found')return null;
    throw e;
  }
}

function transferLink(offer){
  const u=new URL(location.href);u.search='';u.hash='passport';u.searchParams.set('seal',offer.seal_id||offer.sealId);u.searchParams.set('transfer',offer.offer_id||offer.offerId);return u.toString();
}

function transferOfferMarkup(o){
  const pending=o.status==='PENDING';
  return `<span class="status ${pending?'warn':o.status==='ACCEPTED'?'ok':'bad'}">${esc(o.status)}</span>
    <div class="kv"><span>Offer ID</span><b class="mono">${esc(o.offer_id)}</b></div>
    <div class="kv"><span>Seal ID</span><b class="mono">${esc(o.seal_id)}</b></div>
    <div class="kv"><span>De</span><span class="mono">${esc(o.from_wallet)}</span></div>
    <div class="kv"><span>Para</span><span class="mono">${esc(o.to_wallet)}</span></div>
    <div class="kv"><span>Expira</span><span>${esc(o.expires_at)}</span></div>
    ${pending?`<div class="transferActions"><button id="acceptTransferBtn" class="btn primary" type="button">Aceptar con wallet destino</button><button id="cancelTransferBtn" class="btn" type="button">Cancelar con wallet origen</button><button id="copyTransferLinkBtn" class="btn gold" type="button">Copiar enlace</button></div>`:''}`;
}

async function showTransferOffer(offerId){
  const out=$('incomingTransfer');
  out.className='result';out.textContent='Consultando oferta de transferencia…';
  try{
    const o=await fetchTransferOffer(offerId);
    if(!o){out.innerHTML='<span class="status bad">✕ UNKNOWN</span><p>La oferta no existe.</p>';return}
    out.innerHTML=transferOfferMarkup(o);
    const copy=$('copyTransferLinkBtn');if(copy)copy.onclick=()=>navigator.clipboard.writeText(transferLink(o)).then(()=>toast('Enlace de transferencia copiado'));
    const accept=$('acceptTransferBtn');if(accept)accept.onclick=()=>acceptTransfer(o);
    const cancel=$('cancelTransferBtn');if(cancel)cancel.onclick=()=>cancelTransfer(o);
  }catch(e){out.innerHTML=`<span class="status bad">✕ ERROR</span><p>${esc(e.message||String(e))}</p>`}
}

$('createTransferOfferBtn').onclick=async()=>{
  const out=$('transferOfferResult');
  try{
    await connectWallet();
    const sealId=$('passportSealId').value.trim().toUpperCase();if(!sealId)throw new Error('Cargá primero un EVO Passport.');
    const seal=await fetchSeal(sealId);if(!seal)throw new Error('Ese sello no existe o no está activo.');
    const events=await fetchPassportEvents(sealId);const owner=currentOwnerFrom(seal,events);
    const fromWallet=account.toLowerCase();if(fromWallet!==owner)throw new Error(`Sólo el propietario actual puede ofrecer la transferencia. Propietario: ${shortWallet(owner)}`);
    const toWallet=$('transferToWallet').value.trim().toLowerCase();
    if(!/^0x[0-9a-f]{40}$/.test(toWallet))throw new Error('Ingresá una wallet EVM destino válida.');
    if(toWallet===fromWallet)throw new Error('La wallet destino debe ser diferente.');
    const createdAt=new Date().toISOString();const expiresAt=new Date(Date.now()+24*60*60*1000).toISOString();const nonce=rand();
    const offerDigest=await shaText([sealId,fromWallet,toWallet,createdAt,expiresAt,nonce].join('|'));
    const offerId=`EVX-${offerDigest.slice(0,8).toUpperCase()}-${offerDigest.slice(8,16).toUpperCase()}-${offerDigest.slice(16,24).toUpperCase()}`;
    const signatureMessage=`EVO PASSPORT TRANSFER OFFER V1\nOffer ID: ${offerId}\nSeal ID: ${sealId}\nFrom: ${fromWallet}\nTo: ${toWallet}\nDigest: ${offerDigest}\nExpires: ${expiresAt}\nCreated: ${createdAt}`;
    toast('Firmá la OFERTA. Todavía no cambia la propiedad ni mueve fondos.');
    const signature=await walletProvider.request({method:'personal_sign',params:[signatureMessage,account]});
    const payload={offerId,sealId,fromWallet,toWallet,createdAt,expiresAt,nonce,offerDigest,signature,signatureMessage};
    await transferCall('offer',payload);
    const offer=await fetchTransferOffer(offerId);
    out.className='result';out.innerHTML=`<span class="status warn">✓ OFFER PENDING</span><div class="kv"><span>Offer ID</span><b class="mono">${esc(offerId)}</b></div><div class="kv"><span>Destino</span><span class="mono">${esc(toWallet)}</span></div><p>La propiedad NO cambió. La wallet destino debe aceptar.</p><div class="actions"><button id="copyNewTransferLink" class="btn gold" type="button">Copiar enlace para aceptar</button></div>`;
    $('copyNewTransferLink').onclick=()=>navigator.clipboard.writeText(transferLink(offer)).then(()=>toast('Enlace copiado'));
    await showTransferOffer(offerId);toast('Oferta creada. Esperando segunda firma.');
  }catch(e){out.className='result';out.innerHTML=`<span class="status bad">✕ OFERTA NO CREADA</span><p>${esc(e.message||String(e))}</p>`}
};

async function acceptTransfer(o){
  try{
    await connectWallet();
    const actorWallet=account.toLowerCase();if(actorWallet!==String(o.to_wallet).toLowerCase())throw new Error(`Esta oferta sólo puede aceptarla ${shortWallet(o.to_wallet)}.`);
    const createdAt=new Date().toISOString();const nonce=rand();
    const acceptDigest=await shaText([o.offer_id,o.seal_id,String(o.from_wallet).toLowerCase(),String(o.to_wallet).toLowerCase(),o.offer_digest,createdAt,nonce].join('|'));
    const signatureMessage=`EVO PASSPORT TRANSFER ACCEPT V1\nOffer ID: ${o.offer_id}\nSeal ID: ${o.seal_id}\nFrom: ${String(o.from_wallet).toLowerCase()}\nTo: ${String(o.to_wallet).toLowerCase()}\nOffer digest: ${o.offer_digest}\nAcceptance digest: ${acceptDigest}\nAccepted: ${createdAt}`;
    toast('Firmá la ACEPTACIÓN. No mueve EVO ni POL.');
    const signature=await walletProvider.request({method:'personal_sign',params:[signatureMessage,account]});
    await transferCall('accept',{offerId:o.offer_id,actorWallet,createdAt,nonce,acceptDigest,signature,signatureMessage});
    await showTransferOffer(o.offer_id);await loadPassport();toast('Transferencia aceptada. La propiedad cambió.');
  }catch(e){toast(e.message||'No se pudo aceptar');$('incomingTransfer').insertAdjacentHTML('beforeend',`<p><span class="status bad">✕ ${esc(e.message||String(e))}</span></p>`)}
}

async function cancelTransfer(o){
  try{
    await connectWallet();
    const actorWallet=account.toLowerCase();if(actorWallet!==String(o.from_wallet).toLowerCase())throw new Error('Sólo la wallet de origen puede cancelar esta oferta.');
    const createdAt=new Date().toISOString();const nonce=rand();
    const cancelDigest=await shaText([o.offer_id,o.seal_id,actorWallet,String(o.to_wallet).toLowerCase(),o.offer_digest,createdAt,nonce].join('|'));
    const signatureMessage=`EVO PASSPORT TRANSFER CANCEL V1\nOffer ID: ${o.offer_id}\nSeal ID: ${o.seal_id}\nFrom: ${actorWallet}\nTo: ${String(o.to_wallet).toLowerCase()}\nOffer digest: ${o.offer_digest}\nCancel digest: ${cancelDigest}\nCancelled: ${createdAt}`;
    toast('Firmá la cancelación. No mueve fondos.');
    const signature=await walletProvider.request({method:'personal_sign',params:[signatureMessage,account]});
    await transferCall('cancel',{offerId:o.offer_id,actorWallet,createdAt,nonce,cancelDigest,signature,signatureMessage});
    await showTransferOffer(o.offer_id);toast('Oferta cancelada');
  }catch(e){toast(e.message||'No se pudo cancelar')}
}

const transferQuery=new URLSearchParams(location.search).get('transfer');
if(transferQuery)setTimeout(()=>showTransferOffer(transferQuery.toUpperCase()),650);

console.info('EVO Passport Transfer V2',{mode:'TWO PARTY SIGNATURE / 24H OFFER / CANCELLABLE / NO TOKEN MOVEMENT'});
