const ORGANIZATION_SUBMIT_URL=`${SUPABASE_URL}/functions/v1/submit-evo-organization`;

const REGISTRY_HINTS={
  CL:'RUT',AR:'CUIT',BR:'CNPJ',MX:'RFC',CO:'NIT',PE:'RUC',UY:'RUT',PY:'RUC',EC:'RUC',
  ES:'NIF/CIF',IT:'VAT / Registro Imprese',FR:'SIREN/SIRET',DE:'Handelsregister / VAT',GB:'Companies House',
  US:'State/Federal business ID',CA:'Business Number',AU:'ABN/ACN',NZ:'NZBN',IN:'CIN/GSTIN',JP:'Corporate Number',
  KR:'Business Registration Number',CN:'Unified Social Credit Code',SG:'UEN',AE:'Trade License'
};
function normalizeRegistryReference(v=''){
  return String(v).normalize('NFKC').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
}
function suggestedRegistryType(country=''){
  return REGISTRY_HINTS[String(country||'').trim().toUpperCase()]||'Registro oficial / Business registry';
}
function browserCountryHint(){
  try{const r=new Intl.Locale(navigator.language||'').region||'';return /^[A-Z]{2}$/i.test(r)?r.toUpperCase():''}catch{return ''}
}
function applyRegistrySuggestion(force=false){
  const country=$('organizationCountry'),type=$('organizationRegistryType');if(!country||!type)return;
  const hint=suggestedRegistryType(country.value);
  if(force||!type.dataset.manual||!type.value.trim())type.value=hint;
  const ref=$('organizationRegistryReference');if(ref)ref.placeholder=`ID oficial (${hint}) · con o sin puntos/guiones`;
}
async function autofillOrganizationFromWallet(){
  const country=$('organizationCountry');
  if(country&&!country.value.trim()){const hint=browserCountryHint();if(hint)country.value=hint}
  applyRegistrySuggestion(false);
  if(!account)return;
  try{
    const p=typeof fetchIssuerProfile==='function'?await fetchIssuerProfile(account):null;
    const source=$('organizationAutofillState');
    if(source)source.innerHTML=`<span class="status ok">WALLET PROFILE LOADED</span><p>Solicitante: <span class="mono">${esc(account)}</span>${p?.display_name?` · Perfil firmado: <b>${esc(p.display_name)}</b>`:''}. EVO usa este perfil para saber quién presenta la evidencia, <b>no</b> como nombre legal automático de la organización.</p>`;
  }catch(e){console.warn('Organization autofill unavailable',e)}
}
async function fetchOrganizationVerification(wallet){
  const w=String(wallet||'').toLowerCase();
  if(!/^0x[0-9a-f]{40}$/.test(w))return null;
  const q=new URL(`${SUPABASE_URL}/rest/v1/evo_organization_verifications`);
  q.searchParams.set('issuer_wallet',`eq.${w}`);
  q.searchParams.set('status','eq.ACTIVE');
  q.searchParams.set('select','issuer_wallet,legal_name,country_code,verification_method,verified_at,last_reviewed_at,status,policy_version,public_note');
  const r=await fetch(q,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
  if(!r.ok)throw new Error(`No se pudo consultar Organization Trust (${r.status})`);
  const rows=await r.json();return rows[0]||null;
}
function renderOrganizationPublic(v){
  const out=$('organizationPublicResult');if(!out)return;
  if(!v){out.innerHTML='<span class="status warn">SIN ORGANIZACIÓN VERIFICADA</span><p>No existe una verificación organizacional activa para esta wallet. Esto no impide usar EVO como persona, técnico o emisor WALLET PROVEN.</p>';return}
  out.innerHTML=`<span class="status ok">ORGANIZATION VERIFIED</span><h3>${esc(v.legal_name)}</h3><div class="kv"><span>País</span><b>${esc(v.country_code)}</b></div><div class="kv"><span>Método</span><b>${esc(v.verification_method)}</b></div><div class="kv"><span>Verificado</span><span>${esc(v.verified_at||'')}</span></div><div class="kv"><span>Política</span><span>${esc(v.policy_version||'')}</span></div>${v.public_note?`<p>${esc(v.public_note)}</p>`:''}<p>Este estado requiere revisión independiente. No puede ser asignado por el navegador ni por una firma de wallet por sí sola.</p>`;
}
function injectOrganizationUi(){
  const issuer=$('issuerTrust');if(!issuer||$('organizationEvidence'))return;
  const domain=issuer.querySelector('.domainPanel');
  const html=`<div id="organizationEvidence" class="panel domainPanel"><span class="kicker">ORGANIZATION EVIDENCE · GLOBAL · SIMPLE</span><h3>Verificar una organización</h3><p>La wallet identifica al solicitante. Para iniciar la verificación sólo necesitás país e identificador oficial. EVO resuelve o revisa el resto sin inventar datos.</p><div class="domainProofGrid"><form id="organizationForm" class="form"><label>País<input id="organizationCountry" maxlength="2" placeholder="CL / AR / US / ES..."></label><label>Identificador oficial<input id="organizationRegistryReference" maxlength="180" autocomplete="off" placeholder="RUT / CUIT / CNPJ / RFC / VAT..."></label><div id="organizationAutofillState" class="full passportNotice">Conectá la wallet y EVO traerá automáticamente el perfil firmado y sugerirá el tipo de registro.</div><details class="full"><summary>Opciones avanzadas / datos opcionales</summary><div class="form" style="margin-top:12px"><label>Nombre legal de la organización (opcional)<input id="organizationLegalName" maxlength="180" placeholder="Puede quedar pendiente hasta la revisión"></label><label>Tipo de registro<input id="organizationRegistryType" maxlength="80" placeholder="EVO lo sugiere según el país"></label><label class="full">Referencia pública oficial (opcional)<input id="organizationPublicReference" maxlength="500" placeholder="https://..."></label><label class="full file">Documento de evidencia opcional<input id="organizationEvidenceFile" type="file"><span>Sólo se calcula SHA-256 en tu navegador. El archivo no se sube a EVO.</span></label></div></details><div class="full passportNotice">EVO ignora puntos, guiones, espacios y mayúsculas del identificador. El identificador real no se publica: se transforma en hash localmente. Si no se conoce el nombre legal, queda <b>PENDIENTE DE RESOLVER</b>. <b>PENDING REVIEW</b> no significa verificado.</div><div class="full actions"><button class="btn primary" type="submit">Verificar con mi wallet</button></div><div id="organizationSubmitResult" class="full empty">Todavía no enviaste evidencia.</div></form><div id="organizationPublicResult" class="domainRecord"><span class="status warn">SIN ORGANIZACIÓN VERIFICADA</span><p>La verificación organizacional es opcional, global y no depende de tener sitio web.</p></div></div></div>`;
  if(domain)domain.insertAdjacentHTML('beforebegin',html);else issuer.insertAdjacentHTML('beforeend',html);
  $('organizationForm').onsubmit=submitOrganizationEvidence;
  $('organizationCountry').addEventListener('input',()=>{if($('organizationCountry').value.trim().length===2)applyRegistrySuggestion(false)});
  $('organizationCountry').addEventListener('change',()=>applyRegistrySuggestion(false));
  $('organizationRegistryType').addEventListener('input',()=>{$('organizationRegistryType').dataset.manual='1'});
  const hint=browserCountryHint();if(hint)$('organizationCountry').value=hint;applyRegistrySuggestion(true);
  if(account)setTimeout(autofillOrganizationFromWallet,100);
}
async function submitOrganizationEvidence(e){
  e.preventDefault();const out=$('organizationSubmitResult');
  try{
    if(!account||!walletProvider)await connectWallet();
    await autofillOrganizationFromWallet();
    const issuerWallet=account.toLowerCase();
    const legalName=$('organizationLegalName').value.trim();
    const countryCode=$('organizationCountry').value.trim().toUpperCase();
    let registryType=$('organizationRegistryType').value.trim();
    if(!registryType)registryType=suggestedRegistryType(countryCode);
    const registryRaw=normalizeRegistryReference($('organizationRegistryReference').value);
    const publicReferenceUrl=$('organizationPublicReference').value.trim();
    const evidenceFile=$('organizationEvidenceFile').files[0];
    if(!/^[A-Z]{2}$/.test(countryCode))throw new Error('Ingresá el país con 2 letras, por ejemplo CL, AR, US o ES.');
    if(registryRaw.length<2)throw new Error('Ingresá el identificador oficial de la organización.');
    if(publicReferenceUrl){const u=new URL(publicReferenceUrl);if(u.protocol!=='https:')throw new Error('La referencia pública debe usar https.');}
    const nonce=rand(),createdAt=new Date().toISOString();
    const registryReferenceHash=await shaText(`EVO-REGISTRY-REF-V0|${nonce}|${countryCode}|${registryType.toUpperCase()}|${registryRaw}`);
    const evidenceHash=evidenceFile?await shaFile(evidenceFile):'';
    const canonicalSubmission={createdAt,countryCode,evidenceHash,issuerWallet,legalName,nonce,publicReferenceUrl,registryReferenceHash,registryType};
    const payloadHash=await shaText(canonical(canonicalSubmission));
    const submissionId=`EOG-${payloadHash.slice(0,8).toUpperCase()}-${payloadHash.slice(8,16).toUpperCase()}-${payloadHash.slice(16,24).toUpperCase()}`;
    const signedLegalName=legalName||'UNRESOLVED';
    const signatureMessage=`EVO ORGANIZATION EVIDENCE V0\nSubmission ID: ${submissionId}\nWallet: ${issuerWallet}\nLegal name: ${signedLegalName}\nCountry: ${countryCode}\nRegistry type: ${registryType}\nRegistry reference hash: ${registryReferenceHash}\nEvidence hash: ${evidenceHash||'N/A'}\nPublic reference: ${publicReferenceUrl||'N/A'}\nPayload hash: ${payloadHash}\nCreated: ${createdAt}`;
    toast('Confirmá la evidencia organizacional en MetaMask. No es una transacción.');
    const signature=await walletProvider.request({method:'personal_sign',params:[signatureMessage,account]});
    const submission={...canonicalSubmission,payloadHash,submissionId,signature,signatureMessage};
    const r=await fetch(ORGANIZATION_SUBMIT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submission})});let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data.error||`Organization evidence error (${r.status})`);
    const resolvedName=data.submission.legalName||'Pendiente de resolver';
    out.className='result';out.innerHTML=`<span class="status warn">PENDING REVIEW</span><div class="kv"><span>Submission ID</span><b class="mono">${esc(data.submission.submissionId)}</b></div><div class="kv"><span>Nombre legal</span><b>${esc(resolvedName)}</b></div><div class="kv"><span>País</span><span>${esc(data.submission.countryCode)}</span></div><div class="kv"><span>Registro</span><span>${esc(data.submission.registryType)}</span></div><p>La evidencia fue firmada y recibida. Todavía <b>no</b> es ORGANIZATION VERIFIED.</p><p>${evidenceHash?'El documento permaneció local; EVO recibió únicamente su SHA-256.':'No se adjuntó documento.'}</p>`;
    $('organizationRegistryReference').value='';$('organizationEvidenceFile').value='';
    toast('Evidencia organizacional enviada a revisión');
  }catch(err){out.className='result';out.innerHTML=`<span class="status bad">✕ EVIDENCIA NO ENVIADA</span><p>${esc(err.message||String(err))}</p>`}
}
async function loadOrganizationForSeal(sealId){
  try{const s=await fetchSeal(sealId);if(!s)return;renderOrganizationPublic(await fetchOrganizationVerification(s.issuer_wallet))}catch(e){console.warn('Organization Trust unavailable',e)}
}

injectOrganizationUi();
const organizationQuerySeal=new URLSearchParams(location.search).get('seal');if(organizationQuerySeal)setTimeout(()=>loadOrganizationForSeal(organizationQuerySeal.toUpperCase()),900);
console.info('EVO Organization Evidence V0.3',{scope:'GLOBAL',visibleRequiredFields:['country','officialIdentifier'],walletRole:'SUBMITTER IDENTITY ONLY',legalName:'OPTIONAL / RESOLVED DURING REVIEW',domainRequired:false,documentUpload:false,registryFormatting:'TOLERANT',submission:'SIGNED + PENDING REVIEW',verifiedStatus:'INDEPENDENT REVIEW ONLY',tokenMovement:false});
