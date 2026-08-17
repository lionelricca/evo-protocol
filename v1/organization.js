const ORGANIZATION_SUBMIT_URL=`${SUPABASE_URL}/functions/v1/submit-evo-organization`;

const REGISTRY_HINTS={
  CL:'RUT',AR:'CUIT',BR:'CNPJ',MX:'RFC',CO:'NIT',PE:'RUC',UY:'RUT',PY:'RUC',EC:'RUC',
  ES:'NIF/CIF',IT:'VAT / Registro Imprese',FR:'SIREN/SIRET',DE:'Handelsregister / VAT',GB:'Companies House',
  US:'State/Federal business ID',CA:'Business Number',AU:'ABN/ACN',NZ:'NZBN',IN:'CIN/GSTIN',JP:'Corporate Number',
  KR:'Business Registration Number',CN:'Unified Social Credit Code',SG:'UEN',AE:'Trade License'
};
function normalizeRegistryReference(v=''){
  // IDs oficiales se comparan sin formato visual: puntos, guiones, espacios y separadores no cambian la identidad.
  // Conservamos letras y números para soportar registros alfanuméricos de distintos países.
  return String(v).normalize('NFKC').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
}
function suggestedRegistryType(country=''){
  return REGISTRY_HINTS[String(country||'').trim().toUpperCase()]||'Registro oficial / Business registry';
}
function applyRegistrySuggestion(force=false){
  const country=$('organizationCountry'),type=$('organizationRegistryType');if(!country||!type)return;
  const hint=suggestedRegistryType(country.value);
  if(force||!type.dataset.manual||!type.value.trim())type.value=hint;
  const ref=$('organizationRegistryReference');if(ref)ref.placeholder=`ID oficial (${hint}) · podés escribirlo con o sin puntos/guiones`;
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
  const html=`<div id="organizationEvidence" class="panel domainPanel"><span class="kicker">ORGANIZATION EVIDENCE · GLOBAL · OPCIONAL</span><h3>Presentar evidencia de organización</h3><p>Para empresas, talleres, fabricantes u otras entidades de cualquier país. No requiere dominio. EVO guarda la declaración firmada y hashes; el documento opcional se procesa localmente y no se sube.</p><div class="domainProofGrid"><form id="organizationForm" class="form"><label>Nombre legal<input id="organizationLegalName" maxlength="180" placeholder="Ej. Empresa / Taller / Fabricante"></label><label>País (ISO 2 letras)<input id="organizationCountry" maxlength="2" value="CL" placeholder="CL / AR / US / ES..."></label><label>Tipo de registro<input id="organizationRegistryType" maxlength="80" placeholder="EVO lo sugiere según el país"></label><label>Identificador oficial<input id="organizationRegistryReference" maxlength="180" autocomplete="off" placeholder="Podés escribirlo con o sin puntos/guiones"></label><div class="full passportNotice">EVO normaliza automáticamente mayúsculas, espacios, puntos, guiones y otros separadores. El formato visual no cambia la identidad del registro. El identificador real no se publica: se transforma en hash localmente.</div><label class="full">Referencia pública oficial (opcional)<input id="organizationPublicReference" maxlength="500" placeholder="https://..."></label><label class="full file">Documento de evidencia opcional<input id="organizationEvidenceFile" type="file"><span>Sólo se calcula SHA-256 en tu navegador. El archivo no se sube a EVO.</span></label><div class="full passportNotice"><b>PENDING REVIEW</b> no significa verificado. Una firma sólo demuestra quién presentó la evidencia. El estado <b>ORGANIZATION VERIFIED</b> requiere una revisión independiente posterior.</div><div class="full actions"><button class="btn primary" type="submit">Firmar evidencia organizacional</button></div><div id="organizationSubmitResult" class="full empty">No presentaste evidencia en esta sesión.</div></form><div id="organizationPublicResult" class="domainRecord"><span class="status warn">SIN ORGANIZACIÓN VERIFICADA</span><p>La verificación organizacional es opcional, global y no depende de tener sitio web.</p></div></div></div>`;
  if(domain)domain.insertAdjacentHTML('beforebegin',html);else issuer.insertAdjacentHTML('beforeend',html);
  $('organizationForm').onsubmit=submitOrganizationEvidence;
  $('organizationCountry').addEventListener('input',()=>{if($('organizationCountry').value.trim().length===2)applyRegistrySuggestion(false)});
  $('organizationCountry').addEventListener('change',()=>applyRegistrySuggestion(false));
  $('organizationRegistryType').addEventListener('input',()=>{$('organizationRegistryType').dataset.manual='1'});
  applyRegistrySuggestion(true);
}
async function submitOrganizationEvidence(e){
  e.preventDefault();const out=$('organizationSubmitResult');
  try{
    if(!account||!walletProvider)await connectWallet();
    const issuerWallet=account.toLowerCase();
    const legalName=$('organizationLegalName').value.trim();
    const countryCode=$('organizationCountry').value.trim().toUpperCase();
    let registryType=$('organizationRegistryType').value.trim();
    if(!registryType)registryType=suggestedRegistryType(countryCode);
    const registryRaw=normalizeRegistryReference($('organizationRegistryReference').value);
    const publicReferenceUrl=$('organizationPublicReference').value.trim();
    const evidenceFile=$('organizationEvidenceFile').files[0];
    if(legalName.length<2)throw new Error('Ingresá el nombre legal de la organización.');
    if(!/^[A-Z]{2}$/.test(countryCode))throw new Error('El país debe tener 2 letras, por ejemplo CL, AR, US o ES.');
    if(registryType.length<2)throw new Error('Indicá el tipo de registro.');
    if(registryRaw.length<2)throw new Error('Ingresá el identificador oficial de la organización.');
    if(publicReferenceUrl){const u=new URL(publicReferenceUrl);if(u.protocol!=='https:')throw new Error('La referencia pública debe usar https.');}
    const nonce=rand(),createdAt=new Date().toISOString();
    const registryReferenceHash=await shaText(`EVO-REGISTRY-REF-V0|${nonce}|${countryCode}|${registryType.toUpperCase()}|${registryRaw}`);
    const evidenceHash=evidenceFile?await shaFile(evidenceFile):'';
    const canonicalSubmission={createdAt,countryCode,evidenceHash,issuerWallet,legalName,nonce,publicReferenceUrl,registryReferenceHash,registryType};
    const payloadHash=await shaText(canonical(canonicalSubmission));
    const submissionId=`EOG-${payloadHash.slice(0,8).toUpperCase()}-${payloadHash.slice(8,16).toUpperCase()}-${payloadHash.slice(16,24).toUpperCase()}`;
    const signatureMessage=`EVO ORGANIZATION EVIDENCE V0\nSubmission ID: ${submissionId}\nWallet: ${issuerWallet}\nLegal name: ${legalName}\nCountry: ${countryCode}\nRegistry type: ${registryType}\nRegistry reference hash: ${registryReferenceHash}\nEvidence hash: ${evidenceHash||'N/A'}\nPublic reference: ${publicReferenceUrl||'N/A'}\nPayload hash: ${payloadHash}\nCreated: ${createdAt}`;
    toast('Confirmá la evidencia organizacional en MetaMask. No es una transacción.');
    const signature=await walletProvider.request({method:'personal_sign',params:[signatureMessage,account]});
    const submission={...canonicalSubmission,payloadHash,submissionId,signature,signatureMessage};
    const r=await fetch(ORGANIZATION_SUBMIT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submission})});let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data.error||`Organization evidence error (${r.status})`);
    out.className='result';out.innerHTML=`<span class="status warn">PENDING REVIEW</span><div class="kv"><span>Submission ID</span><b class="mono">${esc(data.submission.submissionId)}</b></div><div class="kv"><span>Organización</span><b>${esc(data.submission.legalName)}</b></div><div class="kv"><span>País</span><span>${esc(data.submission.countryCode)}</span></div><div class="kv"><span>Registro</span><span>${esc(data.submission.registryType)}</span></div><p>La evidencia fue firmada y recibida. Todavía <b>no</b> es ORGANIZATION VERIFIED.</p><p>${evidenceHash?'El documento permaneció local; EVO recibió únicamente su SHA-256.':'No se adjuntó documento.'}</p>`;
    $('organizationRegistryReference').value='';$('organizationEvidenceFile').value='';
    toast('Evidencia organizacional enviada a revisión');
  }catch(err){out.className='result';out.innerHTML=`<span class="status bad">✕ EVIDENCIA NO ENVIADA</span><p>${esc(err.message||String(err))}</p>`}
}
async function loadOrganizationForSeal(sealId){
  try{const s=await fetchSeal(sealId);if(!s)return;renderOrganizationPublic(await fetchOrganizationVerification(s.issuer_wallet))}catch(e){console.warn('Organization Trust unavailable',e)}
}

injectOrganizationUi();
const organizationQuerySeal=new URLSearchParams(location.search).get('seal');if(organizationQuerySeal)setTimeout(()=>loadOrganizationForSeal(organizationQuerySeal.toUpperCase()),900);
console.info('EVO Organization Evidence V0.1',{scope:'GLOBAL',domainRequired:false,documentUpload:false,registryFormatting:'TOLERANT / ALPHANUMERIC NORMALIZATION',submission:'SIGNED + PENDING REVIEW',verifiedStatus:'INDEPENDENT REVIEW ONLY',tokenMovement:false});
