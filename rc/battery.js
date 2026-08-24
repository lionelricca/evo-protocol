(()=>{
  if(document.getElementById('battery-dpp'))return;
  const BATTERY_URL=`${SUPABASE_URL}/functions/v1/evo-battery-passport`;
  const css=document.createElement('link');css.rel='stylesheet';css.href='/evo-protocol/v1/battery.css?v=20260816-2347';document.head.appendChild(css);

  const navLinks=document.querySelector('nav .links');
  if(navLinks&&!navLinks.querySelector('a[href="#battery-dpp"]')){
    const a=document.createElement('a');a.href='#battery-dpp';a.textContent='Battery DPP';
    const wallet=document.getElementById('walletBtn');wallet?navLinks.insertBefore(a,wallet):navLinks.appendChild(a);
  }

  const section=document.createElement('section');
  section.id='battery-dpp';section.className='wrap block';
  section.innerHTML=`
    <h2>EVO Battery Passport</h2>
    <p class="sub">Preparación técnica para el Battery Passport de la UE. EVO compara los datos disponibles contra Regulation (EU) 2023/1542 y separa información pública, de interés legítimo y de autoridades. El resultado es readiness, no una certificación legal.</p>
    <div class="batteryHero">
      <div class="panel"><span class="kicker">EU BATTERY PASSPORT · COMPLIANCE ENGINE V0.1</span><h3>¿Tu batería está lista?</h3><p>Desde el 18 de febrero de 2027 el pasaporte aplica a baterías LMT, baterías de vehículos eléctricos y baterías industriales de más de 2 kWh introducidas en el mercado de la UE.</p><div class="batteryDisclaimer">EVO no afirma que una batería sea conforme ni sustituye a una autoridad, organismo notificado o asesor legal. Este módulo identifica datos faltantes y prepara el registro técnico.</div></div>
      <div class="panel batteryDeadline"><strong>18·02·27</strong><span>Fecha de aplicación del Battery Passport para las categorías cubiertas por Article 77(1).</span></div>
    </div>
    <div class="grid">
      <form id="bpScanForm" class="panel form">
        <label>Categoría<select id="bpCategory"><option value="INDUSTRIAL">Industrial</option><option value="EV">Electric vehicle</option><option value="LMT">LMT / movilidad ligera</option><option value="OTHER">Otra / revisar clasificación</option></select></label>
        <label>Energía nominal (kWh)<input id="bpEnergy" type="number" min="0" step="0.001" placeholder="Ej. 100"></label>
        <label>Nombre del modelo<input id="bpModelName" maxlength="240" placeholder="Ej. EVO Storage 100"></label>
        <label>Identificador del modelo<input id="bpUniqueModel" maxlength="240" placeholder="Ej. MODEL-LFP-100KWH"></label>
        <label>Fabricante<input id="bpManufacturer" maxlength="300" placeholder="Empresa + identificación"></label>
        <label>Lugar de fabricación<input id="bpPlace" maxlength="300" placeholder="Ciudad / planta / país"></label>
        <label>Fecha fabricación<input id="bpDate" type="month"></label>
        <label>Peso (kg)<input id="bpWeight" type="number" min="0" step="0.001"></label>
        <label>Capacidad (Ah)<input id="bpCapacity" type="number" min="0" step="0.001"></label>
        <label>Química<input id="bpChemistry" placeholder="Ej. LFP / NMC"></label>
        <label class="full">Sustancias peligrosas<input id="bpHazardous" placeholder="Separadas por coma"></label>
        <label>Agente extintor utilizable<input id="bpExtinguisher" placeholder="Según documentación del fabricante"></label>
        <label>Materias primas críticas<input id="bpCritical" placeholder="Separadas por coma"></label>
        <label>Voltaje mínimo (V)<input id="bpVmin" type="number" step="0.001"></label>
        <label>Voltaje nominal (V)<input id="bpVnom" type="number" step="0.001"></label>
        <label>Voltaje máximo (V)<input id="bpVmax" type="number" step="0.001"></label>
        <label>Potencia original (W)<input id="bpPower" type="number" min="0" step="1"></label>
        <label>Vida esperada (ciclos)<input id="bpCycles" type="number" min="0" step="1"></label>
        <label>Ensayo de referencia<input id="bpLifetimeTest" placeholder="Norma / método"></label>
        <label>Temperatura almacenaje<input id="bpStorageTemp" placeholder="Ej. -20 °C a 50 °C"></label>
        <label>Garantía calendario<input id="bpWarranty" placeholder="Ej. 10 años"></label>
        <label>Eficiencia round-trip inicial<input id="bpRteInitial" placeholder="Ej. 95 %"></label>
        <label>Eficiencia al 50% vida<input id="bpRteHalf" placeholder="Ej. 90 %"></label>
        <label>Resistencia interna celda<input id="bpCellResistance" placeholder="Valor + unidad"></label>
        <label>Resistencia interna pack<input id="bpPackResistance" placeholder="Valor + unidad"></label>
        <label>C-rate ensayo vida<input id="bpCRate" placeholder="Ej. 0.5C"></label>
        <label class="full">Declaración UE de conformidad<input id="bpDeclaration" placeholder="Referencia / URL / documento"></label>
        <label class="full">Prevención y gestión de residuo<input id="bpWaste" placeholder="Referencia a instrucciones/documentación"></label>
        <details class="batteryAdvanced"><summary>Campos condicionales: marcar sólo cuando realmente no aplican</summary><div class="batteryCheckGrid">
          <label><input type="checkbox" data-bp-na="carbonFootprint"> Carbon footprint no aplicable al caso concreto</label>
          <label><input type="checkbox" data-bp-na="responsibleSourcing"> Due diligence / responsible sourcing no aplicable</label>
          <label><input type="checkbox" data-bp-na="recycledContent"> Recycled content no aplicable</label>
          <label><input type="checkbox" data-bp-na="renewableContentShare"> Renewable content no aplicable</label>
          <label><input type="checkbox" data-bp-na="voltageTemperatureRange"> Rango de temperatura de voltaje no aplicable</label>
          <label><input type="checkbox" data-bp-na="powerLimits"> Límites/rango térmico de potencia no aplicable</label>
          <label><input type="checkbox" data-bp-na="markingRequirements"> Marcados condicionales no aplicables</label>
          <label><input type="checkbox" data-bp-na="capacityExhaustionThreshold"> Umbral de agotamiento no aplicable</label>
        </div></details>
        <div class="full actions"><button id="bpAssessBtn" class="btn primary" type="submit">Analizar readiness</button><button id="bpSaveModelBtn" class="btn gold" type="button">Firmar y guardar modelo</button></div>
        <div class="full batteryDisclaimer">Marcar “no aplicable” no elimina la necesidad de justificar esa decisión frente al requisito correspondiente. EVO conserva esa distinción para evitar transformar un checkbox en una declaración de cumplimiento.</div>
      </form>
      <div class="panel"><h3>DPP Readiness</h3><div id="bpResult" class="empty">Completá los datos que ya tengas. EVO mostrará qué falta y qué nivel de acceso corresponde a cada requisito.</div><div id="bpSaveResult" style="margin-top:12px"></div></div>
    </div>
    <div class="panel batteryLookup"><h3>Consultar modelo público</h3><p class="sub">Sólo los modelos que alcanzan estado READY se publican como ACTIVE. Los borradores permanecen fuera de esta consulta pública.</p><div class="batteryLookupRow"><input id="bpLookupId" placeholder="EBM-XXXXXXXX-XXXXXXXX-XXXXXXXX"><button id="bpLookupBtn" class="btn" type="button">Consultar</button></div><div id="bpLookupResult" class="empty" style="margin-top:12px">Ingresá un EVO Battery Model ID.</div><div class="batteryEndpoint">Restricted blocks are never returned by this public lookup.</div></div>`;

  const guardian=document.getElementById('guardian');
  const main=document.querySelector('main');
  if(guardian?.parentNode)guardian.parentNode.insertBefore(section,guardian);else main?.appendChild(section);

  const val=id=>String(document.getElementById(id)?.value||'').trim();
  const num=id=>{const v=val(id);return v===''?'':Number(v)};
  const csv=id=>val(id).split(',').map(x=>x.trim()).filter(Boolean);
  const setIf=(o,k,v)=>{if(v!==''&&v!==null&&v!==undefined&&(!Array.isArray(v)||v.length))o[k]=v};

  function collectBattery(){
    const category=val('bpCategory').toUpperCase();
    const uniqueModelIdentifier=val('bpUniqueModel');
    const fields={batteryCategory:category,batteryIdentification:uniqueModelIdentifier};
    setIf(fields,'manufacturerIdentity',val('bpManufacturer'));
    setIf(fields,'manufacturingPlace',val('bpPlace'));
    setIf(fields,'manufactureDate',val('bpDate'));
    setIf(fields,'weightKg',num('bpWeight'));
    setIf(fields,'capacityAh',num('bpCapacity'));
    setIf(fields,'chemistry',val('bpChemistry'));
    setIf(fields,'hazardousSubstances',csv('bpHazardous'));
    setIf(fields,'usableExtinguishingAgent',val('bpExtinguisher'));
    setIf(fields,'criticalRawMaterials',csv('bpCritical'));
    setIf(fields,'voltageMinV',num('bpVmin'));
    setIf(fields,'voltageNominalV',num('bpVnom'));
    setIf(fields,'voltageMaxV',num('bpVmax'));
    setIf(fields,'originalPowerW',num('bpPower'));
    setIf(fields,'expectedLifetimeCycles',num('bpCycles'));
    setIf(fields,'lifetimeReferenceTest',val('bpLifetimeTest'));
    setIf(fields,'storageTemperatureRange',val('bpStorageTemp'));
    setIf(fields,'commercialWarrantyPeriod',val('bpWarranty'));
    setIf(fields,'roundTripEfficiencyInitial',val('bpRteInitial'));
    setIf(fields,'roundTripEfficiencyHalfLife',val('bpRteHalf'));
    setIf(fields,'cellResistance',val('bpCellResistance'));
    setIf(fields,'packResistance',val('bpPackResistance'));
    setIf(fields,'cycleLifeTestCRate',val('bpCRate'));
    setIf(fields,'euDeclarationOfConformity',val('bpDeclaration'));
    setIf(fields,'wastePreventionManagement',val('bpWaste'));
    const notApplicable=[...section.querySelectorAll('[data-bp-na]:checked')].map(el=>el.getAttribute('data-bp-na')).filter(Boolean);
    return {scope:'MODEL',batteryCategory:category,nominalEnergyKwh:num('bpEnergy'),modelName:val('bpModelName'),uniqueModelIdentifier,fields,notApplicable};
  }

  async function request(action,payload={}){
    const r=await fetch(BATTERY_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data.error||`Battery Passport error (${r.status})`);
    return data;
  }

  function appBadge(app){
    const s=String(app?.state||'NEEDS_CLASSIFICATION_REVIEW');
    if(s==='LIKELY_REQUIRED')return '<span class="status warn">LIKELY REQUIRED · 18 FEB 2027</span>';
    if(s==='NOT_APPLICABLE_BY_ART77_1')return '<span class="status ok">NOT APPLICABLE BY ART. 77(1)</span>';
    return '<span class="status warn">CLASSIFICATION REVIEW NEEDED</span>';
  }

  function renderAssessment(a){
    const missing=(a.missing||[]).map(m=>`<div class="item"><b>${esc(m.label)}</b><small>${esc(m.reference)}</small><span class="batteryAccess">${esc(m.access)}</span>${m.conditional?'<span class="batteryAccess">CONDITIONAL</span>':''}</div>`).join('');
    const stateClass=a.state==='READY'||a.state==='NOT_APPLICABLE'?'ok':'warn';
    return `${appBadge(a.applicability)}<div class="batteryScore" style="margin-top:16px"><div class="batteryGauge" style="--score:${Number(a.score)||0}"><div><b>${Number(a.score)||0}%</b><small>MODEL READINESS</small></div></div><div><span class="status ${stateClass}">${esc(a.state)}</span><p>${esc(a.applicability?.reason||'')}</p><p class="sub">Public data readiness: <b>${Number(a.publicScore)||0}%</b></p></div></div><div class="batteryResultGrid"><div class="batteryMetric"><b>${a.counts?.complete||0}</b><span>resolved</span></div><div class="batteryMetric"><b>${a.counts?.missing||0}</b><span>missing</span></div><div class="batteryMetric"><b>${a.counts?.total||0}</b><span>model requirements</span></div></div><div class="batteryDisclaimer">Resultado técnico de preparación. Un 100% significa que los campos del motor V0.1 están resueltos; no significa certificación ni aprobación de una autoridad.</div>${missing?`<h3 style="margin-top:18px">Datos pendientes</h3><div class="batteryMissing">${missing}</div>`:'<p><span class="status ok">✓ NO MISSING MODEL DATA IN V0.1</span></p>'}`;
  }

  const form=document.getElementById('bpScanForm');
  const result=document.getElementById('bpResult');
  const saveResult=document.getElementById('bpSaveResult');
  let lastAssessment=null;

  form.onsubmit=async e=>{e.preventDefault();result.className='result';result.textContent='Analizando requisitos del Battery Passport…';try{const data=await request('assess',{battery:collectBattery()});lastAssessment=data.assessment;result.innerHTML=renderAssessment(lastAssessment)}catch(err){result.innerHTML=`<span class="status bad">✕ SCAN ERROR</span><p>${esc(err.message||String(err))}</p>`}};

  document.getElementById('bpSaveModelBtn').onclick=async()=>{
    saveResult.className='result';saveResult.textContent='Preparando modelo firmado…';
    try{
      if(!account||!walletProvider)await connectWallet();
      const battery=collectBattery();
      if(!battery.modelName||!battery.uniqueModelIdentifier)throw new Error('Completá nombre e identificador del modelo antes de guardarlo.');
      const prep=await request('prepare_model',{issuerWallet:account,battery});
      result.className='result';result.innerHTML=renderAssessment(prep.assessment);lastAssessment=prep.assessment;
      toast('Confirmá la firma del Battery Model en MetaMask. No mueve fondos.');
      const signature=await walletProvider.request({method:'personal_sign',params:[prep.signatureMessage,account]});
      const commit=await request('commit_model',{payload:{issuerWallet:account,modelId:prep.modelId,dataHash:prep.dataHash,signedAt:prep.signedAt,signatureMessage:prep.signatureMessage,modelState:prep.modelState,signature}});
      const cls=commit.model?.status==='ACTIVE'?'ok':'warn';
      saveResult.innerHTML=`<span class="status ${cls}">${esc(commit.model?.status||'SAVED')}</span><div class="kv"><span>Battery Model ID</span><b class="mono">${esc(commit.model?.model_id||prep.modelId)}</b></div><div class="kv"><span>Data hash</span><span class="mono">${esc(commit.model?.data_hash||prep.dataHash)}</span></div><p>${commit.model?.status==='ACTIVE'?'El modelo alcanzó READY y puede consultarse públicamente.':'El modelo quedó como DRAFT porque todavía tiene requisitos pendientes. No se publica como modelo READY.'}</p><div class="actions"><button id="bpCopyModelId" class="btn" type="button">Copiar Model ID</button></div>`;
      const copy=document.getElementById('bpCopyModelId');if(copy)copy.onclick=()=>navigator.clipboard.writeText(commit.model?.model_id||prep.modelId).then(()=>toast('Battery Model ID copiado'));
      document.getElementById('bpLookupId').value=commit.model?.model_id||prep.modelId;
    }catch(err){saveResult.innerHTML=`<span class="status bad">✕ NOT SAVED</span><p>${esc(err.message||String(err))}</p>`;toast(err.message||'No se pudo guardar el modelo')}
  };

  document.getElementById('bpLookupBtn').onclick=async()=>{
    const id=val('bpLookupId').toUpperCase(),out=document.getElementById('bpLookupResult');
    if(!id){toast('Ingresá un Battery Model ID');return}
    out.className='result';out.textContent='Consultando modelo público…';
    try{const data=await request('get_model',{modelId:id}),m=data.model,p=m.public_data?.fields||{};out.innerHTML=`<span class="status ok">✓ ACTIVE MODEL</span><div class="kv"><span>Model ID</span><b class="mono">${esc(m.model_id)}</b></div><div class="kv"><span>Model</span><b>${esc(m.model_name)}</b></div><div class="kv"><span>Identifier</span><span>${esc(m.unique_model_identifier)}</span></div><div class="kv"><span>Category</span><span>${esc(m.battery_category)}</span></div><div class="kv"><span>Energy</span><span>${esc(m.nominal_energy_kwh??'N/A')} kWh</span></div><div class="kv"><span>Chemistry</span><span>${esc(p.chemistry||'N/A')}</span></div><div class="kv"><span>Manufacturer</span><span>${esc(p.manufacturerIdentity||'N/A')}</span></div><div class="batteryDisclaimer" style="margin-top:12px">Esta respuesta contiene sólo el bloque PUBLIC. EVO no devuelve composición detallada, informes de autoridad ni datos individuales restringidos desde esta consulta.</div>`}catch(err){out.innerHTML=`<span class="status bad">✕ NOT PUBLIC</span><p>${esc(err.message||String(err))}</p>`}
  };

  console.info('EVO Battery Passport UI V0.1',{mode:'EU BATTERY PASSPORT READINESS + SIGNED MODEL DRAFTS',endpoint:BATTERY_URL,tokenMovement:false});
})();