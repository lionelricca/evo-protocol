'use strict';

(()=>{
  const ENDPOINT=`${SUPABASE_URL}/functions/v1/evo-document-lifecycle`;
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;

  async function fetchEvents(sealId){
    const url=new URL(`${SUPABASE_URL}/rest/v1/evo_document_events`);
    url.searchParams.set('seal_id',`eq.${String(sealId||'').toUpperCase()}`);
    url.searchParams.set('status','eq.ACTIVE');
    url.searchParams.set('select','event_id,seal_id,event_type,actor_wallet,related_seal_id,reason,created_at,registered_at,status');
    url.searchParams.set('order','registered_at.asc');
    const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
    if(!response.ok)throw new Error(`Document lifecycle error (${response.status})`);
    return response.json();
  }

  function statusFrom(events){
    const terminal=[...events].reverse().find(event=>event.event_type==='DOCUMENT_REVOKED'||event.event_type==='DOCUMENT_SUPERSEDED');
    if(!terminal)return {code:'ACTIVE',event:null};
    return terminal.event_type==='DOCUMENT_REVOKED'?{code:'REVOKED',event:terminal}:{code:'SUPERSEDED',event:terminal};
  }

  async function createEvent({sealId,eventType,relatedSealId='',reason=''}){
    if(!account||!walletProvider)await connectWallet();
    const seal=await fetchSeal(String(sealId||'').toUpperCase());
    if(!seal)throw new Error(t('Documento no encontrado.','Document not found.'));
    if(String(seal.asset_type||'').toLowerCase()!=='documento')throw new Error(t('Este registro no es un Document Proof.','This record is not a Document Proof.'));
    const actor=String(account||'').toLowerCase();
    if(actor!==String(seal.issuer_wallet||'').toLowerCase())throw new Error(t('Sólo el emisor original puede cambiar el estado del documento.','Only the original issuer can change document status.'));

    const createdAt=new Date().toISOString();
    const nonce=rand();
    const normalizedRelated=String(relatedSealId||'').trim().toUpperCase();
    const normalizedReason=String(reason||'').trim();
    const eventDigest=await shaText([seal.seal_id,eventType,actor,normalizedRelated,normalizedReason,createdAt,nonce].join('|'));
    const eventId=`EVD-${eventDigest.slice(0,8).toUpperCase()}-${eventDigest.slice(8,16).toUpperCase()}-${eventDigest.slice(16,24).toUpperCase()}`;
    const signatureMessage=`EVO DOCUMENT LIFECYCLE V1\nEvent ID: ${eventId}\nSeal ID: ${seal.seal_id}\nType: ${eventType}\nActor: ${actor}\nRelated seal: ${normalizedRelated||'N/A'}\nDigest: ${eventDigest}\nCreated: ${createdAt}`;
    const signature=await walletProvider.request({method:'personal_sign',params:[signatureMessage,account]});
    const event={eventId,sealId:seal.seal_id,version:'EVO-DOCUMENT-LIFECYCLE-V1',eventType,actorWallet:actor,relatedSealId:normalizedRelated,reason:normalizedReason,eventDigest,nonce,signature,signatureMessage,createdAt};
    const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event})});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||`Document lifecycle error (${response.status})`);
    return data;
  }

  function addPublicStatus(host,seal,events){
    const current=statusFrom(events);
    let banner=host.querySelector('.documentLifecycleBanner');
    if(!banner){banner=document.createElement('div');banner.className='documentLifecycleBanner';const states=host.querySelector('.publicAssetStates');if(states)states.insertAdjacentElement('beforebegin',banner);else host.querySelector('.publicAssetShell')?.prepend(banner);}
    banner.className=`documentLifecycleBanner is-${current.code.toLowerCase()}`;
    banner.innerHTML='';
    const copy=document.createElement('div');
    const label=document.createElement('span');label.textContent='DOCUMENT STATUS';
    const title=document.createElement('b');
    const detail=document.createElement('small');
    if(current.code==='ACTIVE'){
      title.textContent=t('DOCUMENTO ACTIVO','ACTIVE DOCUMENT');
      detail.textContent=t('No existe una revocación ni una versión sustituta registrada en EVO.','No revocation or replacement version is registered in EVO.');
    }else if(current.code==='REVOKED'){
      title.textContent=t('DOCUMENTO REVOCADO','REVOKED DOCUMENT');
      detail.textContent=current.event?.reason||t('El emisor revocó este Document Proof.','The issuer revoked this Document Proof.');
    }else{
      title.textContent=t('VERSIÓN SUSTITUIDA','SUPERSEDED VERSION');
      detail.textContent=current.event?.reason||t('Existe una versión posterior emitida por el mismo emisor.','A newer version exists from the same issuer.');
    }
    copy.append(label,title,detail);banner.append(copy);
    if(current.code==='SUPERSEDED'&&current.event?.related_seal_id){
      const link=document.createElement('a');link.className='btn primary';link.textContent=t('Ver versión vigente','View current version');const u=new URL(location.href);u.search='';u.hash='verify';u.searchParams.set('seal',current.event.related_seal_id);link.href=u.toString();banner.append(link);
    }
    host.dataset.documentStatus=current.code;
  }

  async function enhancePublic(){
    const host=document.getElementById('publicAssetPage');if(!host?.classList.contains('ready'))return;
    const sealId=String(new URLSearchParams(location.search).get('seal')||document.getElementById('verifyId')?.value||'').trim().toUpperCase();if(!sealId)return;
    try{
      const seal=await fetchSeal(sealId);if(!seal||String(seal.asset_type||'').toLowerCase()!=='documento')return;
      const events=await fetchEvents(sealId);addPublicStatus(host,seal,Array.isArray(events)?events:[]);
    }catch(error){console.warn('EVO Document Proof lifecycle unavailable',error);}
  }

  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhancePublic();});};
  const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
  document.getElementById('verifyBtn')?.addEventListener('click',()=>setTimeout(schedule,350));
  document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(schedule,100));
  setTimeout(schedule,250);

  window.evoDocumentProof={fetchEvents,statusFrom,createEvent};
})();
