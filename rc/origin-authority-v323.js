'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const walletRe=/^0x[0-9a-f]{40}$/;
  let publicCache={sealId:'',seal:null,authority:null};
  let creationWallet='';
  let queued=false;
  let requestToken=0;

  const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node;};
  const short=value=>{const s=String(value||'');return s.length>18?`${s.slice(0,8)}…${s.slice(-6)}`:(s||'—');};
  const currentWallet=()=>{try{return String(typeof account!=='undefined'?account:'').toLowerCase();}catch{return '';}};
  const currentSealId=()=>String(new URLSearchParams(location.search).get('seal')||document.getElementById('verifyId')?.value||'').trim().toUpperCase();

  async function settled(call){try{return await call();}catch{return null;}}

  async function fetchAuthority(wallet){
    const issuerWallet=String(wallet||'').toLowerCase();
    if(!walletRe.test(issuerWallet))return {level:'SELF_DECLARED',organization:null,domain:null,wallet:null,profile:null};
    const [organization,domain,walletAccount,profile]=await Promise.all([
      settled(()=>typeof fetchOrganizationVerification==='function'?fetchOrganizationVerification(issuerWallet):null),
      settled(()=>typeof fetchDomainVerification==='function'?fetchDomainVerification(issuerWallet):null),
      settled(()=>typeof fetchWalletAccount==='function'?fetchWalletAccount(issuerWallet):null),
      settled(()=>typeof fetchIssuerProfile==='function'?fetchIssuerProfile(issuerWallet):null)
    ]);
    let level='SELF_DECLARED';
    if(organization?.status==='ACTIVE'&&organization?.legal_name)level='ORGANIZATION_VERIFIED';
    else if(domain?.status==='ACTIVE'&&domain?.domain)level='DOMAIN_VERIFIED';
    else if(walletAccount?.status==='WALLET_PROVEN'||profile?.status==='WALLET_PROVEN')level='WALLET_PROVEN';
    return {level,organization,domain,wallet:walletAccount,profile};
  }

  function authorityCopy(authority){
    if(authority.level==='ORGANIZATION_VERIFIED')return {
      badge:t('ORGANIZACIÓN VERIFICADA','ORGANIZATION VERIFIED'),
      title:t('Emisor organizacional verificado','Verified organizational issuer'),
      detail:t('EVO encontró una verificación organizacional activa vinculada a la wallet firmante. El nombre legal verificado es la identidad principal de este documento.','EVO found an active organizational verification linked to the signing wallet. The verified legal name is the primary identity for this document.'),
      value:authority.organization.legal_name
    };
    if(authority.level==='DOMAIN_VERIFIED')return {
      badge:t('DOMINIO VERIFICADO','DOMAIN VERIFIED'),
      title:t('La wallet controla un dominio verificado','The wallet controls a verified domain'),
      detail:t('EVO verificó control DNS del dominio mostrado. Esto demuestra control del dominio, pero no equivale por sí solo a verificar el nombre legal de una empresa.','EVO verified DNS control of the displayed domain. This proves domain control, but does not by itself verify a company legal name.'),
      value:authority.domain.domain
    };
    if(authority.level==='WALLET_PROVEN')return {
      badge:t('CONTROL DE WALLET CONFIRMADO','WALLET CONTROL CONFIRMED'),
      title:t('Identidad criptográfica confirmada','Cryptographic identity confirmed'),
      detail:t('Una prueba EVO confirmó control de la wallet emisora. El nombre de empresa escrito en el documento sigue siendo una declaración, no una identidad organizacional verificada.','An EVO proof confirmed control of the issuer wallet. A company name written on the document remains a declaration, not a verified organizational identity.'),
      value:authority.wallet?.issuer_id||''
    };
    return {
      badge:t('IDENTIDAD AUTODECLARADA','SELF-DECLARED IDENTITY'),
      title:t('Nombre del emisor no verificado como organización','Issuer name not verified as an organization'),
      detail:t('La firma vincula el registro con una wallet, pero EVO no encontró organización ni dominio verificados para atribuir este documento a una empresa.','The signature binds the record to a wallet, but EVO found no verified organization or domain to attribute this document to a company.'),
      value:''
    };
  }

  function findInfoIssuerRow(host){
    const panels=[...host.querySelectorAll('.publicAssetGrid .publicAssetPanel')];
    for(const panel of panels){
      for(const row of panel.querySelectorAll('.publicAssetRow')){
        const label=String(row.querySelector('span')?.textContent||'').trim().toLowerCase();
        if(label==='emisor'||label==='issuer'||label==='nombre declarado'||label==='declared name'||label==='emisor verificado'||label==='verified issuer')return row;
      }
    }
    return null;
  }

  function renderPublicAuthority(host,seal,authority){
    if(!host?.classList.contains('ready'))return;
    if(String(seal.asset_type||'').toLowerCase()!=='documento')return;
    const shell=host.querySelector('.publicAssetShell');if(!shell)return;
    const copy=authorityCopy(authority);
    const renderKey=[seal.seal_id,authority.level,copy.value,document.documentElement.lang].join('|');
    let banner=host.querySelector('.originAuthorityBanner');
    if(!banner){banner=el('section','originAuthorityBanner');const verifier=host.querySelector('.originVerifierPanel');const states=host.querySelector('.publicAssetStates');if(verifier)verifier.insertAdjacentElement('beforebegin',banner);else if(states)states.insertAdjacentElement('beforebegin',banner);else shell.append(banner);}
    if(banner.dataset.renderKey!==renderKey){
      banner.dataset.renderKey=renderKey;banner.className=`originAuthorityBanner is-${authority.level.toLowerCase().replaceAll('_','-')}`;banner.textContent='';
      const main=el('div','originAuthorityMain');main.append(el('span','originAuthorityKicker','EVO ORIGIN · ISSUER AUTHORITY'),el('b','originAuthorityTitle',copy.title),el('p','originAuthorityDetail',copy.detail));
      const badge=el('div','originAuthorityBadge');badge.append(el('span','',copy.badge));
      if(copy.value)badge.append(el('b','',copy.value));
      if(authority.level==='ORGANIZATION_VERIFIED'&&authority.organization?.country_code)badge.append(el('small','',authority.organization.country_code));
      banner.append(main,badge);
      const declared=String(seal.issuer_label||'').trim();
      if(declared&&(authority.level!=='ORGANIZATION_VERIFIED'||declared.toLowerCase()!==String(copy.value||'').toLowerCase())){
        const note=el('div','originAuthorityDeclared');note.append(el('span','',t('NOMBRE DECLARADO AL REGISTRAR','NAME DECLARED AT REGISTRATION')),el('b','',declared));banner.append(note);
      }
    }

    const issuerRow=findInfoIssuerRow(host);
    if(issuerRow){
      const label=issuerRow.querySelector('span');const value=issuerRow.querySelector('b');
      if(authority.level==='ORGANIZATION_VERIFIED'){
        if(label)label.textContent=t('Emisor verificado','Verified issuer');if(value)value.textContent=authority.organization.legal_name;
      }else if(authority.level==='DOMAIN_VERIFIED'){
        if(label)label.textContent=t('Nombre declarado','Declared name');
      }else{
        if(label)label.textContent=t('Nombre declarado','Declared name');
      }
    }

    const quick=[...host.querySelectorAll('.publicAssetQuickFacts>div')].find(item=>{
      const label=String(item.querySelector('span')?.textContent||'').trim().toLowerCase();
      return ['emisor','issuer','emisor verificado','verified issuer','nombre declarado','declared name','dominio verificado','verified domain','emisor evo','evo issuer'].includes(label);
    });
    if(quick){
      const label=quick.querySelector('span');const value=quick.querySelector('b');
      if(authority.level==='ORGANIZATION_VERIFIED'){label.textContent=t('EMISOR VERIFICADO','VERIFIED ISSUER');value.textContent=authority.organization.legal_name;}
      else if(authority.level==='DOMAIN_VERIFIED'){label.textContent=t('DOMINIO VERIFICADO','VERIFIED DOMAIN');value.textContent=authority.domain.domain;}
      else if(authority.level==='WALLET_PROVEN'){label.textContent=t('EMISOR EVO','EVO ISSUER');value.textContent=authority.wallet?.issuer_id||short(seal.issuer_wallet);}
      else{label.textContent=t('NOMBRE DECLARADO','DECLARED NAME');value.textContent=seal.issuer_label||short(seal.issuer_wallet);}
    }

    const state=[...host.querySelectorAll('.publicAssetState')].find(item=>String(item.querySelector('span')?.textContent||'').trim().toLowerCase()==='emisor'||String(item.querySelector('span')?.textContent||'').trim().toLowerCase()==='issuer');
    if(state){const value=state.querySelector('b');if(value)value.textContent=copy.badge;}
    const status=host.querySelector('.publicAssetIssuerStatus');if(status)status.textContent=copy.badge;
  }

  async function enhancePublic(force=false){
    const host=document.getElementById('publicAssetPage');if(!host?.classList.contains('ready'))return false;
    const sealId=currentSealId();if(!sealId)return false;
    if(!force&&publicCache.sealId===sealId&&publicCache.seal&&publicCache.authority){renderPublicAuthority(host,publicCache.seal,publicCache.authority);return true;}
    const token=++requestToken;
    try{
      const seal=await fetchSeal(sealId);if(token!==requestToken)return false;
      if(!seal||String(seal.asset_type||'').toLowerCase()!=='documento'){host.querySelector('.originAuthorityBanner')?.remove();return false;}
      const authority=await fetchAuthority(seal.issuer_wallet);if(token!==requestToken)return false;
      publicCache={sealId,seal,authority};renderPublicAuthority(host,seal,authority);return true;
    }catch(error){console.warn('EVO Origin issuer authority unavailable',error);return false;}
  }

  function ensureCreationState(){
    const issuer=document.getElementById('issuer');const label=issuer?.closest('label');if(!issuer||!label)return null;
    let state=document.getElementById('originIssuerCreationState');
    if(!state){state=el('div','originIssuerCreationState');state.id='originIssuerCreationState';label.insertAdjacentElement('afterend',state);}
    return state;
  }

  function unlockIssuer(issuer){
    if(issuer.dataset.evoAuthorityLocked==='1'){
      const old=issuer.dataset.evoAuthorityValue||'';
      issuer.readOnly=false;delete issuer.dataset.evoAuthorityLocked;delete issuer.dataset.evoAuthorityValue;
      if(issuer.value===old)issuer.value='';
    }else issuer.readOnly=false;
  }

  function renderCreationAuthority(authority){
    const type=document.getElementById('type');const issuer=document.getElementById('issuer');const state=ensureCreationState();if(!type||!issuer||!state)return;
    const doc=type.value==='Documento';state.hidden=!doc;
    if(!doc){unlockIssuer(issuer);return;}
    const copy=authorityCopy(authority);
    state.className=`originIssuerCreationState is-${authority.level.toLowerCase().replaceAll('_','-')}`;state.textContent='';state.append(el('span','',copy.badge),el('p','',copy.detail));
    if(authority.level==='ORGANIZATION_VERIFIED'){
      issuer.readOnly=true;issuer.value=authority.organization.legal_name;issuer.dataset.evoAuthorityLocked='1';issuer.dataset.evoAuthorityValue=authority.organization.legal_name;
      state.append(el('b','',t('El nombre legal verificado se usa automáticamente como emisor.','The verified legal name is automatically used as issuer.')));
    }else{
      unlockIssuer(issuer);
      if(authority.level==='DOMAIN_VERIFIED')state.append(el('b','',t(`Dominio verificado: ${authority.domain.domain}. El nombre escrito sigue siendo una etiqueta pública.`,`Verified domain: ${authority.domain.domain}. The typed name remains a public label.`)));
      else state.append(el('b','',t('Podés emitir igual; EVO mostrará este nombre como declarado, no como empresa verificada.','You can still issue; EVO will show this name as declared, not as a verified company.')));
    }
  }

  async function refreshCreation(force=false){
    const type=document.getElementById('type');const issuer=document.getElementById('issuer');if(!type||!issuer)return false;
    if(type.value!=='Documento'){const state=document.getElementById('originIssuerCreationState');if(state)state.hidden=true;unlockIssuer(issuer);return false;}
    const wallet=currentWallet();const state=ensureCreationState();
    if(!walletRe.test(wallet)){
      unlockIssuer(issuer);if(state){state.hidden=false;state.className='originIssuerCreationState is-self-declared';state.textContent='';state.append(el('span','',t('WALLET NO CONECTADA','WALLET NOT CONNECTED')),el('p','',t('Conectá tu wallet para que EVO determine automáticamente el nivel de autoridad del emisor.','Connect your wallet so EVO can automatically determine the issuer authority level.')));}return false;
    }
    if(!force&&creationWallet===wallet&&state?.dataset.loaded==='1')return true;
    creationWallet=wallet;if(state){state.hidden=false;state.dataset.loaded='';state.textContent=t('Comprobando autoridad del emisor…','Checking issuer authority…');}
    const authority=await fetchAuthority(wallet);if(currentWallet()!==wallet)return false;
    if(state)state.dataset.loaded='1';renderCreationAuthority(authority);return true;
  }

  function schedule(delay=140,force=false){
    if(queued)return;queued=true;setTimeout(()=>{queued=false;enhancePublic(force);refreshCreation(force);},delay);
  }

  new MutationObserver(()=>schedule(160,false)).observe(document.documentElement,{childList:true,subtree:true});
  document.getElementById('verifyBtn')?.addEventListener('click',()=>{publicCache={sealId:'',seal:null,authority:null};schedule(300,true);});
  document.getElementById('type')?.addEventListener('change',()=>schedule(20,true));
  document.getElementById('languageSelect')?.addEventListener('change',()=>{publicCache={sealId:'',seal:null,authority:null};creationWallet='';const state=document.getElementById('originIssuerCreationState');if(state)state.dataset.loaded='';schedule(80,true);});
  window.addEventListener('evo:wallet-connected',()=>{creationWallet='';const state=document.getElementById('originIssuerCreationState');if(state)state.dataset.loaded='';schedule(120,true);});
  window.addEventListener('evo:wallet-registered',()=>{creationWallet='';const state=document.getElementById('originIssuerCreationState');if(state)state.dataset.loaded='';schedule(120,true);});
  setInterval(()=>{const wallet=currentWallet();if(wallet!==creationWallet&&document.getElementById('type')?.value==='Documento'){creationWallet='';const state=document.getElementById('originIssuerCreationState');if(state)state.dataset.loaded='';schedule(20,true);}},1200);
  setTimeout(()=>schedule(0,true),420);

  window.evoOriginAuthority={fetchAuthority,refresh:()=>{publicCache={sealId:'',seal:null,authority:null};creationWallet='';return Promise.all([enhancePublic(true),refreshCreation(true)]);}};
})();
