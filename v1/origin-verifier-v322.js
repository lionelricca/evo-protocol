'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const HEX64=/^[a-f0-9]{64}$/;
  const MAX_CHAIN=6;
  let current={sealId:'',seal:null,chain:null,panel:null,token:0};
  let queued=false;

  const el=(tag,className,text)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=String(text);
    return node;
  };

  const sealFromPage=()=>String(
    new URLSearchParams(location.search).get('seal')||document.getElementById('verifyId')?.value||''
  ).trim().toUpperCase();

  const normalizeDigest=value=>{
    const digest=String(value||'').trim().toLowerCase();
    return HEX64.test(digest)?digest:'';
  };

  const sameIssuer=(a,b)=>String(a?.issuer_wallet||'').toLowerCase()===String(b?.issuer_wallet||'').toLowerCase();

  const publicUrl=sealId=>{
    const url=new URL(location.href);
    url.search='';
    url.hash='verify';
    url.searchParams.set('seal',sealId);
    if(document.documentElement.lang==='en')url.searchParams.set('lang','en');
    return url.toString();
  };

  async function hashFile(file){
    if(!file)throw new Error('missing_file');
    if(!crypto?.subtle)throw new Error('web_crypto_unavailable');
    const bytes=await file.arrayBuffer();
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
  }

  async function fetchDocumentEvents(sealId){
    const url=new URL(`${SUPABASE_URL}/rest/v1/evo_document_events`);
    url.searchParams.set('seal_id',`eq.${sealId}`);
    url.searchParams.set('status','eq.ACTIVE');
    url.searchParams.set('select','event_id,seal_id,event_type,related_seal_id,reason,registered_at,created_at,status');
    url.searchParams.set('order','registered_at.asc');
    const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
    if(!response.ok)throw new Error(`document_events_${response.status}`);
    return response.json();
  }

  async function fetchPredecessors(sealId){
    const url=new URL(`${SUPABASE_URL}/rest/v1/evo_document_events`);
    url.searchParams.set('related_seal_id',`eq.${sealId}`);
    url.searchParams.set('event_type','eq.DOCUMENT_SUPERSEDED');
    url.searchParams.set('status','eq.ACTIVE');
    url.searchParams.set('select','seal_id,related_seal_id,registered_at');
    url.searchParams.set('order','registered_at.desc');
    url.searchParams.set('limit','8');
    const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
    if(!response.ok)throw new Error(`document_predecessors_${response.status}`);
    return response.json();
  }

  async function buildVersionChain(root){
    const visited=new Set([root.seal_id]);
    const older=[];
    const newer=[];

    let cursor=root;
    for(let step=0;step<MAX_CHAIN;step+=1){
      const links=await fetchPredecessors(cursor.seal_id);
      let found=null;
      for(const link of links){
        const candidateId=String(link.seal_id||'').toUpperCase();
        if(!candidateId||visited.has(candidateId))continue;
        const candidate=await fetchSeal(candidateId);
        if(candidate&&String(candidate.asset_type||'').toLowerCase()==='documento'&&sameIssuer(candidate,root)){
          found=candidate;break;
        }
      }
      if(!found)break;
      older.unshift(found);visited.add(found.seal_id);cursor=found;
    }

    cursor=root;
    for(let step=0;step<MAX_CHAIN;step+=1){
      const events=await fetchDocumentEvents(cursor.seal_id);
      const transition=[...events].reverse().find(event=>event.event_type==='DOCUMENT_SUPERSEDED'&&event.related_seal_id);
      const candidateId=String(transition?.related_seal_id||'').toUpperCase();
      if(!candidateId||visited.has(candidateId))break;
      const candidate=await fetchSeal(candidateId);
      if(!candidate||String(candidate.asset_type||'').toLowerCase()!=='documento'||!sameIssuer(candidate,root))break;
      newer.push(candidate);visited.add(candidate.seal_id);cursor=candidate;
    }

    const versions=[...older,root,...newer];
    return {versions,currentIndex:older.length};
  }

  function state(panel,kind,label,title,detail,localDigest='',registeredDigest='',action=null){
    const out=panel.querySelector('.originVerifierResult');
    out.className=`originVerifierResult is-${kind}`;
    out.textContent='';
    const status=el('span','originVerifierStatus',label);
    const h=el('b','originVerifierTitle',title);
    const p=el('p','originVerifierDetail',detail);
    out.append(status,h,p);
    if(localDigest||registeredDigest){
      const hashes=el('div','originVerifierHashes');
      if(localDigest){const row=el('div');row.append(el('span','',t('SHA-256 local','Local SHA-256')),el('code','mono',localDigest));hashes.append(row);}
      if(registeredDigest){const row=el('div');row.append(el('span','',t('SHA-256 registrado','Registered SHA-256')),el('code','mono',registeredDigest));hashes.append(row);}
      out.append(hashes);
    }
    if(action)out.append(action);
  }

  function readyState(panel,seal){
    const registered=normalizeDigest(seal.asset_hash);
    if(!registered){
      state(panel,'unavailable',t('SIN HUELLA','NO FINGERPRINT'),t('Este registro no tiene un hash de archivo','This record has no file hash'),t('EVO puede mostrar el registro, pero no puede comparar el archivo exacto porque no se registró una huella SHA-256.','EVO can show the record, but cannot compare the exact file because no SHA-256 fingerprint was registered.'));
      return;
    }
    state(panel,'ready',t('LISTO','READY'),t('Comprobá el archivo que recibiste','Check the file you received'),t('Arrastralo aquí o elegilo desde tu dispositivo. EVO calcula SHA-256 localmente y compara la huella con las versiones documentales registradas.','Drop it here or choose it from your device. EVO calculates SHA-256 locally and compares the fingerprint with registered document versions.'));
  }

  function versionAction(seal){
    const link=el('a','btn primary',t('Abrir esa versión','Open that version'));
    link.href=publicUrl(seal.seal_id);
    return link;
  }

  async function compareFile(panel,seal,file){
    if(!file)return;
    const token=++current.token;
    const registered=normalizeDigest(seal.asset_hash);
    if(!registered){readyState(panel,seal);return;}
    state(panel,'checking',t('ANALIZANDO','CHECKING'),t('Calculando huella SHA-256…','Calculating SHA-256 fingerprint…'),t('El archivo permanece en este dispositivo.','The file stays on this device.'));
    try{
      const localDigest=await hashFile(file);
      if(token!==current.token)return;
      let chain=current.chain;
      if(!chain){
        try{chain=await buildVersionChain(seal);current.chain=chain;}catch(error){console.warn('EVO Origin version chain unavailable',error);chain={versions:[seal],currentIndex:0};}
      }
      if(token!==current.token)return;

      const currentDigest=normalizeDigest(seal.asset_hash);
      if(localDigest===currentDigest){
        let events=[];try{events=await fetchDocumentEvents(seal.seal_id);}catch{}
        const terminal=[...events].reverse().find(event=>event.event_type==='DOCUMENT_REVOKED'||event.event_type==='DOCUMENT_SUPERSEDED');
        if(terminal?.event_type==='DOCUMENT_REVOKED'){
          state(panel,'warning',t('COINCIDENCIA EXACTA · REVOCADO','EXACT MATCH · REVOKED'),t('El archivo coincide exactamente con esta versión revocada','The file exactly matches this revoked version'),terminal.reason||t('La huella coincide, pero el emisor revocó este Document Proof.','The fingerprint matches, but the issuer revoked this Document Proof.'),localDigest,currentDigest);
        }else if(terminal?.event_type==='DOCUMENT_SUPERSEDED'){
          state(panel,'warning',t('COINCIDENCIA EXACTA · SUSTITUIDO','EXACT MATCH · SUPERSEDED'),t('El archivo coincide con esta versión anterior','The file matches this previous version'),t('La integridad es correcta, pero EVO registra una versión posterior.','Integrity is correct, but EVO records a newer version.'),localDigest,currentDigest,terminal.related_seal_id?versionAction({seal_id:terminal.related_seal_id}):null);
        }else{
          state(panel,'match',t('✓ COINCIDENCIA EXACTA','✓ EXACT FILE MATCH'),t('Este es exactamente el archivo registrado','This is exactly the registered file'),t('Los bytes del archivo producen la misma huella SHA-256 registrada en EVO.','The file bytes produce the same SHA-256 fingerprint registered in EVO.'),localDigest,currentDigest);
        }
        return;
      }

      const versions=chain?.versions||[seal];
      const other=versions.find(version=>version.seal_id!==seal.seal_id&&normalizeDigest(version.asset_hash)===localDigest);
      if(other){
        const otherIndex=versions.findIndex(version=>version.seal_id===other.seal_id);
        const direction=otherIndex>chain.currentIndex?t('una versión posterior','a newer version'):t('una versión anterior','an earlier version');
        state(panel,'version',t('✓ OTRA VERSIÓN EVO','✓ ANOTHER EVO VERSION'),t('El archivo sí pertenece a la cadena documental','The file belongs to the document chain'),t(`No coincide con esta ficha, pero coincide exactamente con ${direction} registrada por el mismo emisor.`,`It does not match this record, but exactly matches ${direction} registered by the same issuer.`),localDigest,currentDigest,versionAction(other));
        return;
      }

      state(panel,'mismatch',t('✕ NO COINCIDE','✕ FILE DOES NOT MATCH'),t('El archivo es diferente del registrado','The file differs from the registered file'),t('Puede haber sido modificado, regenerado o pertenecer a otro documento. EVO no encontró esta huella entre las versiones enlazadas conocidas.','It may have been modified, regenerated, or belong to another document. EVO did not find this fingerprint among known linked versions.'),localDigest,currentDigest);
    }catch(error){
      if(token!==current.token)return;
      state(panel,'error',t('ERROR','ERROR'),t('No se pudo analizar el archivo','The file could not be analyzed'),error?.message||String(error));
    }
  }

  function buildPanel(host,seal){
    const shell=host.querySelector('.publicAssetShell');if(!shell)return null;
    let panel=host.querySelector('.originVerifierPanel');
    if(panel?.dataset.sealId===seal.seal_id)return panel;
    panel?.remove();

    panel=el('section','originVerifierPanel');panel.dataset.sealId=seal.seal_id;
    const head=el('div','originVerifierHead');
    const copy=el('div');copy.append(el('span','originVerifierKicker','EVO ORIGIN · FILE CHECK'),el('h3','',t('Verificá el archivo exacto','Verify the exact file')),el('p','',t('Comparación criptográfica de la copia que recibiste contra la huella registrada y su cadena de versiones.','Cryptographic comparison of the copy you received against the registered fingerprint and its version chain.')));
    head.append(copy,el('span','originVerifierPrivacy',t('100% LOCAL · NO SE SUBE','100% LOCAL · NO UPLOAD')));panel.append(head);

    const input=el('input');input.type='file';input.className='originVerifierInput';input.setAttribute('aria-label',t('Elegir archivo para verificar','Choose file to verify'));
    const drop=el('label','originVerifierDrop');drop.tabIndex=0;drop.append(input,el('span','originVerifierDropIcon','⌁'),el('b','',t('Arrastrá el documento aquí','Drop the document here')),el('small','',t('o hacé clic para elegirlo · SHA-256 en tu navegador','or click to choose it · SHA-256 in your browser')));panel.append(drop);
    panel.append(el('div','originVerifierResult'));
    const foot=el('div','originVerifierFoot');foot.append(el('span','',t('Privacidad','Privacy')),document.createTextNode(t(': EVO lee los bytes sólo en tu navegador para calcular la huella. El archivo no se envía al servidor.',': EVO reads the bytes only in your browser to calculate the fingerprint. The file is not sent to the server.')));panel.append(foot);

    input.addEventListener('change',()=>compareFile(panel,seal,input.files?.[0]));
    drop.addEventListener('dragover',event=>{event.preventDefault();drop.classList.add('is-dragging');});
    drop.addEventListener('dragleave',()=>drop.classList.remove('is-dragging'));
    drop.addEventListener('drop',event=>{event.preventDefault();drop.classList.remove('is-dragging');const file=event.dataTransfer?.files?.[0];if(file)compareFile(panel,seal,file);});
    drop.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();input.click();}});

    const states=shell.querySelector('.publicAssetStates');if(states)states.insertAdjacentElement('beforebegin',panel);else shell.append(panel);
    readyState(panel,seal);
    const existing=document.getElementById('verifyFile')?.files?.[0];if(existing)setTimeout(()=>compareFile(panel,seal,existing),40);
    return panel;
  }

  async function enhance(){
    const host=document.getElementById('publicAssetPage');if(!host?.classList.contains('ready'))return false;
    const sealId=sealFromPage();if(!sealId)return false;
    if(current.sealId===sealId&&current.seal){current.panel=buildPanel(host,current.seal);return true;}
    const token=++current.token;
    try{
      const seal=await fetchSeal(sealId);
      if(token!==current.token)return false;
      if(!seal||String(seal.asset_type||'').toLowerCase()!=='documento'){host.querySelector('.originVerifierPanel')?.remove();current={sealId:'',seal:null,chain:null,panel:null,token};return false;}
      current={sealId,seal,chain:null,panel:null,token};
      current.panel=buildPanel(host,seal);return true;
    }catch(error){console.warn('EVO Origin verifier unavailable',error);return false;}
  }

  function schedule(delay=120){
    if(queued)return;queued=true;
    setTimeout(()=>{queued=false;enhance();},delay);
  }

  new MutationObserver(()=>schedule(140)).observe(document.documentElement,{childList:true,subtree:true});
  document.getElementById('verifyBtn')?.addEventListener('click',()=>{current.sealId='';current.chain=null;schedule(280);});
  document.getElementById('languageSelect')?.addEventListener('change',()=>{current.sealId='';schedule(100);});
  window.addEventListener('popstate',()=>{current.sealId='';current.chain=null;schedule(100);});
  setTimeout(()=>schedule(0),350);

  window.evoOriginVerifier={hashFile,buildVersionChain,refresh:()=>{current.sealId='';current.chain=null;return enhance();}};
})();
