const $=id=>document.getElementById(id);const enc=new TextEncoder();
const SUPABASE_URL='https://njvyrvmyhtplprdumzri.supabase.co';
const SUPABASE_KEY='sb_publishable_56k8Ya3rlLLJe86MNxqPag_qwwPLktt';
const REGISTER_URL=`${SUPABASE_URL}/functions/v1/register-evo-seal`;
const token='0x622b09038bc1ae90ee13a35ba5756b931d9dcc9f';
let account='';
let walletProvider=null;
const discoveredProviders=[];

window.addEventListener('eip6963:announceProvider',event=>{
  const detail=event.detail;
  if(!detail?.provider||!detail?.info)return;
  if(!discoveredProviders.some(p=>p.info?.uuid===detail.info.uuid))discoveredProviders.push(detail);
});
window.dispatchEvent(new Event('eip6963:requestProvider'));

function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)}
function hex(buf){return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function shaBytes(bytes){if(!crypto?.subtle)throw new Error('Web Crypto no disponible');return hex(await crypto.subtle.digest('SHA-256',bytes))}
const shaText=t=>shaBytes(enc.encode(t));async function shaFile(f){return shaBytes(new Uint8Array(await f.arrayBuffer()))}
function canonical(o){return JSON.stringify(Object.keys(o).sort().reduce((a,k)=>(a[k]=typeof o[k]==='string'?o[k].trim():o[k],a),{}))}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function rand(){const b=new Uint8Array(16);crypto.getRandomValues(b);return hex(b)}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function rows(s,extra=''){return `<span class="status ok">✓ REGISTERED</span>${extra}<div class="kv"><span>Seal ID</span><b class="mono">${esc(s.seal_id||s.sealId)}</b></div><div class="kv"><span>Nombre</span><b>${esc(s.title)}</b></div><div class="kv"><span>Emisor</span><span>${esc(s.issuer_label||s.issuerLabel||s.issuer_wallet||s.issuerWallet)}</span></div><div class="kv"><span>Wallet firmante</span><span class="mono">${esc(s.issuer_wallet||s.issuerWallet||'')}</span></div><div class="kv"><span>Fecha</span><span>${esc(s.created_at||s.createdAt||'')}</span></div><div class="kv"><span>Asset hash</span><span class="mono">${esc(s.asset_hash||s.assetHash||'N/A')}</span></div><div class="kv"><span>Estado</span><span class="status ok">PUBLIC V1 · SIGNED</span></div>`}

async function findMetaMaskProvider(){
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  await sleep(250);
  const by6963=discoveredProviders.find(d=>
    d.info?.rdns==='io.metamask'||/metamask/i.test(d.info?.name||'')
  );
  if(by6963?.provider)return by6963.provider;

  const injected=window.ethereum;
  if(injected?.providers?.length){
    const exact=injected.providers.find(p=>p?.isMetaMask&&!p?.isUniswapWallet&&!p?.isCoinbaseWallet);
    if(exact)return exact;
    const mm=injected.providers.find(p=>p?.isMetaMask);
    if(mm)return mm;
  }
  if(injected?.isMetaMask&&!injected?.isUniswapWallet)return injected;
  return null;
}

async function connectWallet(){
  walletProvider=await findMetaMaskProvider();
  if(!walletProvider)throw new Error('MetaMask no fue detectado. Abrí/desbloqueá MetaMask y recargá esta página.');
  const accounts=await walletProvider.request({method:'eth_requestAccounts'});
  const a=accounts?.[0];
  if(!a)throw new Error('MetaMask no devolvió ninguna cuenta.');
  account=String(a).toLowerCase();
  $('walletBtn').textContent=`MetaMask ${account.slice(0,6)}…${account.slice(-4)}`;
  return account;
}

$('walletBtn').onclick=async()=>{try{await connectWallet();toast('MetaMask conectado. V1 sólo firma mensajes; no mueve fondos.')}catch(e){toast(e.message||'Conexión cancelada')}};
async function registerSeal(seal){const r=await fetch(REGISTER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({seal})});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.error||`Error de registro (${r.status})`);return data}
async function fetchSeal(id){const q=new URL(`${SUPABASE_URL}/rest/v1/evo_seals`);q.searchParams.set('seal_id',`eq.${id}`);q.searchParams.set('select','seal_id,version,asset_type,title,issuer_wallet,issuer_label,serial,description,file_name,file_size,file_type,asset_hash,metadata_hash,digest,created_at,registered_at,status');const r=await fetch(q,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});if(!r.ok)throw new Error(`No se pudo consultar el registro (${r.status})`);const result=await r.json();return result[0]||null}

$('sealForm').onsubmit=async e=>{e.preventDefault();const out=$('createResult');try{
  if(!account||!walletProvider)await connectWallet();
  const file=$('file').files[0];
  const createdAt=new Date().toISOString(),nonce=rand(),issuerWallet=account.toLowerCase();
  const metadata={assetType:$('type').value,title:$('title').value.trim(),issuerLabel:$('issuer').value.trim(),serial:$('serial').value.trim(),description:$('description').value.trim(),fileName:file?.name||'',fileSize:file?.size||0,fileType:file?.type||'',assetHash:file?await shaFile(file):'',issuerWallet,createdAt,nonce};
  const metadataHash=await shaText(canonical(metadata));
  const digest=await shaText(`${metadata.assetHash||metadataHash}|${metadataHash}|${createdAt}|${nonce}|${issuerWallet}`);
  const sealId=`EVO-${digest.slice(0,8).toUpperCase()}-${digest.slice(8,16).toUpperCase()}-${digest.slice(16,24).toUpperCase()}`;
  const signatureMessage=`EVO SEAL V1\nSeal ID: ${sealId}\nDigest: ${digest}\nIssuer: ${issuerWallet}\nCreated: ${createdAt}`;
  toast('Confirmá la firma en MetaMask. No es una transacción.');
  const signature=await walletProvider.request({method:'personal_sign',params:[signatureMessage,account]});
  const seal={sealId,version:'EVO-SEAL-V1',...metadata,metadataHash,digest,signature,signatureMessage};
  await registerSeal(seal);
  out.className='result';
  out.innerHTML=rows({...seal,seal_id:sealId,issuer_wallet:issuerWallet,issuer_label:metadata.issuerLabel,created_at:createdAt,asset_hash:metadata.assetHash})+`<div class="actions"><button id="copyId" class="btn">Copiar Seal ID</button><a class="btn gold" href="?seal=${encodeURIComponent(sealId)}#verify">Abrir verificación pública</a></div>`;
  $('copyId').onclick=()=>navigator.clipboard.writeText(sealId).then(()=>toast('Seal ID copiado'));
  $('verifyId').value=sealId;toast('EVO Seal registrado públicamente');
}catch(err){out.className='result';out.innerHTML=`<span class="status bad">✕ NO REGISTRADO</span><p>${esc(err.message||String(err))}</p>`;toast(err.message||'No se pudo registrar')}};

async function verify(){const id=$('verifyId').value.trim().toUpperCase(),out=$('verifyResult');if(!id){toast('Ingresá un Seal ID');return}out.className='result';out.textContent='Consultando registro público…';try{const s=await fetchSeal(id);if(!s){out.innerHTML='<span class="status bad">✕ UNKNOWN</span><p>No existe un sello activo con ese ID en el registro público.</p>';return}let extra='';const f=$('verifyFile').files[0];if(f&&s.asset_hash){const same=(await shaFile(f))===s.asset_hash;extra=same?'<p><span class="status ok">✓ FILE HASH MATCH</span></p>':'<p><span class="status bad">✕ FILE MODIFIED / DIFFERENT</span></p>'}out.innerHTML=rows(s,extra)}catch(e){out.innerHTML=`<span class="status bad">✕ ERROR</span><p>${esc(e.message||String(e))}</p>`}}
$('verifyBtn').onclick=verify;
$('clearBtn').onclick=()=>{$('sealForm').reset();$('createResult').className='empty';$('createResult').textContent='Conectá MetaMask y creá un sello.'};
const querySeal=new URLSearchParams(location.search).get('seal');if(querySeal){$('verifyId').value=querySeal;setTimeout(()=>{location.hash='#verify';verify()},100)}
console.info('EVO Seal V1',{token,mode:'PUBLIC REGISTRY / METAMASK SIGNATURE / NO TOKEN MOVEMENT'});
