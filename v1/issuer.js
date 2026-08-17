const ISSUER_REGISTER_URL=`${SUPABASE_URL}/functions/v1/register-evo-issuer`;
const DOMAIN_VERIFY_URL=`${SUPABASE_URL}/functions/v1/evo-domain-verification`;
let activeDomainChallenge=null;

function issuerSlug(s=''){
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,63).replace(/-+$/,'');
}
function issuerStatusMarkup(status){
  const s=String(status||'SELF_DECLARED');
  const cls=s==='ORGANIZATION_VERIFIED'||s==='DOMAIN_VERIFIED'?'ok':s==='SUSPENDED'?'bad':'warn';
  const labels={SELF_DECLARED:'SELF-DECLARED',WALLET_PROVEN:'WALLET PROVEN',DOMAIN_VERIFIED:'DOMAIN VERIFIED',ORGANIZATION_VERIFIED:'ORGANIZATION VERIFIED',SUSPENDED:'SUSPENDED'};
  return `<span class="status ${cls}">${esc(labels[s]||s)}</span>`;
}
function injectIssuerUi(){
  const seal=$('seal');if(!seal||$('issuerTrust'))return;
  const style=document.createElement('style');style.id='issuerTrustStyle';style.textContent=`.issuerTrustGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.issuerLevel{padding:13px;border:1px solid #ffffff12;border-radius:14px;background:#ffffff05}.issuerLevel b{display:block;margin-bottom:5px}.issuerLevel p{margin:0;color:#aaa4bd}.issuerExplain{margin-top:14px;padding:14px;border:1px solid #f4ca7530;border-radius:14px;background:#f4ca7508;color:#d9d0bd}.issuerTrustInline{margin:14px 0;padding:14px;border:1px solid #f4ca7530;border-radius:14px;background:#f4ca7508}.issuerTrustInline .issuerTrustTitle{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}.issuerTrustInline p{margin:6px 0;color:#aaa4bd}.domainPanel{margin-top:16px}.domainProofGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.domainRecord{padding:14px;border:1px solid #ffffff12;border-radius:14px;background:#080715}.domainRecord code{word-break:break-all}.domainDns{padding:14px;border:1px dashed #24c5ff55;border-radius:14px;background:#24c5ff08}.domainDns .kv{align-items:flex-start}@media(max-width:850px){.issuerTrustGrid,.domainProofGrid{grid-template-columns:1fr}.issuerTrustInline .issuerTrustTitle{align-items:flex-start;flex-direction:column}}`;document.head.appendChild(style);
  seal.insertAdjacentHTML('beforebegin',`<section id="issuerTrust" class="wrap block"><h2>EVO Issuer Trust</h2><p class="sub">El nombre escrito en “Emisor” no demuestra identidad por sí solo. Issuer Trust agrega pruebas independientes alrededor de una identidad; ningún cliente necesita tener dominio web para usar EVO.</p><div class="issuerTrustGrid"><form id="issuerForm" class="panel form"><span class="kicker">ISSUER IDENTITY · V0</span><h3>Crear perfil firmado</h3><label>Nombre público<input id="issuerProfileName" maxlength="160" placeholder="Ej. Lionel Ricca / Empresa"></label><label>Slug EVO<input id="issuerProfileSlug" maxlength="63" placeholder="ej. lionel-ricca"></label><label class="full">Sitio web<input id="issuerProfileWebsite" maxlength="300" placeholder="https://... (opcional)"></label><div class="full passportNotice"><b>WALLET_PROVEN</b> significa que la wallet controla este perfil. El dominio es una prueba opcional; una empresa sin web podrá aportar otras evidencias de organización.</div><div class="full actions"><button id="issuerSignBtn" class="btn primary" type="submit">Firmar perfil de emisor</button></div><div id="issuerFormResult" class="full empty">Conectá MetaMask para crear o actualizar tu perfil.</div></form><div class="panel"><span class="kicker">PUBLIC TRUST STATE</span><h3>Emisor del Seal actual</h3><div id="issuerPublicResult" class="empty">Abrí un EVO Seal o consultá un perfil firmado.</div><div class="issuerExplain"><b>Modelo de evidencias</b><p>WALLET PROVEN es la base criptográfica. DOMAIN VERIFIED es opcional. ORGANIZATION VERIFIED podrá alcanzarse con evidencia empresarial independiente aunque el cliente no tenga dominio. Guardian mostrará qué pruebas existen, sin penalizar la ausencia de una prueba que no aplique.</p></div></div></div><div class="panel domainPanel"><span class="kicker">DOMAIN PROOF · DNS TXT · OPCIONAL</span><h3>Verificar control de dominio</h3><p>Esta prueba sólo aplica si el emisor controla un dominio. Publicar un código temporal en DNS demuestra control técnico del dominio. Si el cliente no tiene web, puede omitir esta sección sin bloquear otras verificaciones.</p><div class="domainProofGrid"><div class="form"><label>Dominio<input id="issuerDomain" placeholder="ej. empresa.cl"></label><div class="actions"><button id="domainIssueBtn" class="btn primary" type="button">1 · Firmar solicitud</button><button id="domainCheckBtn" class="btn gold" type="button" disabled>2 · Comprobar DNS</button></div><div id="domainChallengeResult" class="empty">Prueba opcional. Generá un desafío sólo si controlás un dominio.</div></div><div id="domainPublicResult" class="domainRecord"><span class="status">DOMINIO NO VINCULADO</span><p>Esto no reduce la confianza por sí solo. El dominio es una evidencia opcional.</p></div></div></div></section>`);
  const first=document.querySelector('.links a[href="#seal"]');if(first&&!document.querySelector('.links a[href="#issuerTrust"]'))first.insertAdjacentHTML('beforebegin','<a href="#issuerTrust">Issuer</a>');
  $('issuerProfileName').addEventListener('input',()=>{if(!$('issuerProfileSlug').dataset.manual)$('issuerProfileSlug').value=issuerSlug($('issuerProfileName').value)});
  $('issuerProfileSlug').addEventListener('input',()=>{$('issuerProfileSlug').dataset.manual='1';$('issuerProfileSlug').value=issuerSlug($('issuerProfileSlug').value)});
  $('issuerForm').onsubmit=signIssuerProfile;
  $('domainIssueBtn').onclick=issueDomainChallenge;
  $('domainCheckBtn').onclick=checkDomainChallenge;
}
async function fetchIssuerProfile(wallet){
  const w=String(wallet||'').toLowerCase();if(!/^0x[0-9a-f]{40}$/.test(w))return null;
  const q=new URL(`${SUPABASE_URL}/rest/v1/evo_issuer_profiles`);q.searchParams.set('issuer_wallet',`eq.${w}`);q.searchParams.set('select','issuer_wallet,display_name,slug,website,status,created_at,updated_at,verified_at');
  const r=await fetch(q,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});if(!r.ok)throw new Error(`No se pudo consultar Issuer Trust (${r.status})`);const rows=await r.json();return rows[0]||null;
}
async function fetchDomainVerification(wallet){
  const w=String(wallet||'').toLowerCase();if(!/^0x[0-9a-f]{40}$/.test(w))return null;
  const q=new URL(`${SUPABASE_URL}/rest/v1/evo_domain_verifications`);q.searchParams.set('issuer_wallet',`eq.${w}`);q.searchParams.set('status','eq.ACTIVE');q.searchParams.set('select','issuer_wallet,domain,method,verified_at,last_reverified_at,status');
  const r=await fetch(q,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});if(!r.ok)throw new Error(`No se pudo consultar Domain Trust (${r.status})`);const rows=await r.json();return rows[0]||null;
}
function renderIssuerProfile(profile,label='',wallet='',domainProof=null){
  if(!profile)return `<div>${issuerStatusMarkup('SELF_DECLARED')}<h3>${esc(label||'Emisor sin perfil')}</h3><p class="mono">${esc(wallet)}</p><p>El nombre fue declarado dentro del Seal, pero todavía no existe un perfil EVO firmado para esa wallet.</p></div>`;
  const domainLine=domainProof?`<div class="kv"><span>Dominio verificado</span><b>${esc(domainProof.domain)}</b></div>`:'';
  return `<div>${issuerStatusMarkup(profile.status)}<h3>${esc(profile.display_name)}</h3><div class="kv"><span>Wallet</span><span class="mono">${esc(profile.issuer_wallet)}</span></div><div class="kv"><span>EVO slug</span><b>${esc(profile.slug)}</b></div>${profile.website?`<div class="kv"><span>Website declarado</span><span>${esc(profile.website)}</span></div>`:''}${domainLine}<div class="kv"><span>Actualizado</span><span>${esc(profile.updated_at||'')}</span></div><p>${profile.status==='WALLET_PROVEN'?'La firma prueba control de la wallet y del perfil. El dominio es opcional y no es requisito para futuras pruebas de organización.':profile.status==='DOMAIN_VERIFIED'?'La wallet y el dominio indicado superaron pruebas independientes: firma de wallet + DNS TXT. Esto prueba control técnico del dominio, no por sí solo identidad legal de la organización.':'El nivel mostrado corresponde a las pruebas registradas por EVO.'}</p></div>`;
}
function renderDomainPublic(domainProof){
  const out=$('domainPublicResult');if(!out)return;
  if(!domainProof){out.innerHTML='<span class="status">DOMINIO NO VINCULADO</span><p>Prueba opcional. No tener dominio no impide usar EVO ni completar otras verificaciones.</p>';return}
  out.innerHTML=`<span class="status ok">DOMAIN VERIFIED</span><h3>${esc(domainProof.domain)}</h3><div class="kv"><span>Método</span><b>${esc(domainProof.method)}</b></div><div class="kv"><span>Verificado</span><span>${esc(domainProof.verified_at||'')}</span></div><p>La prueba demuestra control técnico del DNS de este dominio en el momento de la verificación.</p>`;
}
async function loadIssuerForSeal(sealId){
  const out=$('issuerPublicResult');if(!out)return;
  try{const s=await fetchSeal(sealId);if(!s)return;const [p,d]=await Promise.all([fetchIssuerProfile(s.issuer_wallet),fetchDomainVerification(s.issuer_wallet)]);out.className='result';out.innerHTML=renderIssuerProfile(p,s.issuer_label,s.issuer_wallet,d);renderDomainPublic(d)}catch(e){out.className='result';out.innerHTML=`<span class="status bad">✕ ISSUER ERROR</span><p>${esc(e.message||String(e))}</p>`}
}
async function signIssuerProfile(e){
  e.preventDefault();const out=$('issuerFormResult');
  try{
    if(!account||!walletProvider)await connectWallet();
    const displayName=$('issuerProfileName').value.trim(),slug=issuerSlug($('issuerProfileSlug').value||displayName),website=$('issuerProfileWebsite').value.trim();
    if(!displayName)throw new Error('Ingresá el nombre público del emisor.');if(!slug)throw new Error('El slug no es válido.');
    if(website){const u=new URL(website);if(!['http:','https:'].includes(u.protocol))throw new Error('El sitio web debe usar http o https.');}
    const issuerWallet=account.toLowerCase(),createdAt=new Date().toISOString(),nonce=rand();
    const canonicalProfile={createdAt,displayName,issuerWallet,nonce,slug,website};
    const profileHash=await shaText(canonical(canonicalProfile));
    const signatureMessage=`EVO ISSUER TRUST V0\nWallet: ${issuerWallet}\nName: ${displayName}\nSlug: ${slug}\nWebsite: ${website||'N/A'}\nProfile hash: ${profileHash}\nSigned: ${createdAt}`;
    toast('Confirmá la firma del perfil. No es una transacción.');
    const signature=await walletProvider.request({method:'personal_sign',params:[signatureMessage,account]});
    const profile={...canonicalProfile,profileHash,signature,signatureMessage};
    const r=await fetch(ISSUER_REGISTER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile})});let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data.error||`Issuer error (${r.status})`);
    out.className='result';out.innerHTML=`${issuerStatusMarkup(data.profile.status)}<h3>${esc(data.profile.display_name)}</h3><p>Perfil firmado y publicado.</p><p><b>Importante:</b> WALLET_PROVEN prueba control de esta wallet/perfil, no representación legal de una marca.</p>`;
    const d=await fetchDomainVerification(data.profile.issuer_wallet);
    $('issuerPublicResult').className='result';$('issuerPublicResult').innerHTML=renderIssuerProfile(data.profile,'',data.profile.issuer_wallet,d);renderDomainPublic(d);
    const sid=new URLSearchParams(location.search).get('seal');if(sid)setTimeout(()=>showIssuerTrustInVerification(sid.toUpperCase()),100);
    toast('Perfil EVO Issuer firmado');
  }catch(err){out.className='result';out.innerHTML=`<span class="status bad">✕ ISSUER NO REGISTRADO</span><p>${esc(err.message||String(err))}</p>`}
}

function normalizeDomainInput(v=''){return String(v).trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'').replace(/\.$/,'')}
async function domainCall(action,payload){
  const r=await fetch(DOMAIN_VERIFY_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload})});let data={};try{data=await r.json()}catch{}
  if(!r.ok){const e=new Error(data.error||`Domain verify error (${r.status})`);e.code=data.error;throw e}return data;
}
async function issueDomainChallenge(){
  const out=$('domainChallengeResult');
  try{
    if(!account||!walletProvider)await connectWallet();
    const issuerWallet=account.toLowerCase(),domain=normalizeDomainInput($('issuerDomain').value);
    if(!domain||!domain.includes('.'))throw new Error('Ingresá un dominio válido, por ejemplo empresa.cl.');
    const clientNonce=rand(),signedAt=new Date().toISOString();
    const message=`EVO DOMAIN VERIFY V0\nWallet: ${issuerWallet}\nDomain: ${domain}\nNonce: ${clientNonce}\nSigned: ${signedAt}`;
    toast('Confirmá la solicitud de dominio en MetaMask. No es una transacción.');
    const signature=await walletProvider.request({method:'personal_sign',params:[message,account]});
    const data=await domainCall('issue',{issuerWallet,domain,clientNonce,signedAt,signature});
    activeDomainChallenge=data.challenge;$('domainCheckBtn').disabled=false;
    out.className='result domainDns';out.innerHTML=`<span class="status warn">DNS PENDING</span><div class="kv"><span>Challenge ID</span><b class="mono">${esc(data.challenge.challengeId)}</b></div><div class="kv"><span>Tipo</span><b>TXT</b></div><div class="kv"><span>Nombre DNS</span><code>${esc(data.challenge.dnsName)}</code></div><div class="kv"><span>Valor TXT</span><code>${esc(data.challenge.txtValue)}</code></div><div class="kv"><span>Vence</span><span>${esc(data.challenge.expiresAt)}</span></div><div class="actions"><button id="copyDnsName" class="btn" type="button">Copiar nombre</button><button id="copyDnsValue" class="btn" type="button">Copiar valor</button></div><p>Publicá exactamente ese TXT en el DNS. Cuando se propague, tocá “Comprobar DNS”.</p>`;
    $('copyDnsName').onclick=()=>navigator.clipboard.writeText(data.challenge.dnsName).then(()=>toast('Nombre DNS copiado'));
    $('copyDnsValue').onclick=()=>navigator.clipboard.writeText(data.challenge.txtValue).then(()=>toast('Valor TXT copiado'));
    toast('Desafío DNS creado');
  }catch(e){out.className='result';out.innerHTML=`<span class="status bad">✕ DOMAIN CHALLENGE ERROR</span><p>${esc(e.message||String(e))}</p>`}
}
async function checkDomainChallenge(){
  const out=$('domainChallengeResult');if(!activeDomainChallenge){toast('Primero generá un desafío DNS');return}
  out.className='result';out.innerHTML='<span class="status warn">COMPROBANDO DNS…</span><p>Consultando el registro TXT público.</p>';
  try{
    const data=await domainCall('check',{challengeId:activeDomainChallenge.challengeId});
    if(!data.verified){out.innerHTML=`<span class="status warn">DNS TODAVÍA NO VISIBLE</span><p>No encontramos todavía el TXT esperado en ${esc(data.dnsName||activeDomainChallenge.dnsName)}. La propagación DNS puede tardar; no hace falta firmar otra vez.</p>`;return}
    out.innerHTML=`<span class="status ok">✓ DOMAIN VERIFIED</span><h3>${esc(data.domain)}</h3><p>El servidor encontró el TXT correcto y vinculó este dominio con la wallet firmante.</p>`;
    $('domainCheckBtn').disabled=true;
    const p=await fetchIssuerProfile(account),d=await fetchDomainVerification(account);renderDomainPublic(d);if($('issuerPublicResult'))$('issuerPublicResult').innerHTML=renderIssuerProfile(p,'',account,d);
    const sid=new URLSearchParams(location.search).get('seal');if(sid)setTimeout(()=>showIssuerTrustInVerification(sid.toUpperCase()),100);
    toast('Dominio verificado por DNS');
  }catch(e){out.innerHTML=`<span class="status bad">✕ DOMAIN CHECK ERROR</span><p>${esc(e.message||String(e))}</p>`}
}

async function showIssuerTrustInVerification(sealId){
  const out=$('verifyResult');if(!out||!sealId)return;
  try{
    const s=await fetchSeal(String(sealId).trim().toUpperCase());if(!s)return;
    const [p,d]=await Promise.all([fetchIssuerProfile(s.issuer_wallet),fetchDomainVerification(s.issuer_wallet)]);
    out.querySelector('.issuerTrustInline')?.remove();
    const status=p?.status||'SELF_DECLARED';
    const name=p?.display_name||s.issuer_label||s.issuer_wallet;
    const meaning=status==='WALLET_PROVEN'?'La wallet firmante controla este perfil EVO. El dominio es opcional y no es requisito para otras verificaciones.':status==='DOMAIN_VERIFIED'?`La wallet además demostró control DNS de ${d?.domain||'un dominio registrado'}. Esto prueba control técnico del dominio, no identidad legal por sí sola.`:status==='ORGANIZATION_VERIFIED'?'La organización completó el proceso de verificación definido por EVO.':status==='SUSPENDED'?'El perfil del emisor está suspendido y no debe tratarse como confiable.':'El nombre del emisor es una declaración del creador del Seal y todavía no posee un perfil firmado.';
    const block=document.createElement('div');block.className='issuerTrustInline';
    block.innerHTML=`<div class="issuerTrustTitle"><b>Issuer Trust · ${esc(name)}</b>${issuerStatusMarkup(status)}</div><p>${esc(meaning)}</p>${d?`<p><b>Dominio:</b> ${esc(d.domain)} · ${esc(d.method)}</p>`:''}${p?.slug?`<span class="mono">evo:${esc(p.slug)}</span>`:''}`;
    const qr=out.querySelector('.qrCard');if(qr)out.insertBefore(block,qr);else out.appendChild(block);
  }catch(e){console.warn('Issuer Trust inline unavailable',e)}
}

injectIssuerUi();
const issuerQuerySeal=new URLSearchParams(location.search).get('seal');if(issuerQuerySeal){setTimeout(()=>loadIssuerForSeal(issuerQuerySeal.toUpperCase()),700);setTimeout(()=>showIssuerTrustInVerification(issuerQuerySeal.toUpperCase()),1200)}
const issuerVerifyBtn=$('verifyBtn');if(issuerVerifyBtn)issuerVerifyBtn.addEventListener('click',()=>setTimeout(()=>{const id=$('verifyId')?.value.trim().toUpperCase();if(id)showIssuerTrustInVerification(id)},700));
console.info('EVO Issuer Trust V0.2',{evidence:['WALLET_PROVEN','DOMAIN_VERIFIED_OPTIONAL','ORGANIZATION_VERIFIED_INDEPENDENT'],domainMethod:'DNS_TXT',mode:'EVIDENCE MODEL / NO DOMAIN REQUIREMENT / NO TOKEN MOVEMENT'});
