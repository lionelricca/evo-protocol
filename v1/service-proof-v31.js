'use strict';

(()=>{
  const SERVICE_URL=`${SUPABASE_URL}/functions/v1/evo-service-proof`;
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const walletRe=/^0x[0-9a-f]{40}$/;
  const proofRe=/^EVS-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
  const state={sealId:'',title:'',evidenceDigests:[],proof:null};
  const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node};
  const short=value=>{const s=String(value||'');return s.length>18?`${s.slice(0,8)}…${s.slice(-6)}`:(s||'—')};
  const canonical=value=>{
    if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
    if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    return JSON.stringify(value===undefined?null:value);
  };
  const sha=async text=>{const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')};
  const nonce=()=>{const b=new Uint8Array(16);crypto.getRandomValues(b);return [...b].map(v=>v.toString(16).padStart(2,'0')).join('')};
  const hashFile=async file=>{const d=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')};
  const localDateTime=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)};
  const dateText=value=>{try{return new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-US':'es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return String(value||'—')}};

  async function call(action,payload){
    const response=await fetch(SERVICE_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload})});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||`Service Proof error (${response.status})`);
    return data;
  }
  async function fetchProofsForSeal(sealId){
    const url=new URL(`${SUPABASE_URL}/rest/v1/evo_service_proofs`);
    url.searchParams.set('seal_id',`eq.${sealId}`);url.searchParams.set('status','eq.ACTIVE');
    url.searchParams.set('select','proof_id,seal_id,service_type,owner_wallet,provider_wallet,provider_label,technician_label,performed_at,summary,meter,parts,next_service,evidence_digests,service_digest,registered_at,countersigned_at,evidence_level');
    url.searchParams.set('order','performed_at.desc');
    const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
    if(!response.ok)throw new Error(`Service Proof lookup (${response.status})`);
    return response.json();
  }
  async function ensureWallet(){
    if(typeof account!=='undefined'&&walletRe.test(String(account||'').toLowerCase())&&walletProvider)return String(account).toLowerCase();
    if(typeof window.evoConnectWallet==='function')await window.evoConnectWallet();else if(typeof connectWallet==='function')await connectWallet();
    const current=String(typeof account!=='undefined'?account:'').toLowerCase();if(!walletRe.test(current)||!walletProvider)throw new Error(t('Conectá una wallet EVM para continuar.','Connect an EVM wallet to continue.'));
    return current;
  }
  function parseParts(text){
    return String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).slice(0,100).map(line=>{
      const [name,partNumber,quantity]=line.split('|').map(value=>String(value||'').trim());
      const item={name:name.slice(0,200)};
      if(partNumber)item.partNumber=partNumber.slice(0,120);
      if(quantity){const q=Number(quantity.replace(',','.'));if(Number.isFinite(q)&&q>=0)item.quantity=q;}
      return item;
    }).filter(item=>item.name);
  }
  function providerUrl(proofId){
    const url=new URL(location.href);url.search='';url.hash='serviceProof';url.searchParams.set('serviceProof',proofId);url.searchParams.set('v','20260821-v31');
    if(document.documentElement.lang==='en')url.searchParams.set('lang','en');return url.toString();
  }
  function ensurePanel(){
    let panel=document.getElementById('evoServiceProofPanel');if(panel)return panel;
    const section=document.getElementById('passport');if(!section)return null;
    panel=el('section','panel evoServiceProofPanel');panel.id='evoServiceProofPanel';panel.hidden=true;
    const form=document.createElement('form');form.id='evoServiceProofForm';form.className='form';
    const heading=el('div','evoServiceProofHead');const copy=el('div');copy.append(el('span','kicker','SERVICE PROOF'),el('h3','',t('Registrar servicio verificable','Record verifiable service')),el('p','sub',t('El propietario firma la evidencia. Un proveedor designado puede contrafirmar después.','The owner signs the evidence. A designated provider can countersign later.')));heading.append(copy);panel.append(heading,form);
    const addField=(label,node,full=false)=>{const wrap=el('label',full?'full':'');wrap.append(document.createTextNode(label),node);form.append(wrap);return wrap};
    const type=document.createElement('select');type.id='evoServiceType';[['SERVICED','Servicio / mantenimiento','Service / maintenance'],['REPAIRED','Reparación','Repair'],['INSPECTED','Inspección','Inspection'],['COMMISSIONED','Puesta en marcha','Commissioning'],['COMPONENT_REPLACED','Componente reemplazado','Component replaced'],['WARRANTY','Garantía','Warranty'],['METER_READING','Lectura de medidor','Meter reading'],['NOTE','Nota técnica','Technical note']].forEach(([value,es,en])=>{const option=document.createElement('option');option.value=value;option.textContent=t(es,en);type.append(option)});addField(t('Tipo de servicio','Service type'),type);
    const performed=document.createElement('input');performed.type='datetime-local';performed.id='evoServicePerformed';performed.value=localDateTime();addField(t('Fecha del trabajo','Work date'),performed);
    const provider=document.createElement('input');provider.id='evoServiceProviderWallet';provider.placeholder='0x…';provider.autocomplete='off';addField(t('Wallet del proveedor (opcional)','Provider wallet (optional)'),provider);
    const providerLabel=document.createElement('input');providerLabel.id='evoServiceProviderLabel';providerLabel.maxLength=160;providerLabel.placeholder=t('Ej. Taller / empresa de servicio','e.g. workshop / service company');addField(t('Proveedor / taller','Provider / workshop'),providerLabel);
    const technician=document.createElement('input');technician.id='evoServiceTechnician';technician.maxLength=160;technician.placeholder=t('Nombre público opcional','Optional public name');addField(t('Técnico','Technician'),technician);
    const meterKind=document.createElement('select');meterKind.id='evoServiceMeterKind';[['','Sin lectura','No reading'],['HOURS','Horas','Hours'],['ODOMETER_KM','Kilómetros','Kilometres'],['CYCLES','Ciclos','Cycles'],['OTHER','Otro','Other']].forEach(([value,es,en])=>{const option=document.createElement('option');option.value=value;option.textContent=t(es,en);meterKind.append(option)});addField(t('Medidor','Meter'),meterKind);
    const meterValue=document.createElement('input');meterValue.id='evoServiceMeterValue';meterValue.type='number';meterValue.min='0';meterValue.step='any';meterValue.placeholder='0';addField(t('Lectura','Reading'),meterValue);
    const meterUnit=document.createElement('input');meterUnit.id='evoServiceMeterUnit';meterUnit.maxLength=32;meterUnit.placeholder='h / km / cycles';addField(t('Unidad','Unit'),meterUnit);
    const summary=document.createElement('textarea');summary.id='evoServiceSummary';summary.maxLength=4000;summary.required=true;summary.placeholder=t('Trabajo realizado, resultado y observaciones relevantes.','Work performed, result and relevant observations.');addField(t('Resumen del servicio','Service summary'),summary,true);
    const parts=document.createElement('textarea');parts.id='evoServiceParts';parts.placeholder=t('Una línea por repuesto: Nombre | N° parte | Cantidad','One line per part: Name | Part number | Quantity');addField(t('Repuestos / componentes (opcional)','Parts / components (optional)'),parts,true);
    const nextDate=document.createElement('input');nextDate.id='evoServiceNextDate';nextDate.type='date';addField(t('Próximo servicio · fecha','Next service · date'),nextDate);
    const nextMeter=document.createElement('input');nextMeter.id='evoServiceNextMeter';nextMeter.type='number';nextMeter.min='0';nextMeter.step='any';addField(t('Próximo servicio · lectura','Next service · meter'),nextMeter);
    const evidence=document.createElement('input');evidence.id='evoServiceEvidence';evidence.type='file';evidence.multiple=true;const evidenceWrap=addField(t('Evidencia local (opcional)','Local evidence (optional)'),evidence,true);evidenceWrap.append(el('span','sub',t('EVO guarda sólo SHA-256. Los archivos no se suben.','EVO stores SHA-256 only. Files are not uploaded.')));
    const evidenceState=el('div','full evoServiceEvidenceState',t('Sin archivos seleccionados.','No files selected.'));evidenceState.id='evoServiceEvidenceState';form.append(evidenceState);
    const actions=el('div','full actions');const submit=el('button','btn primary',t('Firmar Service Proof','Sign Service Proof'));submit.type='submit';const cancel=el('button','btn',t('Cancelar','Cancel'));cancel.type='button';cancel.onclick=()=>{panel.hidden=true};actions.append(submit,cancel);form.append(actions);
    const result=el('div','full empty',t('Todavía no registraste este servicio.','This service has not been recorded yet.'));result.id='evoServiceResult';form.append(result);
    evidence.addEventListener('change',async()=>{state.evidenceDigests=[];const files=[...evidence.files||[]].slice(0,30);evidenceState.textContent=files.length?t('Calculando SHA-256…','Calculating SHA-256…'):t('Sin archivos seleccionados.','No files selected.');try{for(const file of files)state.evidenceDigests.push(await hashFile(file));evidenceState.textContent=files.length?`${files.length} ${t('archivo(s) protegido(s) por SHA-256','file(s) protected by SHA-256')}`:t('Sin archivos seleccionados.','No files selected.')}catch{state.evidenceDigests=[];evidenceState.textContent=t('No se pudo calcular una huella.','Could not calculate a fingerprint.')}});
    form.addEventListener('submit',submitOwnerProof);
    const bar=section.querySelector('.evoManageBar');if(bar?.nextSibling)section.insertBefore(panel,bar.nextSibling);else section.prepend(panel);return panel;
  }
  async function submitOwnerProof(event){
    event.preventDefault();const out=document.getElementById('evoServiceResult');
    try{
      const owner=await ensureWallet();const sealId=String(state.sealId||document.getElementById('passportSealId')?.value||'').trim().toUpperCase();if(!sealId)throw new Error(t('Abrí un activo desde Mi EVO antes de registrar el servicio.','Open an asset from My EVO before recording service.'));
      const seal=await fetchSeal(sealId);if(!seal)throw new Error(t('El activo no existe o no está activo.','The asset does not exist or is not active.'));
      if(String(seal.asset_type||'').toLowerCase().includes('document'))throw new Error(t('Service Proof corresponde a activos, no a Document Proof.','Service Proof applies to assets, not Document Proof.'));
      const events=await fetchPassportEvents(sealId);const currentOwner=currentOwnerFrom(seal,events);if(owner!==currentOwner)throw new Error(`${t('Sólo el propietario actual puede registrar el Service Proof.','Only the current owner can record the Service Proof.')} ${short(currentOwner)}`);
      const serviceType=document.getElementById('evoServiceType').value;const performedRaw=document.getElementById('evoServicePerformed').value;if(!performedRaw)throw new Error(t('Indicá la fecha del trabajo.','Enter the work date.'));const performedAt=new Date(performedRaw).toISOString();
      const summary=String(document.getElementById('evoServiceSummary').value||'').trim();if(summary.length<3)throw new Error(t('El resumen debe tener al menos 3 caracteres.','Summary must contain at least 3 characters.'));
      const provider=String(document.getElementById('evoServiceProviderWallet').value||'').trim().toLowerCase();if(provider&&!walletRe.test(provider))throw new Error(t('La wallet del proveedor no es válida.','Provider wallet is invalid.'));
      const providerLabel=String(document.getElementById('evoServiceProviderLabel').value||'').trim();const technicianLabel=String(document.getElementById('evoServiceTechnician').value||'').trim();
      const meterKind=document.getElementById('evoServiceMeterKind').value;const meterRaw=document.getElementById('evoServiceMeterValue').value;const meter=meterKind&&meterRaw!==''?{kind:meterKind,value:Number(meterRaw),unit:String(document.getElementById('evoServiceMeterUnit').value||'').trim().slice(0,32)}:{};
      const parts=parseParts(document.getElementById('evoServiceParts').value);const nextService={};const nextDate=document.getElementById('evoServiceNextDate').value;if(nextDate)nextService.dueAt=new Date(`${nextDate}T12:00:00`).toISOString();const nextMeter=document.getElementById('evoServiceNextMeter').value;if(nextMeter!=='')nextService.dueMeterValue=Number(nextMeter);
      const evidenceDigests=[...state.evidenceDigests];const createdAt=new Date().toISOString();const ownerNonce=nonce();const serviceDigest=await sha([sealId,serviceType,owner,provider,performedAt,summary,canonical(meter),canonical(parts),canonical(nextService),canonical(evidenceDigests),createdAt,ownerNonce].join('|'));
      const proofId=`EVS-${serviceDigest.slice(0,8).toUpperCase()}-${serviceDigest.slice(8,16).toUpperCase()}-${serviceDigest.slice(16,24).toUpperCase()}`;
      const ownerMessage=`EVO SERVICE PROOF V1\nProof ID: ${proofId}\nSeal ID: ${sealId}\nType: ${serviceType}\nOwner: ${owner}\nProvider: ${provider||'N/A'}\nDigest: ${serviceDigest}\nCreated: ${createdAt}`;
      toast(t('Confirmá la firma del Service Proof. No mueve fondos.','Confirm the Service Proof signature. No funds are moved.'));
      const ownerSignature=await walletProvider.request({method:'personal_sign',params:[ownerMessage,owner]});
      await call('create',{proofId,sealId,version:'EVO-SERVICE-PROOF-V1',serviceType,ownerWallet:owner,providerWallet:provider,providerLabel,technicianLabel,performedAt,summary,meter,parts,nextService,evidenceDigests,serviceDigest,ownerNonce,ownerSignature,ownerMessage,createdAt});
      out.className='full result';out.textContent='';out.append(el('span','status ok',t('✓ SERVICE PROOF REGISTRADO','✓ SERVICE PROOF RECORDED')),el('code','mono',proofId));
      if(provider){const link=providerUrl(proofId);const note=el('p','',t('El proveedor designado puede contrafirmar este mismo registro.','The designated provider can countersign this same record.'));const copy=el('button','btn',t('Copiar enlace para proveedor','Copy provider link'));copy.type='button';copy.onclick=()=>navigator.clipboard.writeText(link).then(()=>toast(t('Enlace copiado','Link copied')));out.append(note,copy)}
      toast(t('Service Proof agregado al Passport','Service Proof added to Passport'));renderPublicServiceProofs(sealId,true);
    }catch(error){out.className='full result';out.textContent='';out.append(el('span','status bad',t('✕ NO REGISTRADO','✕ NOT RECORDED')),el('p','',error?.message||String(error)))}
  }
  function openForManage(){
    const bar=document.querySelector('.evoManageBar');const seal=String(bar?.dataset?.seal||document.getElementById('passportSealId')?.value||'').trim().toUpperCase();if(!seal)return;
    state.sealId=seal;state.title=String(bar?.dataset?.title||'');const panel=ensurePanel();if(!panel)return;panel.hidden=false;document.getElementById('evoServicePerformed').value=localDateTime();const nav=document.querySelector('nav');const top=Math.max(0,panel.getBoundingClientRect().top+scrollY-(nav?.offsetHeight||76)-12);scrollTo({top,behavior:'smooth'});
  }
  function decorateManageBar(){
    const bar=document.querySelector('.evoManageBar');if(!bar||bar.hidden)return;const actions=bar.querySelector('.evoManageActions');if(!actions)return;
    let button=actions.querySelector('.evoManageServiceProof');if(!button){button=el('button','btn evoManageServiceProof',t('Service Proof','Service Proof'));button.type='button';button.onclick=openForManage;const transfer=actions.querySelector('.evoManageTransfer');if(transfer)actions.insertBefore(button,transfer);else actions.prepend(button)}
    button.hidden=Boolean(document.getElementById('passport')?.classList.contains('evoDocumentManageMode'));
  }

  function evidenceLabel(level){return level==='PROVIDER_COUNTERSIGNED'?t('CONTRAFIRMADO POR PROVEEDOR','PROVIDER COUNTERSIGNED'):t('DECLARADO POR PROPIETARIO','OWNER DECLARED')}
  function serviceLabel(type){const labels={SERVICED:t('Servicio / mantenimiento','Service / maintenance'),REPAIRED:t('Reparación','Repair'),INSPECTED:t('Inspección','Inspection'),COMMISSIONED:t('Puesta en marcha','Commissioning'),COMPONENT_REPLACED:t('Componente reemplazado','Component replaced'),WARRANTY:t('Garantía','Warranty'),METER_READING:t('Lectura de medidor','Meter reading'),NOTE:t('Nota técnica','Technical note')};return labels[type]||type}
  async function renderPublicServiceProofs(sealId,force=false){
    const host=document.getElementById('publicAssetPage');const grid=host?.querySelector('.publicAssetGrid');if(!host?.classList.contains('ready')||!grid)return false;
    if(!force&&grid.querySelector('.evoPublicServiceProofs'))return true;grid.querySelector('.evoPublicServiceProofs')?.remove();
    let proofs=[];try{proofs=await fetchProofsForSeal(sealId)}catch{return false}if(!proofs.length)return true;
    const panel=el('div','publicAssetPanel evoPublicServiceProofs');panel.style.gridColumn='1/-1';panel.append(el('h3','',t('Service Proofs','Service Proofs')));
    const intro=el('p','publicAssetDescription',t('Servicios firmados asociados a este activo. El nivel de evidencia indica quién firmó cada registro.','Signed services associated with this asset. Evidence level shows who signed each record.'));panel.append(intro);
    const timeline=el('div','evoServiceTimeline');proofs.forEach(proof=>{const item=el('article','evoServiceItem');const head=el('div','evoServiceItemHead');const copy=el('div');copy.append(el('span','evoServiceType',serviceLabel(proof.service_type)),el('b','',dateText(proof.performed_at)));const badge=el('span',proof.evidence_level==='PROVIDER_COUNTERSIGNED'?'status ok':'status',evidenceLabel(proof.evidence_level));head.append(copy,badge);item.append(head,el('p','',proof.summary));const meta=el('div','evoServiceMeta');meta.append(el('code','mono',proof.proof_id));if(proof.provider_label)meta.append(el('span','',`${t('Proveedor','Provider')}: ${proof.provider_label}`));if(proof.technician_label)meta.append(el('span','',`${t('Técnico','Technician')}: ${proof.technician_label}`));if(proof.meter?.value!==undefined)meta.append(el('span','',`${t('Lectura','Reading')}: ${proof.meter.value} ${proof.meter.unit||''}`.trim()));if(Array.isArray(proof.evidence_digests)&&proof.evidence_digests.length)meta.append(el('span','',`${proof.evidence_digests.length} SHA-256 ${t('de evidencia','evidence fingerprints')}`));item.append(meta);timeline.append(item)});panel.append(timeline);grid.append(panel);return true;
  }
  async function renderCountersign(){
    const proofId=String(new URLSearchParams(location.search).get('serviceProof')||'').trim().toUpperCase();if(!proofRe.test(proofId))return;
    let section=document.getElementById('evoServiceCountersign');if(!section){section=el('section','wrap block');section.id='evoServiceCountersign';const passport=document.getElementById('passport');passport?.parentNode?.insertBefore(section,passport)}section.textContent='';const panel=el('div','panel evoCountersignPanel');panel.append(el('span','kicker','SERVICE PROOF'),el('h2','',t('Contrafirma del proveedor','Provider countersignature')),el('p','sub',t('Revisá la evidencia antes de firmar. La contrafirma demuestra control de la wallet designada; no certifica por sí sola la calidad del trabajo.','Review the evidence before signing. The countersignature proves control of the designated wallet; it does not by itself certify service quality.')));section.append(panel);
    try{const {proof}=await call('lookup',{proofId});state.proof=proof;const facts=el('div','evoCountersignFacts');[['Proof ID',proof.proof_id],[t('Activo','Asset'),proof.seal_id],[t('Tipo','Type'),serviceLabel(proof.service_type)],[t('Fecha','Date'),dateText(proof.performed_at)],[t('Propietario','Owner'),short(proof.owner_wallet)],[t('Proveedor designado','Designated provider'),short(proof.provider_wallet)]].forEach(([label,value])=>{const row=el('div');row.append(el('span','',label),el('b','',value));facts.append(row)});panel.append(facts,el('p','evoCountersignSummary',proof.summary));const status=el('div','passportNotice',proof.evidence_level==='PROVIDER_COUNTERSIGNED'?t('Este Service Proof ya fue contrafirmado.','This Service Proof is already countersigned.'):t('Pendiente de contrafirma del proveedor designado.','Waiting for the designated provider countersignature.'));panel.append(status);if(proof.evidence_level!=='PROVIDER_COUNTERSIGNED'&&proof.provider_wallet){const button=el('button','btn primary',t('Contrafirmar Service Proof','Countersign Service Proof'));button.type='button';button.onclick=()=>countersign(proof,status,button);panel.append(button)}}catch(error){panel.append(el('div','result',error?.message||String(error)))}
    history.replaceState(null,'',`${location.pathname}${location.search}#serviceProof`);setTimeout(()=>section.scrollIntoView({behavior:'smooth',block:'start'}),150);
  }
  async function countersign(proof,status,button){
    try{const actor=await ensureWallet();if(actor!==String(proof.provider_wallet||'').toLowerCase())throw new Error(`${t('Este Proof está reservado a la wallet del proveedor designado:','This Proof is reserved for the designated provider wallet:')} ${short(proof.provider_wallet)}`);const createdAt=new Date().toISOString();const n=nonce();const providerDigest=await sha([proof.proof_id,proof.seal_id,proof.owner_wallet,proof.provider_wallet,proof.service_digest,createdAt,n].join('|'));const signatureMessage=`EVO SERVICE PROOF COUNTERSIGN V1\nProof ID: ${proof.proof_id}\nSeal ID: ${proof.seal_id}\nOwner: ${proof.owner_wallet}\nProvider: ${proof.provider_wallet}\nService digest: ${proof.service_digest}\nProvider digest: ${providerDigest}\nCountersigned: ${createdAt}`;toast(t('Confirmá la contrafirma. No mueve fondos.','Confirm the countersignature. No funds are moved.'));const signature=await walletProvider.request({method:'personal_sign',params:[signatureMessage,actor]});await call('countersign',{proofId:proof.proof_id,actorWallet:actor,createdAt,nonce:n,providerDigest,signature,signatureMessage});status.textContent=t('Service Proof contrafirmado por el proveedor.','Service Proof countersigned by provider.');status.classList.add('ok');button.remove();toast(t('Contrafirma registrada','Countersignature recorded'))}catch(error){toast(error?.message||String(error))}
  }

  let queued=false;const scan=()=>{decorateManageBar();const seal=String(new URLSearchParams(location.search).get('seal')||'').trim().toUpperCase();if(seal)renderPublicServiceProofs(seal);};const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan()})};new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('evo:wallet-connected',()=>setTimeout(schedule,80));document.addEventListener('click',event=>{if(event.target.closest('.myEvoManageAsset'))setTimeout(schedule,350)});setTimeout(()=>{schedule();renderCountersign()},120);
})();
