'use strict';

(()=>{
  const ENDPOINT=`${SUPABASE_URL}/functions/v1/evo-document-lifecycle`;
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  let cache={sealId:'',seal:null,events:[],checkedAt:0};
  let inFlight=false;
  let queued=false;
  let forceQueued=false;

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
    toast(t('Confirmá la firma del cambio documental. No mueve fondos.','Confirm the document lifecycle signature. It does not move funds.'));
    const signature=await walletProvider.request({method:'personal_sign',params:[signatureMessage,account]});
    const event={eventId,sealId:seal.seal_id,version:'EVO-DOCUMENT-LIFECYCLE-V1',eventType,actorWallet:actor,relatedSealId:normalizedRelated,reason:normalizedReason,eventDigest,nonce,signature,signatureMessage,createdAt};
    const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event})});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||`Document lifecycle error (${response.status})`);
    cache={sealId:'',seal:null,events:[],checkedAt:0};
    schedule(true);
    return data;
  }

  function addPublicStatus(host,events){
    const current=statusFrom(events);
    const lang=document.documentElement.lang==='en'?'en':'es';
    const renderKey=[current.code,current.event?.event_id||'',current.event?.related_seal_id||'',current.event?.reason||'',lang].join('|');
    let banner=host.querySelector('.documentLifecycleBanner');
    if(banner?.dataset.renderKey===renderKey)return;
    if(!banner){banner=document.createElement('div');banner.className='documentLifecycleBanner';const states=host.querySelector('.publicAssetStates');if(states)states.insertAdjacentElement('beforebegin',banner);else host.querySelector('.publicAssetShell')?.prepend(banner);}
    banner.dataset.renderKey=renderKey;
    banner.className=`documentLifecycleBanner is-${current.code.toLowerCase()}`;
    banner.innerHTML='';
    const copy=document.createElement('div');
    const label=document.createElement('span');label.textContent=t('ESTADO DEL DOCUMENTO','DOCUMENT STATUS');
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

  function lifecycleEventTitle(event){
    if(event.event_type==='DOCUMENT_REVOKED')return t('Documento revocado','Document revoked');
    if(event.event_type==='DOCUMENT_SUPERSEDED')return t('Versión sustituida','Version superseded');
    return t('Nota documental','Document note');
  }

  function applyDocumentPresentation(host,seal,events){
    host.classList.add('evoDocumentPublicMode');
    const desiredKicker='EVO · DOCUMENT PROOF';
    const kicker=host.querySelector('.publicAssetKicker');if(kicker&&kicker.textContent!==desiredKicker)kicker.textContent=desiredKicker;

    const infoPanel=host.querySelector('.publicAssetGrid .publicAssetPanel');
    const infoTitle=infoPanel?.querySelector('h3');
    const desiredInfoTitle=t('Identidad del documento','Document identity');
    if(infoTitle&&infoTitle.textContent!==desiredInfoTitle)infoTitle.textContent=desiredInfoTitle;

    host.querySelectorAll('.publicAssetRow').forEach(row=>{
      const label=String(row.querySelector('span')?.textContent||'').trim().toLowerCase();
      const isOwner=label==='propietario actual'||label==='current owner';
      if(row.hidden!==isOwner&&isOwner)row.hidden=true;
    });
    host.querySelectorAll('.publicAssetQuickFacts>div').forEach(item=>{
      const label=String(item.querySelector('span')?.textContent||'').trim().toLowerCase();
      const isOwner=label==='propietario'||label==='owner'||label==='wallet propietaria'||label==='owner wallet';
      if(isOwner)item.hidden=true;
    });

    const states=[...host.querySelectorAll('.publicAssetState')];
    if(states[3]){
      const label=states[3].querySelector('span');const value=states[3].querySelector('b');
      const desiredLabel=t('HISTORIAL DOCUMENTAL','DOCUMENT HISTORY');
      const count=events.length+1;
      const desiredValue=document.documentElement.lang==='en'?`${count} ${count===1?'EVENT':'EVENTS'}`:`${count} ${count===1?'EVENTO':'EVENTOS'}`;
      if(label&&label.textContent!==desiredLabel)label.textContent=desiredLabel;
      if(value&&value.textContent!==desiredValue)value.textContent=desiredValue;
    }

    const historyPanels=[...host.querySelectorAll('.publicAssetPanel')];
    const history=historyPanels.find(panel=>panel.style.gridColumn==='1 / -1'||panel.style.gridColumn==='1/-1'||/historial verificable|verifiable history/i.test(panel.querySelector('h3')?.textContent||''));
    if(history){
      const title=history.querySelector('h3');const desired=t('Historial del documento','Document history');if(title&&title.textContent!==desired)title.textContent=desired;
      let timeline=history.querySelector('.publicAssetTimeline');
      if(timeline){
        const historyKey=[seal.seal_id,...events.map(e=>`${e.event_id}:${e.event_type}:${e.reason}:${e.related_seal_id}`),document.documentElement.lang].join('|');
        if(timeline.dataset.documentHistoryKey!==historyKey){
          timeline.dataset.documentHistoryKey=historyKey;timeline.innerHTML='';
          const add=(eventTitle,detail,meta)=>{const item=document.createElement('div');item.className='publicAssetEvent';const h=document.createElement('h4');h.textContent=eventTitle;item.append(h);if(detail){const p=document.createElement('p');p.textContent=detail;item.append(p)}const small=document.createElement('small');small.textContent=meta;item.append(small);timeline.append(item)};
          add(t('Document Proof emitido','Document Proof issued'),t('El emisor registró la huella SHA-256 y firmó este registro EVO.','The issuer registered the SHA-256 fingerprint and signed this EVO record.'),`${new Date(seal.created_at).toLocaleString()} · ${String(seal.issuer_wallet||'').slice(0,8)}…`);
          events.forEach(event=>{const detail=event.event_type==='DOCUMENT_SUPERSEDED'&&event.related_seal_id?`${event.reason||''}${event.reason?' · ':''}${t('Nueva versión','New version')}: ${event.related_seal_id}`:(event.reason||'');add(lifecycleEventTitle(event),detail,`${new Date(event.registered_at||event.created_at).toLocaleString()} · ${String(event.actor_wallet||'').slice(0,8)}…`)});
        }
      }
    }

    const note=host.querySelector('.publicAssetTrustNote');
    const noteText=t('EVO demuestra que esta huella de archivo fue registrada por la wallet emisora, junto con su firma y el historial documental disponible. Esto no certifica por sí solo que el contenido sea verdadero, legalmente válido o emitido por una autoridad acreditada.','EVO demonstrates that this file fingerprint was registered by the issuer wallet, together with its signature and available document history. This alone does not certify that the content is true, legally valid, or issued by an accredited authority.');
    if(note&&note.textContent.trim()!==noteText)note.textContent=noteText;

    const share=host.querySelector('.publicAssetActions .btn.primary');
    const shareText=t('Compartir Document Proof','Share Document Proof');if(share&&share.textContent!==shareText)share.textContent=shareText;
  }

  function renderPublic(host,seal,events){
    applyDocumentPresentation(host,seal,events);
    addPublicStatus(host,events);
  }

  async function enhancePublic(force=false){
    const host=document.getElementById('publicAssetPage');if(!host?.classList.contains('ready'))return;
    const sealId=String(new URLSearchParams(location.search).get('seal')||document.getElementById('verifyId')?.value||'').trim().toUpperCase();if(!sealId)return;

    if(!force&&cache.sealId===sealId&&cache.seal&&Date.now()-cache.checkedAt<1500){renderPublic(host,cache.seal,cache.events);return;}
    if(inFlight)return;
    inFlight=true;
    try{
      const seal=await fetchSeal(sealId);if(!seal||String(seal.asset_type||'').toLowerCase()!=='documento')return;
      const events=await fetchEvents(sealId);const list=Array.isArray(events)?events:[];
      cache={sealId,seal,events:list,checkedAt:Date.now()};
      renderPublic(host,seal,list);
    }catch(error){console.warn('EVO Document Proof lifecycle unavailable',error)}finally{inFlight=false}
  }

  function schedule(force=false){
    forceQueued=forceQueued||force;
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{const runForce=forceQueued;forceQueued=false;queued=false;enhancePublic(runForce)});
  }

  const observer=new MutationObserver(()=>schedule(false));observer.observe(document.documentElement,{childList:true,subtree:true});
  document.getElementById('verifyBtn')?.addEventListener('click',()=>setTimeout(()=>schedule(true),350));
  document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(()=>schedule(true),100));
  setTimeout(()=>schedule(true),250);

  window.evoDocumentProof={fetchEvents,statusFrom,createEvent,refreshPublic:()=>schedule(true)};
})();
