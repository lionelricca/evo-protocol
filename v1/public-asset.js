'use strict';

(()=>{
  const querySeal=String(new URLSearchParams(location.search).get('seal')||'').trim().toUpperCase();
  if(querySeal)document.body.classList.add('evoPublicAssetMode');

  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const el=(tag,className,value)=>{const node=document.createElement(tag);if(className)node.className=className;if(value!==undefined&&value!==null)node.textContent=String(value);return node};
  const shortWallet=value=>{const w=String(value||'');return w.length>18?`${w.slice(0,8)}…${w.slice(-6)}`:(w||'—')};
  const dateText=value=>{if(!value)return '—';try{return new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-US':'es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return String(value)}};
  const publicUrl=id=>{const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('seal',id);u.hash='verify';return u.toString()};
  const eventLabel=type=>typeof passportLabels!=='undefined'&&passportLabels[type]?passportLabels[type]:String(type||'EVENT');

  function ensureHost(){
    let host=document.getElementById('publicAssetPage');
    if(host)return host;
    const section=document.getElementById('verify');if(!section)return null;
    host=el('div','publicAssetPage');host.id='publicAssetPage';
    const grid=section.querySelector('.grid');if(grid)section.insertBefore(host,grid);else section.appendChild(host);
    return host;
  }

  function addRow(parent,label,value,mono=false){
    if(value===undefined||value===null||String(value).trim()==='')return;
    const row=el('div','publicAssetRow');row.append(el('span','',label),el('b',mono?'mono':'',value));parent.appendChild(row);
  }
  function addState(parent,label,value){
    const item=el('div','publicAssetState');item.append(el('span','',label),el('b','',value));parent.appendChild(item);
  }
  function addEvent(parent,title,detail,meta){
    const item=el('div','publicAssetEvent');item.append(el('h4','',title));
    if(detail)item.append(el('p','',detail));
    if(meta)item.append(el('small','',meta));
    parent.appendChild(item);
  }
  async function optionalIssuer(seal){
    const result={profile:null,wallet:null,domain:null,status:'SELF_DECLARED'};
    const calls=[];
    calls.push(typeof fetchIssuerProfile==='function'?fetchIssuerProfile(seal.issuer_wallet):Promise.resolve(null));
    calls.push(typeof fetchWalletAccount==='function'?fetchWalletAccount(seal.issuer_wallet):Promise.resolve(null));
    calls.push(typeof fetchDomainVerification==='function'?fetchDomainVerification(seal.issuer_wallet):Promise.resolve(null));
    const settled=await Promise.allSettled(calls);
    result.profile=settled[0].status==='fulfilled'?settled[0].value:null;
    result.wallet=settled[1].status==='fulfilled'?settled[1].value:null;
    result.domain=settled[2].status==='fulfilled'?settled[2].value:null;
    if(typeof effectiveIssuerStatus==='function')result.status=effectiveIssuerStatus(result.profile,result.wallet,result.domain);
    else if(result.domain)result.status='DOMAIN_VERIFIED';else if(result.wallet?.status)result.status=result.wallet.status;
    return result;
  }

  function renderQr(slot,id){
    slot.innerHTML='';
    if(typeof QRCode==='undefined'){slot.append(el('span','status bad',t('QR no disponible','QR unavailable')));return;}
    new QRCode(slot,{text:publicUrl(id),width:178,height:178,colorDark:'#090713',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
  }

  function buildPage(host,seal,events,issuer){
    host.className='publicAssetPage ready';host.innerHTML='';
    const id=String(seal.seal_id||'');
    const details=seal?.metadata?.assetDetails&&typeof seal.metadata.assetDetails==='object'?seal.metadata.assetDetails:{};
    const owner=typeof currentOwnerFrom==='function'?currentOwnerFrom(seal,events):String(seal.issuer_wallet||'').toLowerCase();
    const title=seal.title||t('Activo registrado','Registered asset');
    const issuerName=issuer.profile?.display_name||seal.issuer_label||issuer.wallet?.issuer_id||t('Emisor registrado','Registered issuer');
    const lastEvent=events.length?events[events.length-1].created_at||events[events.length-1].registered_at:seal.created_at;

    const shell=el('div','publicAssetShell');
    const top=el('div','publicAssetTop');
    const intro=el('div','publicAssetIntro');
    intro.append(el('span','publicAssetKicker',t('EVO · REGISTRO PÚBLICO VERIFICABLE','EVO · VERIFIABLE PUBLIC RECORD')));
    intro.append(el('h1','publicAssetTitle',title));
    if(seal.description)intro.append(el('p','publicAssetDescription',seal.description));
    intro.append(el('span','publicAssetId',id));
    const meta=el('div','publicAssetMeta');
    if(seal.asset_type)meta.append(el('span','',seal.asset_type));
    if(seal.serial)meta.append(el('span','',`${t('Serie','Serial')}: ${seal.serial}`));
    if(details.manufacturer)meta.append(el('span','',details.manufacturer));
    if(details.model)meta.append(el('span','',details.model));
    if(details.manufactureYear)meta.append(el('span','',String(details.manufactureYear)));
    intro.append(meta);

    const qrCard=el('div','publicAssetQrCard');const qr=el('div','publicAssetQr');
    qrCard.append(qr,el('b','',t('Escaneá para verificar','Scan to verify')),el('small','',t('Consulta pública · no requiere wallet','Public lookup · no wallet required')));
    top.append(intro,qrCard);shell.append(top);

    const states=el('div','publicAssetStates');
    addState(states,'PROOF','REGISTERED');
    addState(states,'SIGNATURE','WALLET SIGNED');
    addState(states,'ISSUER',issuer.status.replaceAll('_',' '));
    addState(states,'HISTORY',`${events.length+1} ${t('EVENTOS','EVENTS')}`);
    shell.append(states);

    const grid=el('div','publicAssetGrid');
    const info=el('div','publicAssetPanel');info.append(el('h3','',t('Identidad del activo','Asset identity')));
    addRow(info,t('Emisor','Issuer'),issuerName);
    addRow(info,t('Propietario actual','Current owner'),shortWallet(owner),true);
    addRow(info,t('Registrado','Registered'),dateText(seal.created_at));
    addRow(info,t('Última actividad','Last activity'),dateText(lastEvent));
    addRow(info,t('Fabricante','Manufacturer'),details.manufacturer);
    addRow(info,t('Modelo','Model'),details.model);
    addRow(info,t('Ubicación pública','Public location'),details.publicLocation);
    addRow(info,t('Intervalo de mantenimiento','Maintenance interval'),details.serviceIntervalHours?`${details.serviceIntervalHours} h`:null);
    addRow(info,t('Archivo registrado','Registered file'),seal.file_name||null);
    addRow(info,t('Huella del archivo','File fingerprint'),seal.asset_hash||seal.metadata_hash||null,true);

    const issuerPanel=el('div','publicAssetPanel');issuerPanel.append(el('h3','',t('Confianza del emisor','Issuer trust')));
    issuerPanel.append(el('span','publicAssetIssuerStatus',issuer.status.replaceAll('_',' ')));
    addRow(issuerPanel,t('Nombre público','Public name'),issuerName);
    addRow(issuerPanel,'EVO Issuer ID',issuer.wallet?.issuer_id||null,true);
    addRow(issuerPanel,t('Wallet firmante','Signing wallet'),shortWallet(seal.issuer_wallet),true);
    addRow(issuerPanel,t('Dominio verificado','Verified domain'),issuer.domain?.domain||null);
    const issuerMeaning=issuer.status==='DOMAIN_VERIFIED'?t('La wallet del emisor demostró control DNS del dominio mostrado.','The issuer wallet demonstrated DNS control of the displayed domain.'):issuer.status==='WALLET_PROVEN'?t('Una firma EVO válida demostró control de la wallet del emisor.','A valid EVO signature demonstrated control of the issuer wallet.'):issuer.status==='ORGANIZATION_VERIFIED'?t('La organización completó la verificación definida por EVO.','The organization completed the verification defined by EVO.'):t('El estado mostrado refleja únicamente la evidencia disponible públicamente en EVO.','The displayed status reflects only the evidence publicly available in EVO.');
    issuerPanel.append(el('p','publicAssetDescription',issuerMeaning));
    grid.append(info,issuerPanel);

    const history=el('div','publicAssetPanel');history.style.gridColumn='1/-1';history.append(el('h3','',t('Historial verificable','Verifiable history')));
    const timeline=el('div','publicAssetTimeline');
    addEvent(timeline,t('Registro creado','Record created'),t('El emisor creó y firmó el EVO Proof.','The issuer created and signed the EVO Proof.'),`${dateText(seal.created_at)} · ${shortWallet(seal.issuer_wallet)}`);
    events.forEach(event=>{
      let detail=event.note||'';
      if(event.event_type==='TRANSFERRED'&&event.new_owner_wallet)detail=detail?`${detail} · ${t('Nuevo propietario','New owner')}: ${shortWallet(event.new_owner_wallet)}`:`${t('Nuevo propietario','New owner')}: ${shortWallet(event.new_owner_wallet)}`;
      addEvent(timeline,eventLabel(event.event_type),detail,`${dateText(event.created_at||event.registered_at)} · ${t('firmado por','signed by')} ${shortWallet(event.actor_wallet)}`);
    });
    history.append(timeline);grid.append(history);shell.append(grid);

    const note=el('div','publicAssetTrustNote');
    note.append(el('b','',t('Qué significa esta página: ','What this page means: ')),document.createTextNode(t('EVO demuestra registro, firma, integridad de datos e historial disponible. No certifica por sí solo la autenticidad física, el estado mecánico ni la veracidad de una declaración del propietario.','EVO demonstrates registration, signature, data integrity and available history. It does not by itself certify physical authenticity, mechanical condition or the truth of an owner declaration.')));
    shell.append(note);

    const actions=el('div','publicAssetActions');
    const share=el('button','btn primary',t('Compartir Passport','Share Passport'));share.type='button';
    share.onclick=async()=>{const url=publicUrl(id);try{if(navigator.share)await navigator.share({title:`EVO Passport · ${title}`,text:`EVO ${id}`,url});else{await navigator.clipboard.writeText(url);toast(t('Enlace público copiado','Public link copied'));}}catch(error){if(error?.name!=='AbortError')toast(t('No se pudo compartir','Could not share'));}};
    const copy=el('button','btn',t('Copiar enlace','Copy link'));copy.type='button';copy.onclick=()=>navigator.clipboard.writeText(publicUrl(id)).then(()=>toast(t('Enlace público copiado','Public link copied')));
    const technical=el('button','btn gold',t('Ver registro técnico','View technical record'));technical.type='button';technical.onclick=()=>{document.body.classList.toggle('evoShowTechnical');const gridNode=document.querySelector('#verify>.grid');if(document.body.classList.contains('evoShowTechnical')&&gridNode)gridNode.scrollIntoView({behavior:'smooth',block:'start'});};
    actions.append(share,copy,technical);shell.append(actions);
    host.append(shell);renderQr(qr,id);

    if(document.body.classList.contains('evoPublicAssetMode')){
      document.title=`${title} · EVO Passport`;
      const description=document.querySelector('meta[name="description"]');if(description)description.content=t(`Verificación pública EVO para ${title}. Registro, firma, integridad e historial verificable.`,`EVO public verification for ${title}. Registration, signature, integrity and verifiable history.`);
    }
  }

  async function load(id){
    const sealId=String(id||'').trim().toUpperCase();if(!sealId)return;
    const host=ensureHost();if(!host)return;
    host.className='publicAssetPage loading';host.innerHTML='';host.append(el('div','publicAssetLoading',t('Construyendo la página pública del activo…','Building the public asset page…')));
    try{
      const seal=await fetchSeal(sealId);if(!seal)throw new Error(t('El registro no existe o no está activo.','The record does not exist or is not active.'));
      const [events,issuer]=await Promise.all([typeof fetchPassportEvents==='function'?fetchPassportEvents(sealId):Promise.resolve([]),optionalIssuer(seal)]);
      buildPage(host,seal,Array.isArray(events)?events:[],issuer);
    }catch(error){host.className='publicAssetPage error';host.innerHTML='';const box=el('div','publicAssetError');box.append(el('b','',t('No se pudo abrir el Passport público.','Could not open the public Passport.')),el('p','',error?.message||String(error)));host.append(box);}
  }

  window.evoLoadPublicAsset=load;
  const verifyButton=document.getElementById('verifyBtn');if(verifyButton)verifyButton.addEventListener('click',()=>setTimeout(()=>{const id=document.getElementById('verifyId')?.value;if(id)load(id);},250));
  if(querySeal)setTimeout(()=>load(querySeal),120);
})();
