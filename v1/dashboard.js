'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const el=(tag,className,value)=>{const node=document.createElement(tag);if(className)node.className=className;if(value!==undefined&&value!==null)node.textContent=String(value);return node};
  const walletRe=/^0x[0-9a-f]{40}$/;
  let currentWallet='';
  let loading=false;
  let loadGeneration=0;

  const shortWallet=value=>{const wallet=String(value||'');return wallet.length>18?`${wallet.slice(0,8)}…${wallet.slice(-6)}`:(wallet||'—')};
  const dateText=value=>{if(!value)return '—';try{return new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-US':'es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return String(value)}};
  const publicUrl=id=>{const u=new URL(location.href);u.search='';u.hash='verify';u.searchParams.set('seal',id);return u.toString()};
  const scrollToSection=(id,behavior='auto')=>{
    const target=document.getElementById(id);if(!target)return;
    const nav=document.querySelector('nav');const offset=(nav?.offsetHeight||76)+14;
    const top=Math.max(0,target.getBoundingClientRect().top+window.scrollY-offset);
    window.scrollTo({top,behavior});
  };
  const restoreRequestedAnchor=()=>{
    const id=decodeURIComponent(String(location.hash||'').replace(/^#/,''));
    if(!id)return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>scrollToSection(id)));
  };
  const goToSection=id=>{
    const target=document.getElementById(id);if(!target)return;
    const next=`#${id}`;if(location.hash!==next)history.replaceState(null,'',`${location.pathname}${location.search}${next}`);
    requestAnimationFrame(()=>scrollToSection(id,'smooth'));
  };

  async function rest(table,params){
    const url=new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    Object.entries(params||{}).forEach(([key,value])=>{if(value!==undefined&&value!==null&&value!=='')url.searchParams.set(key,String(value));});
    const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
    if(!response.ok){let body={};try{body=await response.json()}catch{}throw new Error(body.message||body.error||`EVO data error (${response.status})`);}
    return response.json();
  }

  async function fetchCreated(wallet){
    return rest('evo_seals',{
      issuer_wallet:`eq.${wallet}`,
      select:'seal_id,asset_type,title,issuer_wallet,issuer_label,serial,description,created_at,registered_at,status,metadata',
      order:'registered_at.desc',
      limit:'100'
    });
  }

  async function fetchWalletEvents(wallet){
    return rest('evo_passport_events',{
      status:'eq.ACTIVE',
      or:`(actor_wallet.eq.${wallet},new_owner_wallet.eq.${wallet},counterparty_wallet.eq.${wallet})`,
      select:'event_id,seal_id,event_type,actor_wallet,new_owner_wallet,counterparty_wallet,note,created_at,registered_at,status',
      order:'registered_at.desc',
      limit:'250'
    });
  }

  function chunks(values,size=30){const out=[];for(let i=0;i<values.length;i+=size)out.push(values.slice(i,i+size));return out;}

  async function fetchSeals(ids){
    const unique=[...new Set(ids.filter(Boolean))];if(!unique.length)return [];
    const groups=await Promise.all(chunks(unique).map(group=>rest('evo_seals',{
      seal_id:`in.(${group.join(',')})`,
      select:'seal_id,asset_type,title,issuer_wallet,issuer_label,serial,description,created_at,registered_at,status,metadata'
    })));
    return groups.flat();
  }

  async function fetchTransferEvents(ids){
    const unique=[...new Set(ids.filter(Boolean))];if(!unique.length)return [];
    const groups=await Promise.all(chunks(unique).map(group=>rest('evo_passport_events',{
      seal_id:`in.(${group.join(',')})`,
      status:'eq.ACTIVE',
      event_type:'eq.TRANSFERRED',
      select:'event_id,seal_id,event_type,actor_wallet,new_owner_wallet,counterparty_wallet,created_at,registered_at,status',
      order:'registered_at.asc'
    })));
    return groups.flat();
  }

  function ownerFor(seal,events){
    let owner=String(seal?.issuer_wallet||'').toLowerCase();
    events.filter(event=>event.seal_id===seal.seal_id&&event.event_type==='TRANSFERRED').sort((a,b)=>new Date(a.registered_at||a.created_at||0)-new Date(b.registered_at||b.created_at||0)).forEach(event=>{if(event.new_owner_wallet)owner=String(event.new_owner_wallet).toLowerCase();});
    return owner;
  }

  function ensureDashboard(){
    let section=document.getElementById('myEvo');
    if(section)return section;
    section=el('section','wrap block myEvo');section.id='myEvo';
    const pricing=document.getElementById('pricing');const main=document.querySelector('main');
    if(pricing&&pricing.parentNode)pricing.parentNode.insertBefore(section,pricing);else if(main)main.prepend(section);
    const links=document.querySelector('.links');
    if(links&&!links.querySelector('a[href="#myEvo"]')){
      const link=el('a','myEvoNav',t('Mi EVO','My EVO'));link.href='#myEvo';link.onclick=event=>{event.preventDefault();goToSection('myEvo')};
      const first=links.querySelector('a');if(first)links.insertBefore(link,first);else links.prepend(link);
    }
    restoreRequestedAnchor();
    return section;
  }

  function stat(label,value,detail,accent=false){
    const card=el('div',accent?'myEvoStat accent':'myEvoStat');card.append(el('span','',label),el('strong','',value),el('small','',detail||''));return card;
  }

  function relationLabel(record){
    if(record.isOwned&&record.isCreated)return t('TU ACTIVO','YOUR ASSET');
    if(record.isOwned)return t('RECIBIDO','RECEIVED');
    return t('TRANSFERIDO','TRANSFERRED');
  }

  function assetCard(record){
    const {seal}=record;
    const card=el('article','myEvoAsset myEvoAssetV252');
    const top=el('div','myEvoAssetTop');
    const copy=el('div','myEvoAssetCopy');
    copy.append(el('span','myEvoAssetType',seal.asset_type||t('Activo','Asset')),el('h4','',seal.title||t('Activo sin título','Untitled asset')));
    top.append(copy,el('span','myEvoBadge',relationLabel(record)));card.append(top);

    const meta=el('div','myEvoAssetMeta');
    meta.append(el('span','myEvoPassportState',t('● Passport activo','● Active Passport')));
    if(seal.serial)meta.append(el('span','',`${t('Serie','Serial')} · ${seal.serial}`));
    card.append(meta,el('code','myEvoSealId',seal.seal_id));

    const actions=el('div','myEvoAssetActions');
    const open=el('button','btn myEvoOpenPassport',t('Ver Passport','View Passport'));open.type='button';open.onclick=()=>{location.href=publicUrl(seal.seal_id)};
    const copyLink=el('button','btn myEvoCopyLink',t('Copiar enlace','Copy link'));copyLink.type='button';copyLink.onclick=()=>navigator.clipboard.writeText(publicUrl(seal.seal_id)).then(()=>toast(t('Enlace público copiado','Public link copied')));
    actions.append(open,copyLink);card.append(actions);return card;
  }

  function eventLabel(type){
    const labels={TRANSFERRED:t('Propiedad transferida','Ownership transferred'),REPAIRED:t('Reparación registrada','Repair recorded'),WARRANTY:t('Garantía registrada','Warranty recorded'),INSPECTED:t('Inspección registrada','Inspection recorded'),SOLD:t('Venta registrada','Sale recorded'),NOTE:t('Nota registrada','Note recorded')};
    return labels[type]||String(type||t('Evento','Event'));
  }

  function activityItem(event,wallet){
    const item=el('div','myEvoActivityItem');
    const main=el('div','');main.append(el('b','',eventLabel(event.event_type)),el('small','',event.note||event.seal_id));
    const relation=event.event_type==='TRANSFERRED'&&String(event.new_owner_wallet||'').toLowerCase()===wallet?t('RECIBIDO','RECEIVED'):event.event_type==='TRANSFERRED'&&String(event.actor_wallet||'').toLowerCase()===wallet?t('TRANSFERIDO','TRANSFERRED'):t('FIRMADO','SIGNED');
    item.append(main,el('span','myEvoBadge',relation),el('time','',dateText(event.registered_at||event.created_at)));
    item.onclick=()=>{location.href=publicUrl(event.seal_id)};item.tabIndex=0;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();item.click();}};
    return item;
  }

  function emptyState(title,detail){const box=el('div','myEvoEmpty');box.append(el('b','',title),el('p','',detail));return box;}

  function renderDisconnected(){
    const section=ensureDashboard();section.classList.remove('ready','loading');section.classList.add('disconnected');section.textContent='';
    const panel=el('div','panel myEvoConnect');panel.append(el('span','kicker','MY EVO'),el('h2','',t('Tu espacio en EVO','Your EVO space')),el('p','',t('Conectá tu wallet para ver Proofs disponibles, Passports creados, activos que poseés y actividad pública relacionada.','Connect your wallet to view available Proofs, created Passports, assets you own and related public activity.')));
    const button=el('button','btn primary',t('Conectar wallet','Connect wallet'));button.type='button';button.onclick=()=>window.evoConnectWallet?window.evoConnectWallet().catch(error=>toast(error?.message||t('No se pudo conectar','Could not connect'))):document.getElementById('walletBtn')?.click();panel.append(button);section.append(panel);
    restoreRequestedAnchor();
  }

  function buildLibrary(created,owned,transferEvents,wallet){
    const createdMap=new Map(created.map(seal=>[seal.seal_id,seal]));
    const ownedMap=new Map(owned.map(item=>[item.seal.seal_id,item]));
    const ids=[...new Set([...createdMap.keys(),...ownedMap.keys()])];
    return ids.map(id=>{
      const seal=createdMap.get(id)||ownedMap.get(id)?.seal;
      const owner=ownedMap.get(id)?.owner||ownerFor(seal,transferEvents);
      return {seal,owner,isCreated:createdMap.has(id),isOwned:owner===wallet};
    }).sort((a,b)=>new Date(b.seal.registered_at||b.seal.created_at||0)-new Date(a.seal.registered_at||a.seal.created_at||0));
  }

  function renderLibrary(panel,library,initial='owned'){
    const header=el('div','myEvoLibraryHead');
    const titleWrap=el('div','');titleWrap.append(el('div','myEvoPanelTitle',t('Biblioteca EVO','EVO Library')),el('p','myEvoLibrarySub',t('Tus activos y Passports, sin información duplicada.','Your assets and Passports without duplicated information.')));
    const tabs=el('div','myEvoTabs');
    const grid=el('div','myEvoLibraryGrid');
    const definitions=[
      {key:'owned',label:t('En propiedad','Owned'),count:library.filter(item=>item.isOwned).length},
      {key:'created',label:t('Creados','Created'),count:library.filter(item=>item.isCreated).length},
      {key:'all',label:t('Todos','All'),count:library.length}
    ];
    const buttons=new Map();
    const show=key=>{
      grid.textContent='';buttons.forEach((button,name)=>button.classList.toggle('active',name===key));
      const items=key==='owned'?library.filter(item=>item.isOwned):key==='created'?library.filter(item=>item.isCreated):library;
      if(items.length)items.slice(0,24).forEach(item=>grid.append(assetCard(item)));
      else grid.append(emptyState(t('Nada por mostrar todavía','Nothing to show yet'),key==='owned'?t('Los activos que poseas aparecerán acá.','Assets you own will appear here.'):t('Los Passports que crees aparecerán acá.','Passports you create will appear here.')));
    };
    definitions.forEach(def=>{const button=el('button','myEvoTab',`${def.label} · ${def.count}`);button.type='button';button.onclick=()=>show(def.key);buttons.set(def.key,button);tabs.append(button)});
    header.append(titleWrap,tabs);panel.append(header,grid);show(initial);
  }

  function renderDashboard(wallet,data){
    const section=ensureDashboard();section.className='wrap block myEvo ready';section.textContent='';
    const {created,owned,activity,entitlement,transferEvents}=data;
    const freeAvailable=Boolean(entitlement?.demoAvailable);const purchased=Math.max(Number(entitlement?.remainingCredits||0),0);const available=purchased+(freeAvailable?1:0);

    const head=el('div','myEvoHead');const copy=el('div','');copy.append(el('span','kicker','MY EVO'),el('h2','',t('Tu espacio en EVO','Your EVO space')),el('p','myEvoWallet',shortWallet(wallet)));
    const actions=el('div','myEvoHeadActions');const create=el('a','btn primary',t('Crear Proof','Create Proof'));create.href='#seal';create.onclick=event=>{event.preventDefault();goToSection('seal')};const refresh=el('button','btn',t('Actualizar','Refresh'));refresh.type='button';refresh.onclick=()=>load(wallet,true);actions.append(create,refresh);head.append(copy,actions);section.append(head);

    const stats=el('div','myEvoStats');
    stats.append(
      stat(t('Proofs disponibles','Available Proofs'),available,freeAvailable?(purchased?`1 Free + ${purchased} ${t('comprados','purchased')}`:t('Incluye tu Free Proof','Includes your Free Proof')):(purchased?`${purchased} ${t('comprados','purchased')}`:t('Sin Proofs disponibles','No Proofs available')),true),
      stat(t('Passports creados','Created Passports'),created.length,t('Emitidos por esta wallet','Issued by this wallet')),
      stat(t('Activos en propiedad','Assets owned'),owned.length,t('Propiedad actual calculada por historial','Current ownership from history')),
      stat(t('Actividad reciente','Recent activity'),activity.length,t('Eventos públicos relacionados','Related public events'))
    );section.append(stats);

    const library=buildLibrary(created,owned,transferEvents,wallet);
    const libraryPanel=el('div','panel myEvoPanel myEvoLibrary');renderLibrary(libraryPanel,library,'owned');section.append(libraryPanel);

    const activityPanel=el('div','panel myEvoActivity');const title=el('div','myEvoPanelTitle',t('Actividad reciente','Recent activity'));activityPanel.append(title);
    const activityList=el('div','myEvoActivityList');if(activity.length)activity.slice(0,18).forEach(event=>activityList.append(activityItem(event,wallet)));else activityList.append(emptyState(t('Sin actividad todavía','No activity yet'),t('Las reparaciones, inspecciones, notas y transferencias aceptadas aparecerán aquí.','Repairs, inspections, notes and accepted transfers will appear here.')));activityPanel.append(activityList);section.append(activityPanel);

    const note=el('div','myEvoPrivacy');note.append(el('b','',t('Cómo funciona My EVO: ','How My EVO works: ')),document.createTextNode(t('esta vista organiza información pública asociada a la wallet conectada. No accede a fondos, no lee claves privadas y no muestra ofertas de transferencia pendientes.','this view organizes public information associated with the connected wallet. It does not access funds, read private keys or expose pending transfer offers.')));section.append(note);
    if(location.hash==='#myEvo')restoreRequestedAnchor();
  }

  async function load(wallet,force=false){
    const normalized=String(wallet||account||'').toLowerCase();
    if(!walletRe.test(normalized)){renderDisconnected();return;}
    const switchingWallet=Boolean(currentWallet&&currentWallet!==normalized);
    if(loading&&!force&&!switchingWallet)return;
    currentWallet=normalized;
    const generation=++loadGeneration;
    loading=true;
    const section=ensureDashboard();section.className='wrap block myEvo loading';section.textContent='';section.append(el('div','myEvoLoading',t('Construyendo tu panel EVO…','Building your EVO dashboard…')));
    try{
      const [createdResult,relatedResult,entitlementResult]=await Promise.allSettled([
        fetchCreated(normalized),
        fetchWalletEvents(normalized),
        window.evoRefreshEntitlement?window.evoRefreshEntitlement(normalized):Promise.resolve(window.evoEntitlement||null)
      ]);
      const created=createdResult.status==='fulfilled'&&Array.isArray(createdResult.value)?createdResult.value:[];
      const related=relatedResult.status==='fulfilled'&&Array.isArray(relatedResult.value)?relatedResult.value:[];
      const entitlement=entitlementResult.status==='fulfilled'?entitlementResult.value:(window.evoEntitlement||null);
      const candidateIds=[...new Set([...created.map(seal=>seal.seal_id),...related.map(event=>event.seal_id)].filter(Boolean))];
      const [extraSeals,transferEvents]=await Promise.all([fetchSeals(candidateIds),fetchTransferEvents(candidateIds)]);
      const sealMap=new Map([...created,...extraSeals].map(seal=>[seal.seal_id,seal]));
      const owned=[...sealMap.values()].map(seal=>({seal,owner:ownerFor(seal,transferEvents)})).filter(item=>item.owner===normalized).sort((a,b)=>new Date(b.seal.registered_at||b.seal.created_at||0)-new Date(a.seal.registered_at||a.seal.created_at||0));
      const activity=[...related].sort((a,b)=>new Date(b.registered_at||b.created_at||0)-new Date(a.registered_at||a.created_at||0));
      if(generation!==loadGeneration||currentWallet!==normalized)return;
      renderDashboard(normalized,{created,owned,activity,entitlement,transferEvents});
    }catch(error){
      if(generation!==loadGeneration||currentWallet!==normalized)return;
      section.className='wrap block myEvo ready';section.textContent='';const box=el('div','panel myEvoError');box.append(el('b','',t('No se pudo cargar My EVO','Could not load My EVO')),el('p','',error?.message||String(error)));const retry=el('button','btn',t('Reintentar','Retry'));retry.type='button';retry.onclick=()=>load(normalized,true);box.append(retry);section.append(box);
    }finally{
      if(generation===loadGeneration)loading=false;
    }
  }

  window.evoLoadDashboard=load;
  window.addEventListener('evo:wallet-connected',event=>load(event.detail?.account||account||''));
  window.addEventListener('evo:wallet-disconnected',()=>{loadGeneration++;currentWallet='';loading=false;renderDisconnected();});
  window.addEventListener('evo:entitlement-updated',event=>{if(currentWallet&&String(event.detail?.wallet||'').toLowerCase()===currentWallet&&!loading)setTimeout(()=>load(currentWallet,true),50);});
  ensureDashboard();
  if(typeof account!=='undefined'&&walletRe.test(String(account||'').toLowerCase()))load(account);else renderDisconnected();
})();