const ISSUER_REGISTER_URL=`${SUPABASE_URL}/functions/v1/register-evo-issuer`;

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
  const style=document.createElement('style');style.id='issuerTrustStyle';style.textContent=`.issuerTrustGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.issuerLevel{padding:13px;border:1px solid #ffffff12;border-radius:14px;background:#ffffff05}.issuerLevel b{display:block;margin-bottom:5px}.issuerLevel p{margin:0;color:#aaa4bd}.issuerExplain{margin-top:14px;padding:14px;border:1px solid #f4ca7530;border-radius:14px;background:#f4ca7508;color:#d9d0bd}@media(max-width:850px){.issuerTrustGrid{grid-template-columns:1fr}}`;document.head.appendChild(style);
  seal.insertAdjacentHTML('beforebegin',`<section id="issuerTrust" class="wrap block"><h2>EVO Issuer Trust</h2><p class="sub">El nombre escrito en “Emisor” no demuestra identidad por sí solo. Issuer Trust separa una declaración libre de una identidad respaldada por pruebas verificables.</p><div class="issuerTrustGrid"><form id="issuerForm" class="panel form"><span class="kicker">ISSUER IDENTITY · V0</span><h3>Crear perfil firmado</h3><label>Nombre público<input id="issuerProfileName" maxlength="160" placeholder="Ej. Lionel Ricca / Empresa"></label><label>Slug EVO<input id="issuerProfileSlug" maxlength="63" placeholder="ej. lionel-ricca"></label><label class="full">Sitio web<input id="issuerProfileWebsite" maxlength="300" placeholder="https://... (opcional)"></label><div class="full passportNotice"><b>WALLET_PROVEN</b> significa que la wallet controla este perfil. No prueba todavía que la wallet represente legalmente una marca, empresa o dominio.</div><div class="full actions"><button id="issuerSignBtn" class="btn primary" type="submit">Firmar perfil de emisor</button></div><div id="issuerFormResult" class="full empty">Conectá MetaMask para crear o actualizar tu perfil.</div></form><div class="panel"><span class="kicker">PUBLIC TRUST STATE</span><h3>Emisor del Seal actual</h3><div id="issuerPublicResult" class="empty">Abrí un EVO Seal o consultá un perfil firmado.</div><div class="issuerExplain"><b>Niveles previstos</b><p>SELF-DECLARED → WALLET PROVEN → DOMAIN VERIFIED → ORGANIZATION VERIFIED. Cada nivel agrega una prueba diferente; no se saltan las etapas por marketing.</p></div></div></div></section>`);
  const first=document.querySelector('.links a[href="#seal"]');if(first&&!document.querySelector('.links a[href="#issuerTrust"]'))first.insertAdjacentHTML('beforebegin','<a href="#issuerTrust">Issuer</a>');
  $('issuerProfileName').addEventListener('input',()=>{if(!$('issuerProfileSlug').dataset.manual)$('issuerProfileSlug').value=issuerSlug($('issuerProfileName').value)});
  $('issuerProfileSlug').addEventListener('input',()=>{$('issuerProfileSlug').dataset.manual='1';$('issuerProfileSlug').value=issuerSlug($('issuerProfileSlug').value)});
  $('issuerForm').onsubmit=signIssuerProfile;
}
async function fetchIssuerProfile(wallet){
  const w=String(wallet||'').toLowerCase();if(!/^0x[0-9a-f]{40}$/.test(w))return null;
  const q=new URL(`${SUPABASE_URL}/rest/v1/evo_issuer_profiles`);q.searchParams.set('issuer_wallet',`eq.${w}`);q.searchParams.set('select','issuer_wallet,display_name,slug,website,status,created_at,updated_at,verified_at');
  const r=await fetch(q,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});if(!r.ok)throw new Error(`No se pudo consultar Issuer Trust (${r.status})`);const rows=await r.json();return rows[0]||null;
}
function renderIssuerProfile(profile,label='',wallet=''){
  if(!profile)return `<div>${issuerStatusMarkup('SELF_DECLARED')}<h3>${esc(label||'Emisor sin perfil')}</h3><p class="mono">${esc(wallet)}</p><p>El nombre fue declarado dentro del Seal, pero todavía no existe un perfil EVO firmado para esa wallet.</p></div>`;
  return `<div>${issuerStatusMarkup(profile.status)}<h3>${esc(profile.display_name)}</h3><div class="kv"><span>Wallet</span><span class="mono">${esc(profile.issuer_wallet)}</span></div><div class="kv"><span>EVO slug</span><b>${esc(profile.slug)}</b></div>${profile.website?`<div class="kv"><span>Website declarado</span><span>${esc(profile.website)}</span></div>`:''}<div class="kv"><span>Actualizado</span><span>${esc(profile.updated_at||'')}</span></div><p>${profile.status==='WALLET_PROVEN'?'La firma prueba control de la wallet y del perfil. La relación legal con una marca todavía no fue verificada.':'El nivel mostrado corresponde a las pruebas registradas por EVO.'}</p></div>`;
}
async function loadIssuerForSeal(sealId){
  const out=$('issuerPublicResult');if(!out)return;
  try{const s=await fetchSeal(sealId);if(!s)return;const p=await fetchIssuerProfile(s.issuer_wallet);out.className='result';out.innerHTML=renderIssuerProfile(p,s.issuer_label,s.issuer_wallet)}catch(e){out.className='result';out.innerHTML=`<span class="status bad">✕ ISSUER ERROR</span><p>${esc(e.message||String(e))}</p>`}
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
    $('issuerPublicResult').className='result';$('issuerPublicResult').innerHTML=renderIssuerProfile(data.profile);
    toast('Perfil EVO Issuer firmado');
  }catch(err){out.className='result';out.innerHTML=`<span class="status bad">✕ ISSUER NO REGISTRADO</span><p>${esc(err.message||String(err))}</p>`}
}

injectIssuerUi();
const issuerQuerySeal=new URLSearchParams(location.search).get('seal');if(issuerQuerySeal)setTimeout(()=>loadIssuerForSeal(issuerQuerySeal.toUpperCase()),700);
console.info('EVO Issuer Trust V0',{levels:['SELF_DECLARED','WALLET_PROVEN','DOMAIN_VERIFIED','ORGANIZATION_VERIFIED'],mode:'SIGNED PROFILE / NO LEGAL BRAND CLAIM / NO TOKEN MOVEMENT'});
