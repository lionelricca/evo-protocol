'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const walletRe=/^0x[0-9a-f]{40}$/;
  const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node};
  const short=value=>{const s=String(value||'');return s.length>18?`${s.slice(0,8)}…${s.slice(-6)}`:(s||'—')};
  const dateText=value=>{try{return new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-US':'es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return String(value||'—')}};
  const typeLabel=type=>({SERVICED:t('Servicio / mantenimiento','Service / maintenance'),REPAIRED:t('Reparación','Repair'),INSPECTED:t('Inspección','Inspection'),COMMISSIONED:t('Puesta en marcha','Commissioning'),COMPONENT_REPLACED:t('Componente reemplazado','Component replaced'),WARRANTY:t('Garantía','Warranty'),METER_READING:t('Lectura de medidor','Meter reading'),NOTE:t('Nota técnica','Technical note')}[type]||String(type||'Service Proof'));
  let activeWallet='';let requestToken=0;

  function currentWallet(){
    try{return String(typeof account!=='undefined'?account:'').toLowerCase()}catch{return ''}
  }

  async function fetchPending(wallet){
    if(typeof SUPABASE_URL==='undefined'||typeof SUPABASE_KEY==='undefined')return [];
    const url=new URL(`${SUPABASE_URL}/rest/v1/evo_service_proofs`);
    url.searchParams.set('provider_wallet',`eq.${wallet}`);
    url.searchParams.set('status','eq.ACTIVE');
    url.searchParams.set('evidence_level','eq.OWNER_DECLARED');
    url.searchParams.set('select','proof_id,seal_id,service_type,owner_wallet,provider_wallet,provider_label,technician_label,performed_at,summary,registered_at');
    url.searchParams.set('order','registered_at.desc');
    url.searchParams.set('limit','50');
    const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
    if(!response.ok)throw new Error(`Provider inbox (${response.status})`);
    return response.json();
  }

  function countersignUrl(proofId){
    const url=new URL(location.href);url.search='';url.hash='serviceProof';url.searchParams.set('serviceProof',proofId);url.searchParams.set('v','20260821-v313');
    if(document.documentElement.lang==='en')url.searchParams.set('lang','en');return url.toString();
  }

  function ensurePanel(){
    const section=document.getElementById('myEvo');if(!section?.classList.contains('ready'))return null;
    let panel=document.getElementById('evoProviderInbox');if(panel)return panel;
    panel=el('section','panel myEvoPanel evoProviderInbox');panel.id='evoProviderInbox';
    const library=section.querySelector('.myEvoLibrary');if(library)section.insertBefore(panel,library);else section.append(panel);return panel;
  }

  function render(panel,items){
    panel.textContent='';
    const head=el('div','evoProviderInboxHead');const copy=el('div');copy.append(el('span','kicker','SERVICE PROOF'),el('h3','',t('Contrafirmas pendientes','Pending countersignatures')),el('p','myEvoLibrarySub',t('Servicios donde esta wallet fue designada como proveedor. Revisá la evidencia antes de agregar tu firma.','Services where this wallet was designated as provider. Review the evidence before adding your signature.')));head.append(copy,el('span','status evoProviderInboxCount',`${items.length} ${t('pendiente(s)','pending')}`));panel.append(head);
    if(!items.length){panel.append(el('div','evoProviderInboxEmpty',t('No tenés Service Proofs pendientes de contrafirma.','You have no Service Proofs waiting for countersignature.')));return;}
    const list=el('div','evoProviderInboxList');
    items.forEach(proof=>{
      const item=el('article','evoProviderInboxItem');
      const main=el('div','');main.append(el('span','myEvoAssetType',typeLabel(proof.service_type)),el('h4','',proof.seal_id),el('p','',proof.summary||t('Sin resumen público.','No public summary.')));
      const meta=el('div','evoProviderInboxMeta');meta.append(el('span','',`${t('Propietario','Owner')}: ${short(proof.owner_wallet)}`),el('span','',dateText(proof.performed_at)),el('code','mono',proof.proof_id));if(proof.technician_label)meta.append(el('span','',`${t('Técnico','Technician')}: ${proof.technician_label}`));main.append(meta);
      const actions=el('div','evoProviderInboxActions');const review=el('button','btn primary',t('Revisar y contrafirmar','Review & countersign'));review.type='button';review.onclick=()=>{location.href=countersignUrl(proof.proof_id)};const copyLink=el('button','btn',t('Copiar enlace','Copy link'));copyLink.type='button';copyLink.onclick=()=>navigator.clipboard.writeText(countersignUrl(proof.proof_id)).then(()=>{try{toast(t('Enlace copiado','Link copied'))}catch{}});actions.append(review,copyLink);item.append(main,actions);list.append(item);
    });panel.append(list);
  }

  async function load(){
    const wallet=currentWallet();const section=document.getElementById('myEvo');
    if(!walletRe.test(wallet)||!section?.classList.contains('ready')){document.getElementById('evoProviderInbox')?.remove();return false;}
    const panel=ensurePanel();if(!panel)return false;
    const token=++requestToken;activeWallet=wallet;
    try{const items=await fetchPending(wallet);if(token!==requestToken||activeWallet!==wallet)return false;render(panel,items);return true}catch(error){if(token!==requestToken)return false;panel.textContent='';panel.append(el('div','evoProviderInboxEmpty',t('No se pudo cargar las contrafirmas pendientes.','Could not load pending countersignatures.')));return false}
  }

  let queued=false;const schedule=(delay=180)=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;load()},delay)};
  new MutationObserver(()=>schedule(220)).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('evo:wallet-connected',()=>schedule(100));
  window.addEventListener('evo:wallet-disconnected',()=>{activeWallet='';requestToken+=1;document.getElementById('evoProviderInbox')?.remove()});
  window.addEventListener('evo:entitlement-updated',()=>schedule(200));
  setTimeout(()=>schedule(0),500);
  window.evoRefreshProviderInbox=()=>load();
})();
