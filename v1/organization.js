const ORGANIZATION_SUBMIT_URL=`${SUPABASE_URL}/functions/v1/submit-evo-organization`;

function normalizeRegistryReference(v=''){
  return String(v).normalize('NFKC').trim().toUpperCase().replace(/\s+/g,'');
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
  const html=`<div id="organizationEvidence" class="panel domainPanel"><span class="kicker">ORGANIZATION EVIDENCE · OPCIONAL</span><h3>Presentar evidencia de organización</h3><p>Para empresas, talleres, fabricantes u otras entidades. No requiere dominio. EVO guarda la declaración firmada y hashes; el documento opcional se procesa localmente y no se sube.</p><div class="domainProofGrid"><form id="organizationForm" class="form"><label>Nombre legal<input id="organizationLegalName" maxlength="180" placeholder="Ej. Power Service SPA"></label><label>País (ISO 2 letras)<input id="organizationCountry" maxlength="2" value="CL" placeholder="CL"></label><label>Tipo de registro<input id="organizationRegistryType" maxlength="80" placeholder="Ej. RUT / Registro Mercantil / Licencia"></label><label>Identificador registral<input id="organizationRegistryReference" maxlength="180" autocomplete="off" placeholder="Se convierte en hash local"></label><label class="full">Referencia pública oficial (opcional)<input id="organizationPublicReference" maxlength="500" placeholder="https://..."></label><label class="full file">Documento de evidencia opcional<input id="organizationEvidenceFile" type="file"><span>Sólo se calcula SHA-256 en tu navegador. El archivo no se sube a EVO.</span></label><div class="full passportNotice"><b>PENDING REVIEW</b> no significa verificado. Una firma sólo demuestra quién presentó la evidencia. El estado <b>ORGANIZATION VERIFIED</b> requiere una revisión independiente posterior.</div><div class="full actions"><button class="btn primary" type="submit">Firmar evidencia organizacional</button></div><div id="organizationSubmitResult" class="full empty">No presentaste evidencia en esta sesión.</div></form><div id="organizationPublicResult" class="domainRecord"><span class="status warn">SIN ORGANIZACIÓN VERIFICADA</span><p>La verificación organizacional es opcional y no depende de tener sitio web.</p></div></div></div>`;
  if(domain)domain.insertAdjacentHTML('beforebegin',html);else issuer.insertAdjacentHTML('beforeend',html);
  $('organizationForm').onsubmit=submitOrganizationEvidence;
}
async function submitOrganizationEvidence(e){
  e.preventDefault();const out=$('organizationSubmitResult');
  try{
    if(!account||!walletProvider)await connectWallet();
    const issuerWallet=account.toLowerCase();
    const legalName=$('organizationLegalName').value.trim();
    const countryCode=$('organizationCountry').value.trim().toUpperCase();
    const registryType=$('organizationRegistryType').value.trim();
    const registryRaw=normalizeRegistryReference($('organizationRegistryReference').value);
    const publicReferenceUrl=$('organizationPublicReference').value.trim();
    const evidenceFile=$('organizationEvidenceFile').files[0];
    if(legalName.length<2)throw new Error('Ingresá el nombre legal de la organización.');
    if(!/^[A-Z]{2}$/.test(countryCode))throw new Error('El país debe tener 2 letras, por ejemplo CL.');
    if(registryType.length<2)throw new Error('Indicá el tipo de registro.');
    if(registryRaw.length<2)throw new Error('Ingresá el identificador registral.');
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
console.info('EVO Organization Evidence V0',{domainRequired:false,documentUpload:false,submission:'SIGNED + PENDING REVIEW',verifiedStatus:'INDEPENDENT REVIEW ONLY',tokenMovement:false});
