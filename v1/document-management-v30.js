'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const sealRe=/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
  let activeSeal='';
  let refreshToken=0;

  const shortWallet=value=>{const w=String(value||'');return w.length>18?`${w.slice(0,8)}…${w.slice(-6)}`:(w||'—')};
  const dateText=value=>{if(!value)return '—';try{return new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-US':'es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return String(value)}};
  const escText=value=>String(value||'');

  function section(){return document.getElementById('passport')}
  function currentSeal(){return String(document.getElementById('passportSealId')?.value||'').trim().toUpperCase()}

  function ensurePanel(){
    const host=section();if(!host)return null;
    let panel=host.querySelector('.documentManagePanel');
    if(panel)return panel;
    panel=document.createElement('div');panel.className='panel documentManagePanel';panel.hidden=true;
    const bar=host.querySelector('.evoManageBar');
    const grid=host.querySelector(':scope > .grid');
    if(bar)bar.insertAdjacentElement('afterend',panel);else if(grid)host.insertBefore(panel,grid);else host.prepend(panel);
    return panel;
  }

  function setAssetMode(){
    const host=section();if(host)host.classList.remove('evoDocumentManageMode');
    const panel=host?.querySelector('.documentManagePanel');if(panel)panel.hidden=true;
    const bar=host?.querySelector('.evoManageBar');
    if(bar){
      bar.querySelector('.evoManageEvent')?.removeAttribute('hidden');
      bar.querySelector('.evoManageTransfer')?.removeAttribute('hidden');
    }
    activeSeal='';
  }

  function adaptManageBar(seal){
    const host=section();const bar=host?.querySelector('.evoManageBar');if(!bar)return;
    const sealId=String(seal?.seal_id||'').toUpperCase();
    if(bar.dataset.seal&&String(bar.dataset.seal).toUpperCase()!==sealId)return;
    const eyebrow=bar.querySelector('.evoManageEyebrow');if(eyebrow)eyebrow.textContent=t('GESTIONANDO DOCUMENT PROOF','MANAGING DOCUMENT PROOF');
    const title=bar.querySelector('.evoManageCopy > b');if(title)title.textContent=seal.title||t('Documento EVO','EVO document');
    const eventBtn=bar.querySelector('.evoManageEvent');if(eventBtn)eventBtn.hidden=true;
    const transferBtn=bar.querySelector('.evoManageTransfer');if(transferBtn)transferBtn.hidden=true;
  }

  function statusCopy(state){
    if(state.code==='REVOKED')return {
      label:t('DOCUMENTO REVOCADO','REVOKED DOCUMENT'),
      text:t('El emisor retiró la vigencia de este Document Proof. El registro histórico permanece verificable.','The issuer withdrew this Document Proof. Its historical record remains verifiable.')
    };
    if(state.code==='SUPERSEDED')return {
      label:t('VERSIÓN SUSTITUIDA','SUPERSEDED VERSION'),
      text:t('El emisor vinculó este documento con una versión posterior. La versión anterior permanece en el historial.','The issuer linked this document to a newer version. The older version remains in history.')
    };
    return {
      label:t('DOCUMENTO ACTIVO','ACTIVE DOCUMENT'),
      text:t('No existe una revocación ni una versión sustituta registrada en EVO.','No revocation or replacement version is registered in EVO.')
    };
  }

  function eventTitle(event){
    if(event.event_type==='DOCUMENT_REVOKED')return t('Documento revocado','Document revoked');
    if(event.event_type==='DOCUMENT_SUPERSEDED')return t('Versión sustituida','Version superseded');
    return t('Nota documental','Document note');
  }

  function renderHistory(events){
    if(!events.length)return `<div class="documentManageEmpty">${t('Sin eventos posteriores a la emisión.','No lifecycle events after issuance.')}</div>`;
    return `<div class="documentManageTimeline">${events.map(event=>`<div class="documentManageEvent"><span>${eventTitle(event)}</span><b>${escText(event.reason)||'—'}</b>${event.related_seal_id?`<code>${escText(event.related_seal_id)}</code>`:''}<small>${dateText(event.registered_at||event.created_at)} · ${shortWallet(event.actor_wallet)}</small></div>`).join('')}</div>`;
  }

  function versionUrl(sealId){const u=new URL(location.href);u.search='';u.hash='verify';u.searchParams.set('seal',sealId);return u.toString()}

  async function handleRevoke(seal,panel){
    const reason=String(panel.querySelector('#documentRevokeReason')?.value||'').trim();
    if(reason.length<3)throw new Error(t('Indicá el motivo de la revocación.','Enter the revocation reason.'));
    if(!window.confirm(t('Esta revocación quedará registrada permanentemente en el historial. ¿Continuar?','This revocation will remain permanently in the history. Continue?')))return;
    const button=panel.querySelector('#documentRevokeBtn');if(button){button.disabled=true;button.textContent=t('Esperando firma…','Waiting for signature…');}
    try{
      await window.evoDocumentProof.createEvent({sealId:seal.seal_id,eventType:'DOCUMENT_REVOKED',reason});
      toast(t('Documento revocado','Document revoked'));await refresh(true);
    }finally{if(button){button.disabled=false;button.textContent=t('Revocar documento','Revoke document');}}
  }

  async function handleSupersede(seal,panel){
    const replacement=String(panel.querySelector('#documentReplacementSeal')?.value||'').trim().toUpperCase();
    const reason=String(panel.querySelector('#documentSupersedeReason')?.value||'').trim();
    if(!sealRe.test(replacement))throw new Error(t('Ingresá el EVO ID de la nueva versión.','Enter the EVO ID of the new version.'));
    if(reason.length<3)throw new Error(t('Indicá por qué esta versión fue sustituida.','Explain why this version was superseded.'));
    const button=panel.querySelector('#documentSupersedeBtn');if(button){button.disabled=true;button.textContent=t('Esperando firma…','Waiting for signature…');}
    try{
      await window.evoDocumentProof.createEvent({sealId:seal.seal_id,eventType:'DOCUMENT_SUPERSEDED',relatedSealId:replacement,reason});
      toast(t('Nueva versión vinculada','New version linked'));await refresh(true);
    }finally{if(button){button.disabled=false;button.textContent=t('Marcar como sustituido','Mark as superseded');}}
  }

  function render(panel,seal,events){
    const state=window.evoDocumentProof.statusFrom(events);
    const copy=statusCopy(state);
    const issuer=String(seal.issuer_wallet||'').toLowerCase();
    const connected=String(typeof account!=='undefined'?account:'').toLowerCase();
    const canManage=Boolean(connected&&issuer&&connected===issuer&&state.code==='ACTIVE');
    const related=state.event?.related_seal_id||'';

    panel.hidden=false;
    panel.innerHTML=`
      <div class="documentManageHeader">
        <div><span class="kicker">DOCUMENT CONTROL</span><h3>${escText(seal.title||t('Document Proof','Document Proof'))}</h3><code>${escText(seal.seal_id)}</code></div>
        <span class="documentManageStatus is-${state.code.toLowerCase()}">${copy.label}</span>
      </div>
      <p class="documentManageMeaning">${copy.text}</p>
      <div class="documentManageFacts">
        <div><span>${t('EMISOR','ISSUER')}</span><b>${escText(seal.issuer_label||shortWallet(issuer))}</b></div>
        <div><span>${t('WALLET EMISORA','ISSUER WALLET')}</span><code>${shortWallet(issuer)}</code></div>
        <div><span>SHA-256</span><code>${escText(seal.asset_hash||'—')}</code></div>
      </div>
      ${related?`<div class="documentManageCurrent"><span>${t('VERSIÓN VIGENTE','CURRENT VERSION')}</span><code>${escText(related)}</code><a class="btn primary" href="${versionUrl(related)}">${t('Abrir versión vigente','Open current version')}</a></div>`:''}
      <div class="documentManageHistory"><h4>${t('Historial documental','Document history')}</h4>${renderHistory(events)}</div>
      ${state.code==='ACTIVE'?`<div class="documentManageActions" ${canManage?'':'data-readonly="true"'}>
        <div class="documentManageAction"><span>${t('REVOCAR','REVOKE')}</span><p>${t('Usalo si el documento deja de ser válido. La prueba original no se borra.','Use when the document is no longer valid. The original proof is not deleted.')}</p><textarea id="documentRevokeReason" maxlength="1200" placeholder="${t('Motivo de revocación','Revocation reason')}" ${canManage?'':'disabled'}></textarea><button id="documentRevokeBtn" class="btn" type="button" ${canManage?'':'disabled'}>${t('Revocar documento','Revoke document')}</button></div>
        <div class="documentManageAction"><span>${t('NUEVA VERSIÓN','NEW VERSION')}</span><p>${t('Creá primero el nuevo Document Proof y vinculalo desde aquí.','Create the new Document Proof first, then link it here.')}</p><input id="documentReplacementSeal" class="mono" placeholder="EVO-XXXXXXXX-XXXXXXXX-XXXXXXXX" ${canManage?'':'disabled'}><textarea id="documentSupersedeReason" maxlength="1200" placeholder="${t('Motivo / cambio de versión','Reason / version change')}" ${canManage?'':'disabled'}></textarea><button id="documentSupersedeBtn" class="btn primary" type="button" ${canManage?'':'disabled'}>${t('Marcar como sustituido','Mark as superseded')}</button></div>
      </div>${canManage?'':`<div class="documentManageReadonly">${t('Sólo la wallet emisora original puede cambiar el estado de este documento.','Only the original issuer wallet can change this document status.')}</div>`}`:''}
    `;

    panel.querySelector('#documentRevokeBtn')?.addEventListener('click',()=>handleRevoke(seal,panel).catch(error=>{toast(error.message||String(error))}));
    panel.querySelector('#documentSupersedeBtn')?.addEventListener('click',()=>handleSupersede(seal,panel).catch(error=>{toast(error.message||String(error))}));
  }

  async function refresh(force=false){
    if(document.body.classList.contains('evoPublicAssetMode'))return setAssetMode();
    if(!window.evoDocumentProof||typeof fetchSeal!=='function')return;
    const sealId=currentSeal();
    if(!sealRe.test(sealId))return setAssetMode();
    if(!force&&sealId===activeSeal&&section()?.classList.contains('evoDocumentManageMode'))return;
    const token=++refreshToken;
    try{
      const seal=await fetchSeal(sealId);if(token!==refreshToken)return;
      if(!seal||String(seal.asset_type||'').toLowerCase()!=='documento')return setAssetMode();
      const events=await window.evoDocumentProof.fetchEvents(sealId);if(token!==refreshToken)return;
      activeSeal=sealId;
      const host=section();host?.classList.add('evoDocumentManageMode');
      adaptManageBar(seal);
      const panel=ensurePanel();if(panel)render(panel,seal,Array.isArray(events)?events:[]);
    }catch(error){console.warn('EVO Document Proof management unavailable',error);}
  }

  function schedule(force=false){setTimeout(()=>refresh(force),force?40:260)}
  document.getElementById('passportLoadBtn')?.addEventListener('click',()=>schedule(true));
  document.getElementById('passportSealId')?.addEventListener('change',()=>schedule(true));
  document.addEventListener('click',event=>{if(event.target.closest('.myEvoManageAsset'))schedule(true)},true);
  window.addEventListener('evo:wallet-connected',()=>schedule(true));
  window.addEventListener('evo:wallet-disconnected',()=>schedule(true));
  document.getElementById('languageSelect')?.addEventListener('change',()=>schedule(true));
  window.addEventListener('hashchange',()=>schedule(true));

  let attempts=0;const wait=setInterval(()=>{attempts++;if(window.evoDocumentProof){clearInterval(wait);schedule(true)}else if(attempts>80)clearInterval(wait)},125);
  window.evoRefreshDocumentManagement=()=>refresh(true);
})();
