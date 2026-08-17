const $=id=>document.getElementById(id);const enc=new TextEncoder();
const SUPABASE_URL='https://njvyrvmyhtplprdumzri.supabase.co';
const SUPABASE_KEY='sb_publishable_56k8Ya3rlLLJe86MNxqPag_qwwPLktt';
const REGISTER_URL=`${SUPABASE_URL}/functions/v1/register-evo-seal`;
const token='0x622b09038bc1ae90ee13a35ba5756b931d9dcc9f';
let account='';
let walletProvider=null;
let walletInfo=null;
const discoveredProviders=[];

window.addEventListener('eip6963:announceProvider',event=>{
  const detail=event.detail;
  if(!detail?.provider||!detail?.info)return;
  if(!discoveredProviders.some(p=>p.info?.uuid===detail.info.uuid))discoveredProviders.push(detail);
});
window.dispatchEvent(new Event('eip6963:requestProvider'));

function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),3200)}
function hex(buf){return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function shaBytes(bytes){if(!crypto?.subtle)throw new Error('Web Crypto no disponible');return hex(await crypto.subtle.digest('SHA-256',bytes))}
const shaText=t=>shaBytes(enc.encode(t));async function shaFile(f){return shaBytes(new Uint8Array(await f.arrayBuffer()))}
function canonical(o){return JSON.stringify(Object.keys(o).sort().reduce((a,k)=>(a[k]=typeof o[k]==='string'?o[k].trim():o[k],a),{}))}
function esc(s=''){return String(s).replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]))}
function rand(){const b=new Uint8Array(16);crypto.getRandomValues(b);return hex(b)}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function verificationUrl(id){const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('seal',id);u.hash='verify';return u.toString()}
function qrMarkup(id){return `<div class="qrCard"><div class="qrSlot" data-seal="${esc(id)}" aria-label="QR de verificación EVO"></div><div class="qrMeta"><b>EVO Verify QR</b><p>Escaneá este código para abrir la verificación pública del sello.</p><span class="mono qrUrl">${esc(verificationUrl(id))}</span><div class="actions"><button class="btn qrCopy" type="button">Copiar enlace</button><button class="btn qrDownload" type="button">Descargar QR</button><button class="btn gold sealDownload" type="button">Descargar sello EVO</button></div></div></div>`}
function rows(s,extra=''){const id=s.seal_id||s.sealId;return `<span class="status ok">✓ REGISTERED</span>${extra}<div class="kv"><span>Seal ID</span><b class="mono">${esc(id)}</b></div><div class="kv"><span>Nombre</span><b>${esc(s.title)}</b></div><div class="kv"><span>Emisor</span><span>${esc(s.issuer_label||s.issuerLabel||s.issuer_wallet||s.issuerWallet)}</span></div><div class="kv"><span>Wallet firmante</span><span class="mono">${esc(s.issuer_wallet||s.issuerWallet||'')}</span></div><div class="kv"><span>Fecha</span><span>${esc(s.created_at||s.createdAt||'')}</span></div><div class="kv"><span>Asset hash</span><span class="mono">${esc(s.asset_hash||s.assetHash||'N/A')}</span></div><div class="kv"><span>Estado</span><span class="status ok">PUBLIC V1 · SIGNED</span></div>${qrMarkup(id)}`}

function downloadHref(href,name){const a=document.createElement('a');a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove()}
function makePrintableSeal(qrCanvas,id,url){
  const c=document.createElement('canvas');c.width=720;c.height=960;const x=c.getContext('2d');
  x.fillStyle='#ffffff';x.fillRect(0,0,c.width,c.height);
  x.strokeStyle='#0b0818';x.lineWidth=12;x.strokeRect(22,22,676,916);
  x.fillStyle='#0b0818';x.fillRect(40,40,640,170);
  const grad=x.createLinearGradient(88,62,210,180);grad.addColorStop(0,'#f4ca75');grad.addColorStop(.35,'#ff46c8');grad.addColorStop(.7,'#9959ff');grad.addColorStop(1,'#24c5ff');x.fillStyle=grad;
  x.beginPath();x.moveTo(130,62);x.lineTo(190,122);x.lineTo(130,182);x.lineTo(70,122);x.closePath();x.fill();
  x.fillStyle='#ffffff';x.font='900 54px Arial, sans-serif';x.fillText('EVO VERIFIED',220,118);
  x.fillStyle='#f4ca75';x.font='700 22px Arial, sans-serif';x.fillText('THE DIGITAL SEAL',222,158);
  x.fillStyle='#111111';x.font='700 23px Arial, sans-serif';x.textAlign='center';x.fillText('SCAN TO VERIFY DIGITAL RECORD',360,252);
  x.fillStyle='#ffffff';x.fillRect(125,285,470,470);x.drawImage(qrCanvas,150,310,420,420);
  x.fillStyle='#111111';x.font='800 23px Arial, sans-serif';x.fillText(id,360,800);
  x.font='18px Arial, sans-serif';x.fillStyle='#444';x.fillText('REGISTERED · SIGNED · HASH-VERIFIABLE',360,838);
  x.font='16px Arial, sans-serif';x.fillStyle='#666';x.fillText('Public record verification · No wallet required',360,870);
  x.font='14px Arial, sans-serif';x.fillStyle='#777';x.fillText('Physical authenticity requires a trusted issuer or secure tag.',360,897);
  x.font='13px monospace';const short=url.length>78?url.slice(0,75)+'…':url;x.fillText(short,360,922);
  x.textAlign='start';return c;
}

function renderQrCards(root){
  root.querySelectorAll('.qrCard').forEach(card=>{
    const slot=card.querySelector('.qrSlot');const id=slot?.dataset.seal;if(!slot||!id)return;const url=verificationUrl(id);slot.innerHTML='';
    if(typeof QRCode==='undefined'){slot.innerHTML='<span class="status bad">QR NO DISPONIBLE</span>';return;}
    new QRCode(slot,{text:url,width:190,height:190,colorDark:'#090713',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
    const copy=card.querySelector('.qrCopy'),download=card.querySelector('.qrDownload'),sealDownload=card.querySelector('.sealDownload');
    if(copy)copy.onclick=()=>navigator.clipboard.writeText(url).then(()=>toast('Enlace público copiado'));
    if(download)download.onclick=()=>{const canvas=slot.querySelector('canvas'),img=slot.querySelector('img');const href=canvas?.toDataURL('image/png')||img?.src;if(!href)return toast('El QR todavía no está listo');downloadHref(href,`${id}-QR.png`);toast('QR descargado')};
    if(sealDownload)sealDownload.onclick=()=>{const qr=slot.querySelector('canvas');if(!qr)return toast('El QR todavía no está listo');const seal=makePrintableSeal(qr,id,url);downloadHref(seal.toDataURL('image/png'),`${id}-EVO-SEAL.png`);toast('Sello EVO imprimible descargado')};
  });
}

async function findMetaMaskProvider(){
  window.dispatchEvent(new Event('eip6963:requestProvider'));await sleep(500);
  const detected=discoveredProviders.map(d=>({name:String(d.info?.name||''),rdns:String(d.info?.rdns||''),provider:d.provider,info:d.info}));
  console.info('EIP-6963 wallets detected',detected.map(d=>({name:d.name,rdns:d.rdns})));
  const meta=detected.find(d=>/(^|\s)metamask(\s|$)/i.test(d.name)||d.rdns.toLowerCase()==='io.metamask');if(meta){walletInfo=meta.info;return meta.provider;}
  const providers=Array.isArray(window.ethereum?.providers)?window.ethereum.providers:[];
  const strict=providers.find(p=>p?.isMetaMask===true&&p?.isUniswapWallet!==true&&p?.isUniswap!==true&&p?.isCoinbaseWallet!==true&&p?.isBraveWallet!==true&&p?.isRabby!==true);
  if(strict){walletInfo={name:'MetaMask',rdns:'legacy-injected'};return strict;}
  const names=detected.map(d=>d.name).filter(Boolean),suffix=names.length?` Detectadas: ${names.join(', ')}.`:'';
  throw new Error(`MetaMask no fue detectado de forma segura.${suffix} Desbloqueá MetaMask o desactivá temporalmente la extensión de Uniswap y recargá.`);
}
async function connectWallet(){walletProvider=await findMetaMaskProvider();const accounts=await walletProvider.request({method:'eth_requestAccounts'});const a=accounts?.[0];if(!a)throw new Error('MetaMask no devolvió ninguna cuenta.');account=String(a).toLowerCase();$('walletBtn').textContent=`MetaMask ${account.slice(0,6)}…${account.slice(-4)}`;return account}
$('walletBtn').onclick=async()=>{try{await connectWallet();toast('MetaMask conectado. V1 sólo firma mensajes; no mueve fondos.')}catch(e){toast(e.message||'Conexión cancelada')}};
async function registerSeal(seal){const r=await fetch(REGISTER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({seal})});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.error||`Error de registro (${r.status})`);return data}
async function fetchSeal(id){const q=new URL(`${SUPABASE_URL}/rest/v1/evo_seals`);q.searchParams.set('seal_id',`eq.${id}`);q.searchParams.set('select','seal_id,version,asset_type,title,issuer_wallet,issuer_label,serial,description,file_name,file_size,file_type,asset_hash,metadata_hash,digest,created_at,registered_at,status');const r=await fetch(q,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});if(!r.ok)throw new Error(`No se pudo consultar el registro (${r.status})`);const result=await r.json();return result[0]||null}

$('sealForm').onsubmit=async e=>{e.preventDefault();const out=$('createResult');try{
  if(!account||!walletProvider)await connectWallet();const file=$('file').files[0];const createdAt=new Date().toISOString(),nonce=rand(),issuerWallet=account.toLowerCase();
  const metadata={assetType:$('type').value,title:$('title').value.trim(),issuerLabel:$('issuer').value.trim(),serial:$('serial').value.trim(),description:$('description').value.trim(),fileName:file?.name||'',fileSize:file?.size||0,fileType:file?.type||'',assetHash:file?await shaFile(file):'',issuerWallet,createdAt,nonce};
  const metadataHash=await shaText(canonical(metadata));const digest=await shaText(`${metadata.assetHash||metadataHash}|${metadataHash}|${createdAt}|${nonce}|${issuerWallet}`);const sealId=`EVO-${digest.slice(0,8).toUpperCase()}-${digest.slice(8,16).toUpperCase()}-${digest.slice(16,24).toUpperCase()}`;const signatureMessage=`EVO SEAL V1\nSeal ID: ${sealId}\nDigest: ${digest}\nIssuer: ${issuerWallet}\nCreated: ${createdAt}`;
  toast('Confirmá la firma en MetaMask. No es una transacción.');const signature=await walletProvider.request({method:'personal_sign',params:[signatureMessage,account]});const seal={sealId,version:'EVO-SEAL-V1',...metadata,metadataHash,digest,signature,signatureMessage};await registerSeal(seal);
  out.className='result';out.innerHTML=rows({...seal,seal_id:sealId,issuer_wallet:issuerWallet,issuer_label:metadata.issuerLabel,created_at:createdAt,asset_hash:metadata.assetHash})+`<div class="actions"><button id="copyId" class="btn">Copiar Seal ID</button><a class="btn gold" href="?seal=${encodeURIComponent(sealId)}#verify">Abrir verificación pública</a></div>`;renderQrCards(out);$('copyId').onclick=()=>navigator.clipboard.writeText(sealId).then(()=>toast('Seal ID copiado'));$('verifyId').value=sealId;toast('EVO Seal registrado públicamente');
}catch(err){out.className='result';out.innerHTML=`<span class="status bad">✕ NO REGISTRADO</span><p>${esc(err.message||String(err))}</p>`;toast(err.message||'No se pudo registrar')}};

async function verify(){const id=$('verifyId').value.trim().toUpperCase(),out=$('verifyResult');if(!id){toast('Ingresá un Seal ID');return}out.className='result';out.textContent='Consultando registro público…';try{const s=await fetchSeal(id);if(!s){out.innerHTML='<span class="status bad">✕ UNKNOWN</span><p>No existe un sello activo con ese ID en el registro público.</p>';return}let extra='';const f=$('verifyFile').files[0];if(f&&s.asset_hash){const same=(await shaFile(f))===s.asset_hash;extra=same?'<p><span class="status ok">✓ FILE HASH MATCH</span></p>':'<p><span class="status bad">✕ FILE MODIFIED / DIFFERENT</span></p>'}out.innerHTML=rows(s,extra);renderQrCards(out)}catch(e){out.innerHTML=`<span class="status bad">✕ ERROR</span><p>${esc(e.message||String(e))}</p>`}}
$('verifyBtn').onclick=verify;$('clearBtn').onclick=()=>{$('sealForm').reset();$('createResult').className='empty';$('createResult').textContent='Conectá MetaMask y creá un sello.'};
const querySeal=new URLSearchParams(location.search).get('seal');if(querySeal){$('verifyId').value=querySeal;setTimeout(()=>{location.hash='#verify';verify()},100)}
console.info('EVO Seal V1',{token,mode:'PUBLIC REGISTRY / STRICT METAMASK SIGNATURE / QR VERIFY / PRINTABLE SEAL / NO TOKEN MOVEMENT'});
