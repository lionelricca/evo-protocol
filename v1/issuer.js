const WALLET_ACCOUNT_URL=`${SUPABASE_URL}/functions/v1/register-evo-wallet`;
const DOMAIN_VERIFY_URL=`${SUPABASE_URL}/functions/v1/evo-domain-verification`;
let activeDomainChallenge=null;

function issuerStatusMarkup(status){
  const s=String(status||'SELF_DECLARED');
  const cls=['WALLET_PROVEN','DOMAIN_VERIFIED','ORGANIZATION_VERIFIED'].includes(s)?'ok':s==='SUSPENDED'?'bad':'warn';
  const labels={CONNECTED:'CONNECTED',SELF_DECLARED:'SELF-DECLARED',WALLET_PROVEN:'WALLET PROVEN',DOMAIN_VERIFIED:'DOMAIN VERIFIED',ORGANIZATION_VERIFIED:'ORGANIZATION VERIFIED',SUSPENDED:'SUSPENDED'};
  return `<span class="status ${cls}">${esc(labels[s]||s)}</span>`;
}

function renderAutoIssuerAccount(a){
  const out=$('issuerAutoAccount');if(!out)return;
  if(!a){out.className='empty';out.innerHTML='Conectá una wallet y EVO creará su registro básico automáticamente.';return}
  out.className='result';
  out.innerHTML=`${issuerStatusMarkup(a.status)}<div class="kv"><span>EVO Issuer ID</span><b class="mono">${esc(a.issuer_id||'')}</b></div><div class="kv"><span>Wallet</span><span class="mono">${esc(a.issuer_wallet||'')}</span></div><div class="kv"><span>Red</span><b class="mono">${esc(a.last_chain_id||a.first_chain_id||'N/A')}</b></div><div class="kv"><span>Registrada</span><span>${esc(a.created_at||'')}</span></div>`;
}

function injectIssuerUi(){
  const seal=$('seal');if(!seal||$('issuerTrust'))return;
  const style=document.createElement('style');style.id='issuerTrustStyle';style.textContent=`.issuerTrustGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.issuerLevel{padding:13px;border:1px solid #ffffff12;border-radius:14px;background:#ffffff05}.issuerLevel b{display:block;margin-bottom:5px}.issuerLevel p{margin:0;color:#aaa4bd}.issuerExplain{margin-top:14px;padding:14px;border:1px solid #f4ca7530;border-radius:14px;background:#f4ca7508;color:#d9d0bd}.issuerTrustInline{margin:14px 0;padding:14px;border:1px solid #f4ca7530;border-radius:14px;background:#f4ca7508}.issuerTrustInline .issuerTrustTitle{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}.issuerTrustInline p{margin:6px 0;color:#aaa4bd}.domainPanel{margin-top:16px}.domainProofGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.domainRecord{padding:14px;border:1px solid #ffffff12;border-radius:14px;background:#080715}.domainRecord code{word-break:break-all}.domainDns{padding:14px;border:1px dashed #24c5ff55;border-radius:14px;background:#24c5ff08}.domainDns .kv{align-items:flex-start}@media(max-width:850px){.issuerTrustGrid,.domainProofGrid{grid-template-columns:1fr}.issuerTrustInline .issuerTrustTitle{align-items:flex-start;flex-direction:column}}`;document.head.appendChild(style);
  seal.insertAdjacentHTML('beforebegin',`<section id="issuerTrust" class="wrap block"><h2>EVO Issuer</h2><p class="sub">Conectar una wallet crea automáticamente su cuenta EVO. El alta básica no pide nombre, empresa, slug ni sitio web.</p><div class="issuerTrustGrid"><div class="panel"><span class="kicker">AUTO WALLET ACCOUNT</span><h3>Cuenta EVO automática</h3><div id="issuerAutoAccount" class="empty">Conectá una wallet y EVO creará su registro básico automáticamente.</div></div><div class="panel"><span class="kicker">PUBLIC TRUST STATE</span><h3>Emisor del Seal actual</h3><div id="issuerPublicResult" class="empty">Abrí un EVO Seal para consultar su estado.</div><div class="issuerExplain"><b>Modelo simple</b><p>CONNECTED significa que la wallet fue registrada. WALLET PROVEN aparece cuando una firma EVO válida demuestra control de esa wallet. Las verificaciones adicionales son independientes y opcionales.</p></div></div></div><div class="panel domainPanel"><span class="kicker">DOMAIN PROOF · DNS TXT · OPCIONAL</span><h3>Verificar control de dominio</h3><p>Esta prueba sólo aplica si el emisor controla un dominio. No forma parte del registro automático de la wallet.</p><div class="domainProofGrid"><div class="form"><label>Dominio<input id="issuerDomain" placeholder="ej. empresa.cl"></label><div class="actions"><button id="domainIssueBtn" class="btn primary" type="button">1 · Firmar solicitud</button><button id="domainCheckBtn" class="btn gold" type="button" disabled>2 · Comprobar DNS</button></div><div id="domainChallengeResult" class="empty">Prueba opcional.</div></div><div id="domainPublicResult" class="domainRecord"><span class="status">DOMINIO NO VINCULADO</span><p>El dominio es una evidencia opcional.</p></div></div></div></section>`);
  const first=document.querySelector('.links a[href="#seal"]');if(first&&!document.querySelector('.links a[href="#issuerTrust"]'))first.insertAdjacentHTML('beforebegin','<a href="#issuerTrust">Issuer</a>');
  $('domainIssueBtn').onclick=issueDomainChallenge;
  $('domainCheckBtn').onclick=checkDomainChallenge;

  window.addEventListener('evo:wallet-connected',()=>{const out=$('issuerAutoAccount');if(out){out.className='empty';out.textContent='Registrando wallet en EVO…'}});
  window.addEventListener('evo:wallet-registered',e=>renderAutoIssuerAccount(e.detail));
  window.addEventListener('evo:wallet-registration-error',e=>{const out=$('issuerAutoAccount');if(out){out.className='result';out.innerHTML=`<span class="status bad">REGISTRO PENDIENTE</span><p>${esc(e.detail?.message||'No se pudo completar el registro automático.')}</p>`}});
  const current=window.evoGetWalletAccount?.()||window.evoWalletAccount;if(current)renderAutoIssuerAccount(current);
}

async function fetchWalletAccount(wallet){
  const issuerWallet=String(wallet||'').toLowerCase();if(!/^0x[0-9a-f]{40}$/.test(issuerWallet))return null;
  const r=await fetch(WALLET_ACCOUNT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'lookup',issuerWallet})});let data={};try{data=await r.json()}catch{}
  if(!r.ok)throw new Error(data.error||`No se pudo consultar EVO Issuer (${r.status})`);return data.account||null;
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
function effectiveIssuerStatus(profile,walletAccount,domainProof){
  if(profile?.status==='SUSPENDED'||walletAccount?.status==='SUSPENDED')return 'SUSPENDED';
  if(profile?.status==='ORGANIZATION_VERIFIED')return 'ORGANIZATION_VERIFIED';
  if(domainProof||profile?.status==='DOMAIN_VERIFIED')return 'DOMAIN_VERIFIED';
  if(walletAccount?.status==='WALLET_PROVEN'||profile?.status==='WALLET_PROVEN')return 'WALLET_PROVEN';
  if(walletAccount?.status==='CONNECTED')return 'CONNECTED';
  return 'SELF_DECLARED';
}
function renderIssuerProfile(profile,label='',wallet='',walletAccount=null,domainProof=null){
  const status=effectiveIssuerStatus(profile,walletAccount,domainProof);
  const title=profile?.display_name||label||walletAccount?.issuer_id||wallet||'Emisor';
  const issuerIdLine=walletAccount?.issuer_id?`<div class="kv"><span>EVO Issuer ID</span><b class="mono">${esc(walletAccount.issuer_id)}</b></div>`:'';
  const domainLine=domainProof?`<div class="kv"><span>Dominio verificado</span><b>${esc(domainProof.domain)}</b></div>`:'';
  const updated=walletAccount?.updated_at||profile?.updated_at||'';
  const meaning=status==='CONNECTED'?'La wallet está registrada automáticamente en EVO. Todavía no hay una firma EVO válida que eleve su estado a WALLET PROVEN.':status==='WALLET_PROVEN'?'Una firma EVO válida demostró control de esta wallet.':status==='DOMAIN_VERIFIED'?`La wallet además demostró control DNS de ${domainProof?.domain||'un dominio registrado'}.`:status==='ORGANIZATION_VERIFIED'?'La organización completó la revisión independiente definida por EVO.':status==='SUSPENDED'?'Este emisor está suspendido.':'El Seal contiene una wallet firmante, pero todavía no existe una cuenta EVO consultable para ella.';
  return `<div>${issuerStatusMarkup(status)}<h3>${esc(title)}</h3>${issuerIdLine}<div class="kv"><span>Wallet</span><span class="mono">${esc(walletAccount?.issuer_wallet||profile?.issuer_wallet||wallet)}</span></div>${domainLine}${updated?`<div class="kv"><span>Actualizado</span><span>${esc(updated)}</span></div>`:''}<p>${esc(meaning)}</p></div>`;
}
function renderDomainPublic(domainProof){
  const out=$('domainPublicResult');if(!out)return;
  if(!domainProof){out.innerHTML='<span class="status">DOMINIO NO VINCULADO</span><p>Prueba opcional.</p>';return}
  out.innerHTML=`<span class="status ok">DOMAIN VERIFIED</span><h3>${esc(domainProof.domain)}</h3><div class="kv"><span>Método</span><b>${esc(domainProof.method)}</b></div><div class="kv"><span>Verificado</span><span>${esc(domainProof.verified_at||'')}</span></div>`;
}
async function loadIssuerForSeal(sealId){
  const out=$('issuerPublicResult');if(!out)return;
  try{const s=await fetchSeal(sealId);if(!s)return;const [p,w,d]=await Promise.all([fetchIssuerProfile(s.issuer_wallet),fetchWalletAccount(s.issuer_wallet),fetchDomainVerification(s.issuer_wallet)]);out.className='result';out.innerHTML=renderIssuerProfile(p,s.issuer_label,s.issuer_wallet,w,d);renderDomainPublic(d)}catch(e){out.className='result';out.innerHTML=`<span class="status bad">✕ ISSUER ERROR</span><p>${esc(e.message||String(e))}</p>`}
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
    toast('Confirmá la solicitud de dominio en tu wallet. No es una transacción.');
    const signature=await walletProvider.request({method:'personal_sign',params:[message,account]});
    const data=await domainCall('issue',{issuerWallet,domain,clientNonce,signedAt,signature});
    activeDomainChallenge=data.challenge;$('domainCheckBtn').disabled=false;
    out.className='result domainDns';out.innerHTML=`<span class="status warn">DNS PENDING</span><div class="kv"><span>Challenge ID</span><b class="mono">${esc(data.challenge.challengeId)}</b></div><div class="kv"><span>Tipo</span><b>TXT</b></div><div class="kv"><span>Nombre DNS</span><code>${esc(data.challenge.dnsName)}</code></div><div class="kv"><span>Valor TXT</span><code>${esc(data.challenge.txtValue)}</code></div><div class="kv"><span>Vence</span><span>${esc(data.challenge.expiresAt)}</span></div><div class="actions"><button id="copyDnsName" class="btn" type="button">Copiar nombre</button><button id="copyDnsValue" class="btn" type="button">Copiar valor</button></div><p>Publicá exactamente ese TXT en el DNS. Cuando se propague, tocá “Comprobar DNS”.</p>`;
    $('copyDnsName').onclick=()=>navigator.clipboard.writeText(data.challenge.dnsName).then(()=>toast('Nombre DNS copiado'));
    $('copyDnsValue').onclick=()=>navigator.clipboard.writeText(data.challenge.txtValue).then(()=>toast('Valor TXT copiado'));
    const w=await fetchWalletAccount(account);if(w)renderAutoIssuerAccount(w);
    toast('Desafío DNS creado');
  }catch(e){out.className='result';out.innerHTML=`<span class="status bad">✕ DOMAIN CHALLENGE ERROR</span><p>${esc(e.message||String(e))}</p>`}
}
async function checkDomainChallenge(){
  const out=$('domainChallengeResult');if(!activeDomainChallenge){toast('Primero generá un desafío DNS');return}
  out.className='result';out.innerHTML='<span class="status warn">COMPROBANDO DNS…</span><p>Consultando el registro TXT público.</p>';
  try{
    const data=await domainCall('check',{challengeId:activeDomainChallenge.challengeId});
    if(!data.verified){out.innerHTML=`<span class="status warn">DNS TODAVÍA NO VISIBLE</span><p>No encontramos todavía el TXT esperado en ${esc(data.dnsName||activeDomainChallenge.dnsName)}. No hace falta firmar otra vez.</p>`;return}
    out.innerHTML=`<span class="status ok">✓ DOMAIN VERIFIED</span><h3>${esc(data.domain)}</h3><p>El servidor encontró el TXT correcto y vinculó este dominio con la wallet firmante.</p>`;
    $('domainCheckBtn').disabled=true;
    const [p,w,d]=await Promise.all([fetchIssuerProfile(account),fetchWalletAccount(account),fetchDomainVerification(account)]);renderDomainPublic(d);if($('issuerPublicResult'))$('issuerPublicResult').innerHTML=renderIssuerProfile(p,'',account,w,d);if(w)renderAutoIssuerAccount(w);
    const sid=new URLSearchParams(location.search).get('seal');if(sid)setTimeout(()=>showIssuerTrustInVerification(sid.toUpperCase()),100);
    toast('Dominio verificado por DNS');
  }catch(e){out.innerHTML=`<span class="status bad">✕ DOMAIN CHECK ERROR</span><p>${esc(e.message||String(e))}</p>`}
}

async function showIssuerTrustInVerification(sealId){
  const out=$('verifyResult');if(!out||!sealId)return;
  try{
    const s=await fetchSeal(String(sealId).trim().toUpperCase());if(!s)return;
    const [p,w,d]=await Promise.all([fetchIssuerProfile(s.issuer_wallet),fetchWalletAccount(s.issuer_wallet),fetchDomainVerification(s.issuer_wallet)]);
    out.querySelector('.issuerTrustInline')?.remove();
    const status=effectiveIssuerStatus(p,w,d),name=p?.display_name||s.issuer_label||w?.issuer_id||s.issuer_wallet;
    const meaning=status==='CONNECTED'?'Wallet registrada en EVO; todavía sin una firma EVO válida que la eleve a WALLET PROVEN.':status==='WALLET_PROVEN'?'Una firma EVO válida demostró control de la wallet.':status==='DOMAIN_VERIFIED'?`La wallet además demostró control DNS de ${d?.domain||'un dominio registrado'}.`:status==='ORGANIZATION_VERIFIED'?'La organización completó la revisión independiente definida por EVO.':status==='SUSPENDED'?'El emisor está suspendido.':'La wallet todavía no posee un estado EVO consultable.';
    const block=document.createElement('div');block.className='issuerTrustInline';
    block.innerHTML=`<div class="issuerTrustTitle"><b>Issuer · ${esc(name)}</b>${issuerStatusMarkup(status)}</div><p>${esc(meaning)}</p>${w?.issuer_id?`<p class="mono">${esc(w.issuer_id)}</p>`:''}${d?`<p><b>Dominio:</b> ${esc(d.domain)} · ${esc(d.method)}</p>`:''}`;
    const qr=out.querySelector('.qrCard');if(qr)out.insertBefore(block,qr);else out.appendChild(block);
  }catch(e){console.warn('Issuer state unavailable',e)}
}

injectIssuerUi();
const issuerQuerySeal=new URLSearchParams(location.search).get('seal');if(issuerQuerySeal){setTimeout(()=>loadIssuerForSeal(issuerQuerySeal.toUpperCase()),700);setTimeout(()=>showIssuerTrustInVerification(issuerQuerySeal.toUpperCase()),1200)}
const issuerVerifyBtn=$('verifyBtn');if(issuerVerifyBtn)issuerVerifyBtn.addEventListener('click',()=>setTimeout(()=>{const id=$('verifyId')?.value.trim().toUpperCase();if(id)showIssuerTrustInVerification(id)},700));
console.info('EVO Issuer V0.3',{registration:'AUTOMATIC ON WALLET CONNECT',automaticFields:['wallet','issuerId','chainId','createdAt','status'],manualProfileRequired:false,domainOptional:true,tokenMovement:false});
