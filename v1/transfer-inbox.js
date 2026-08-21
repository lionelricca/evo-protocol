'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const walletRe=/^0x[0-9a-f]{40}$/;
  const endpoint=()=>`${SUPABASE_URL}/functions/v1/evo-passport-transfer`;
  let currentWallet='';
  let signedSession=null;
  let loading=false;

  const escHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const shortWallet=value=>{const wallet=String(value||'');return wallet.length>18?`${wallet.slice(0,8)}…${wallet.slice(-6)}`:(wallet||'—')};
  const shortSeal=value=>{const seal=String(value||'');return seal.length>24?`${seal.slice(0,12)}…${seal.slice(-8)}`:seal};
  const dateText=value=>{try{return new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-US':'es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return String(value||'—')}};
  const nonce=()=>{const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('')};
  const reviewUrl=offer=>{const u=new URL(location.href);u.search='';u.hash='passport';u.searchParams.set('seal',offer.seal_id);u.searchParams.set('transfer',offer.offer_id);return u.toString()};

  async function callInbox(payload){
    const response=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'inbox',payload})});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||`Transfer Inbox (${response.status})`);
    return data;
  }

  async function assetFor(sealId){
    try{
      if(typeof fetchSeal==='function')return await fetchSeal(sealId);
    }catch{}
    return null;
  }

  function ensurePanel(){
    const dashboard=document.getElementById('myEvo');
    if(!dashboard||!dashboard.classList.contains('ready')||document.body.classList.contains('evoPublicAssetMode'))return null;
    let panel=dashboard.querySelector('.evoTransferInbox');
    if(panel)return panel;
    panel=document.createElement('section');panel.className='panel evoTransferInbox';
    const stats=dashboard.querySelector('.myEvoStats');
    if(stats?.parentNode)stats.insertAdjacentElement('afterend',panel);else dashboard.prepend(panel);
    return panel;
  }

  function lockedMarkup(){
    return `<div class="evoInboxLead"><div class="evoInboxIcon" aria-hidden="true">↘</div><div><span class="evoInboxEyebrow">TRANSFER INBOX</span><h3>${t('Transferencias pendientes','Pending transfers')}</h3><p>${t('Las ofertas dirigidas a tu wallet son privadas. Firmá una comprobación para verlas.','Offers addressed to your wallet are private. Sign a verification message to view them.')}</p></div></div><div class="evoInboxActions"><span class="evoInboxPrivacy">${t('No mueve fondos · No acepta activos','No funds moved · No asset accepted')}</span><button class="btn evoInboxUnlock" type="button">${t('Ver transferencias','View transfers')}</button></div>`;
  }

  function renderLocked(){
    const panel=ensurePanel();if(!panel)return;
    panel.className='panel evoTransferInbox locked';panel.innerHTML=lockedMarkup();
    panel.querySelector('.evoInboxUnlock')?.addEventListener('click',()=>unlockAndLoad(true));
  }

  function renderLoading(){
    const panel=ensurePanel();if(!panel)return;
    panel.className='panel evoTransferInbox loading';
    panel.innerHTML=`<div class="evoInboxLead"><div class="evoInboxIcon pulse" aria-hidden="true">↘</div><div><span class="evoInboxEyebrow">TRANSFER INBOX</span><h3>${t('Comprobando tu bandeja…','Checking your inbox…')}</h3><p>${t('EVO está validando la firma de esta wallet.','EVO is validating this wallet signature.')}</p></div></div>`;
  }

  function renderError(message){
    const panel=ensurePanel();if(!panel)return;
    panel.className='panel evoTransferInbox error';
    panel.innerHTML=`<div class="evoInboxLead"><div class="evoInboxIcon" aria-hidden="true">!</div><div><span class="evoInboxEyebrow">TRANSFER INBOX</span><h3>${t('No se pudo abrir la bandeja','Could not open inbox')}</h3><p>${escHtml(message||t('Intentá nuevamente.','Try again.'))}</p></div></div><div class="evoInboxActions"><button class="btn evoInboxRetry" type="button">${t('Reintentar','Retry')}</button></div>`;
    panel.querySelector('.evoInboxRetry')?.addEventListener('click',()=>unlockAndLoad(true));
  }

  async function offerCard(offer){
    const asset=await assetFor(offer.seal_id);
    const article=document.createElement('article');article.className='evoInboxOffer';
    const title=asset?.title||t('Activo EVO','EVO asset');
    const type=asset?.asset_type||t('Activo','Asset');
    article.innerHTML=`<div class="evoInboxOfferTop"><div><span>${escHtml(type)}</span><h4>${escHtml(title)}</h4></div><b>${t('ESPERA TU FIRMA','AWAITING YOUR SIGNATURE')}</b></div><div class="evoInboxOfferMeta"><span>${t('De','From')} · ${escHtml(shortWallet(offer.from_wallet))}</span><span>${t('Expira','Expires')} · ${escHtml(dateText(offer.expires_at))}</span></div><code title="${escHtml(offer.seal_id)}">${escHtml(shortSeal(offer.seal_id))}</code><div class="evoInboxOfferActions"><button class="btn primary" type="button">${t('Revisar y aceptar','Review & accept')}</button></div>`;
    article.querySelector('button').onclick=()=>{location.href=reviewUrl(offer)};
    return article;
  }

  async function renderOffers(offers){
    const panel=ensurePanel();if(!panel)return;
    if(!offers.length){
      panel.className='panel evoTransferInbox verified empty';
      panel.innerHTML=`<div class="evoInboxLead"><div class="evoInboxIcon ok" aria-hidden="true">✓</div><div><span class="evoInboxEyebrow">TRANSFER INBOX · VERIFIED</span><h3>${t('Sin transferencias pendientes','No pending transfers')}</h3><p>${t('No hay activos esperando aceptación para esta wallet.','No assets are waiting for acceptance by this wallet.')}</p></div></div><div class="evoInboxActions"><button class="btn evoInboxRefresh" type="button">${t('Actualizar','Refresh')}</button></div>`;
      panel.querySelector('.evoInboxRefresh')?.addEventListener('click',()=>unlockAndLoad(false));
      return;
    }
    panel.className='panel evoTransferInbox verified hasOffers';panel.textContent='';
    const head=document.createElement('div');head.className='evoInboxHeader';
    head.innerHTML=`<div><span class="evoInboxEyebrow">TRANSFER INBOX · VERIFIED</span><h3>${offers.length} ${offers.length===1?t('transferencia pendiente','pending transfer'):t('transferencias pendientes','pending transfers')}</h3><p>${t('Revisá el activo antes de aceptar. La propiedad cambia sólo después de tu segunda firma.','Review the asset before accepting. Ownership changes only after your second signature.')}</p></div><button class="btn evoInboxRefresh" type="button">${t('Actualizar','Refresh')}</button>`;
    const list=document.createElement('div');list.className='evoInboxList';panel.append(head,list);
    head.querySelector('.evoInboxRefresh').onclick=()=>unlockAndLoad(false);
    const cards=await Promise.all(offers.map(offerCard));cards.forEach(card=>list.append(card));
  }

  function validSession(wallet){return signedSession&&signedSession.wallet===wallet&&new Date(signedSession.expiresAt).getTime()>Date.now()+5000;}

  async function buildSession(wallet){
    if(typeof connectWallet==='function')await connectWallet();
    const active=String((typeof account!=='undefined'&&account)||wallet||'').toLowerCase();
    if(!walletRe.test(active))throw new Error(t('Conectá una wallet EVM.','Connect an EVM wallet.'));
    if(active!==wallet)currentWallet=active;
    if(!walletProvider?.request)throw new Error(t('La wallet no permite firmar este mensaje.','Wallet cannot sign this message.'));
    const issuedAt=new Date().toISOString();
    const expiresAt=new Date(Date.now()+5*60*1000).toISOString();
    const n=nonce();const origin=location.origin;
    const signatureMessage=`EVO TRANSFER INBOX V1\nWallet: ${active}\nOrigin: ${origin}\nNonce: ${n}\nIssued: ${issuedAt}\nExpires: ${expiresAt}`;
    if(typeof toast==='function')toast(t('Firmá para ver tus transferencias pendientes. No mueve fondos.','Sign to view pending transfers. No funds are moved.'));
    const signature=await walletProvider.request({method:'personal_sign',params:[signatureMessage,active]});
    signedSession={wallet:active,origin,issuedAt,expiresAt,nonce:n,signature,signatureMessage};
    return signedSession;
  }

  async function unlockAndLoad(forceSign=false){
    if(loading)return;loading=true;
    try{
      let wallet=String(currentWallet||(typeof account!=='undefined'?account:'')||'').toLowerCase();
      if(!walletRe.test(wallet)){
        if(typeof connectWallet==='function')await connectWallet();
        wallet=String((typeof account!=='undefined'?account:'')||'').toLowerCase();
      }
      if(!walletRe.test(wallet))throw new Error(t('Conectá tu wallet primero.','Connect your wallet first.'));
      currentWallet=wallet;renderLoading();
      const session=forceSign||!validSession(wallet)?await buildSession(wallet):signedSession;
      const data=await callInbox(session);
      await renderOffers(Array.isArray(data.offers)?data.offers:[]);
    }catch(error){
      if(String(error?.code||'')==='4001')renderLocked();
      else renderError(error?.message||String(error));
    }finally{loading=false;}
  }

  function sync(){
    const wallet=String((typeof account!=='undefined'?account:'')||currentWallet||'').toLowerCase();
    if(!walletRe.test(wallet))return;
    if(currentWallet&&currentWallet!==wallet)signedSession=null;
    currentWallet=wallet;
    const panel=ensurePanel();if(!panel)return;
    if(panel.dataset.evoInboxWallet===wallet)return;
    panel.dataset.evoInboxWallet=wallet;
    if(validSession(wallet))unlockAndLoad(false);else renderLocked();
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(sync));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('evo:wallet-connected',event=>{const wallet=String(event.detail?.account||'').toLowerCase();if(wallet!==currentWallet)signedSession=null;currentWallet=wallet;const panel=document.querySelector('.evoTransferInbox');if(panel)delete panel.dataset.evoInboxWallet;setTimeout(sync,80)});
  window.addEventListener('evo:wallet-disconnected',()=>{currentWallet='';signedSession=null;document.querySelector('.evoTransferInbox')?.remove()});
  window.evoRefreshTransferInbox=()=>unlockAndLoad(false);
  setTimeout(sync,100);
})();