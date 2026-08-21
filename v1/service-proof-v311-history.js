'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const sealRe=/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
  const short=value=>{const s=String(value||'');return s.length>18?`${s.slice(0,8)}…${s.slice(-6)}`:(s||'—')};
  const dateText=value=>{try{return new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-US':'es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return String(value||'—')}};
  const serviceLabel=type=>({
    SERVICED:t('Servicio / mantenimiento','Service / maintenance'),
    REPAIRED:t('Reparación','Repair'),
    INSPECTED:t('Inspección','Inspection'),
    COMMISSIONED:t('Puesta en marcha','Commissioning'),
    COMPONENT_REPLACED:t('Componente reemplazado','Component replaced'),
    WARRANTY:t('Garantía','Warranty'),
    METER_READING:t('Lectura de medidor','Meter reading'),
    NOTE:t('Nota técnica','Technical note')
  }[type]||String(type||'SERVICE'));
  const evidenceLabel=level=>level==='PROVIDER_COUNTERSIGNED'
    ?t('CONTRAFIRMADO POR PROVEEDOR','PROVIDER COUNTERSIGNED')
    :t('DECLARADO POR PROPIETARIO','OWNER DECLARED');

  async function fetchProofs(sealId){
    if(typeof SUPABASE_URL==='undefined'||typeof SUPABASE_KEY==='undefined')return [];
    const url=new URL(`${SUPABASE_URL}/rest/v1/evo_service_proofs`);
    url.searchParams.set('seal_id',`eq.${sealId}`);
    url.searchParams.set('status','eq.ACTIVE');
    url.searchParams.set('select','proof_id,seal_id,service_type,owner_wallet,provider_wallet,provider_label,technician_label,performed_at,summary,meter,parts,next_service,evidence_digests,registered_at,countersigned_at,evidence_level');
    url.searchParams.set('order','performed_at.asc');
    const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
    if(!response.ok)throw new Error(`Service Proof lookup (${response.status})`);
    return response.json();
  }

  function managedSeal(){
    return String(document.getElementById('passportSealId')?.value||'').trim().toUpperCase();
  }

  function buildManagedEvent(proof){
    const item=document.createElement('div');
    item.className='passportEvent evoServiceHistoryEvent';
    item.dataset.proofId=proof.proof_id;
    const title=document.createElement('h4');
    title.textContent=`Service Proof · ${serviceLabel(proof.service_type)}`;
    const detail=document.createElement('p');detail.textContent=proof.summary||'';
    const level=document.createElement('span');
    level.className=proof.evidence_level==='PROVIDER_COUNTERSIGNED'?'status ok':'status';
    level.textContent=evidenceLabel(proof.evidence_level);
    const meta=document.createElement('div');meta.className='eventMeta';
    const parts=[dateText(proof.performed_at),proof.proof_id];
    if(proof.provider_label)parts.push(`${t('Proveedor','Provider')}: ${proof.provider_label}`);
    else if(proof.provider_wallet)parts.push(`${t('Proveedor','Provider')}: ${short(proof.provider_wallet)}`);
    if(proof.technician_label)parts.push(`${t('Técnico','Technician')}: ${proof.technician_label}`);
    meta.textContent=parts.join(' · ');
    item.append(title,detail,level,meta);
    return item;
  }

  async function syncManagedHistory(sealId=managedSeal()){
    if(!sealRe.test(sealId))return false;
    const out=document.getElementById('passportTimeline');
    const timeline=out?.querySelector('.passportTimeline');
    if(!out||!timeline)return false;
    let proofs=[];try{proofs=await fetchProofs(sealId)}catch{return false}
    timeline.querySelectorAll('.evoServiceHistoryEvent').forEach(node=>node.remove());
    proofs.forEach(proof=>timeline.append(buildManagedEvent(proof)));
    const baseCount=timeline.querySelectorAll('.passportEvent:not(.evoServiceHistoryEvent)').length;
    const stats=out.querySelectorAll('.passportSummary .passportStat');
    const countNode=stats[1]?.querySelector('b');
    if(countNode)countNode.textContent=String(baseCount+proofs.length);
    const notice=out.querySelector('.passportNotice');
    if(notice&&proofs.length){
      notice.textContent=t(
        'El historial combina eventos del propietario y Service Proofs. Cada Service Proof indica si fue sólo declarado por el propietario o contrafirmado por el proveedor designado.',
        'History combines owner events and Service Proofs. Each Service Proof shows whether it was owner-declared only or countersigned by the designated provider.'
      );
    }
    return true;
  }

  async function syncPublicCounter(sealId){
    if(!sealRe.test(sealId))return false;
    const host=document.getElementById('publicAssetPage');
    if(!host?.classList.contains('ready'))return false;
    let proofs=[];try{proofs=await fetchProofs(sealId)}catch{return false}
    const baseCount=host.querySelectorAll('.publicAssetTimeline .publicAssetEvent').length;
    const states=host.querySelectorAll('.publicAssetState');
    const countNode=states[3]?.querySelector('b');
    const total=baseCount+proofs.length;
    if(countNode)countNode.textContent=document.documentElement.lang==='en'
      ?`${total} ${total===1?'EVENT':'EVENTS'}`
      :`${total} ${total===1?'EVENTO':'EVENTOS'}`;
    return true;
  }

  function scheduleManaged(delay=650){setTimeout(()=>syncManagedHistory(),delay)}
  document.getElementById('passportLoadBtn')?.addEventListener('click',()=>scheduleManaged(700));
  document.addEventListener('submit',event=>{if(event.target?.id==='evoServiceProofForm')scheduleManaged(1300)},true);
  document.addEventListener('click',event=>{if(event.target.closest('.myEvoManageAsset'))scheduleManaged(1100)});
  window.addEventListener('evo:wallet-connected',()=>scheduleManaged(900));

  const querySeal=String(new URLSearchParams(location.search).get('seal')||'').trim().toUpperCase();
  if(sealRe.test(querySeal)){
    let attempts=0;
    const timer=setInterval(async()=>{
      attempts+=1;
      if(await syncPublicCounter(querySeal)||attempts>30)clearInterval(timer);
    },250);
  }

  let managedAttempts=0;
  const managedTimer=setInterval(async()=>{
    managedAttempts+=1;
    const seal=managedSeal();
    if((sealRe.test(seal)&&await syncManagedHistory(seal))||managedAttempts>24)clearInterval(managedTimer);
  },300);

  window.evoSyncServiceHistory=syncManagedHistory;
})();
