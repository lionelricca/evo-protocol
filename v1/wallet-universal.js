(()=>{
  const providers=[];
  const byUuid=new Map();
  let picker=null;

  function collect(detail){
    if(!detail?.provider||!detail?.info)return;
    const id=detail.info.uuid||detail.info.rdns||detail.info.name;
    if(!id||byUuid.has(id))return;
    byUuid.set(id,detail);
    providers.push(detail);
  }

  window.addEventListener('eip6963:announceProvider',e=>collect(e.detail));
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  function legacyProviders(){
    const list=[];
    const eth=window.ethereum;
    if(Array.isArray(eth?.providers)){
      eth.providers.forEach((p,i)=>list.push({provider:p,info:{uuid:`legacy-${i}`,name:p.isMetaMask?'MetaMask':p.isRabby?'Rabby':p.isCoinbaseWallet?'Coinbase Wallet':p.isBraveWallet?'Brave Wallet':p.isUniswapWallet||p.isUniswap?'Uniswap Wallet':`Wallet ${i+1}`,rdns:`legacy.${i}`}}));
    }else if(eth){
      list.push({provider:eth,info:{uuid:'legacy-default',name:eth.isMetaMask?'MetaMask':eth.isRabby?'Rabby':eth.isCoinbaseWallet?'Coinbase Wallet':eth.isBraveWallet?'Brave Wallet':eth.isUniswapWallet||eth.isUniswap?'Uniswap Wallet':'Wallet EVM',rdns:'legacy.default'}});
    }
    return list;
  }

  async function discover(){
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    await new Promise(r=>setTimeout(r,350));
    const all=[...providers];
    for(const item of legacyProviders()){
      if(!all.some(x=>x.provider===item.provider))all.push(item);
    }
    return all;
  }

  function closePicker(){if(picker){picker.remove();picker=null}}

  function choose(items){
    if(items.length===1)return Promise.resolve(items[0]);
    return new Promise((resolve,reject)=>{
      closePicker();
      const overlay=document.createElement('div');
      picker=overlay;
      overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(5,5,13,.82);display:grid;place-items:center;padding:20px';
      const box=document.createElement('div');
      box.style.cssText='width:min(440px,100%);background:#11101d;border:1px solid #3a3556;border-radius:18px;padding:18px;box-shadow:0 22px 80px rgba(0,0,0,.55)';
      box.innerHTML='<h3 style="margin:0 0 6px">Elegí tu wallet</h3><p style="margin:0 0 14px;color:#bbb4d5">EVO acepta cualquier wallet EVM compatible detectada en este navegador.</p>';
      const list=document.createElement('div');list.style.cssText='display:grid;gap:10px';
      items.forEach(item=>{
        const b=document.createElement('button');b.type='button';b.className='btn';b.style.cssText='width:100%;justify-content:flex-start;padding:12px 14px';b.textContent=item.info?.name||'Wallet EVM';
        b.onclick=()=>{closePicker();resolve(item)};list.appendChild(b);
      });
      const cancel=document.createElement('button');cancel.type='button';cancel.className='btn';cancel.style.cssText='margin-top:12px;width:100%';cancel.textContent='Cancelar';cancel.onclick=()=>{closePicker();reject(new Error('Conexión cancelada'))};
      box.appendChild(list);box.appendChild(cancel);overlay.appendChild(box);document.body.appendChild(overlay);
    });
  }

  async function requestAuthorization(provider){
    try{
      if(typeof provider.request==='function'){
        await provider.request({method:'wallet_requestPermissions',params:[{eth_accounts:{}}]});
      }
    }catch(err){
      const code=err?.code;
      if(code===4001||code==='ACTION_REJECTED')throw err;
      // Algunas wallets no implementan wallet_requestPermissions; eth_requestAccounts sigue siendo el estándar compatible.
    }
    const accounts=await provider.request({method:'eth_requestAccounts'});
    if(!accounts?.[0])throw new Error('La wallet no devolvió ninguna cuenta.');
    return accounts;
  }

  async function universalConnectWallet(){
    const available=await discover();
    if(!available.length)throw new Error('No se detectó ninguna wallet EVM compatible. Instalá o habilitá una wallet y recargá.');
    const selected=await choose(available);
    const accounts=await requestAuthorization(selected.provider);
    walletProvider=selected.provider;
    walletInfo=selected.info||{name:'Wallet EVM'};
    account=String(accounts[0]).toLowerCase();
    const btn=document.getElementById('walletBtn');
    if(btn)btn.textContent=`${walletInfo.name||'Wallet'} ${account.slice(0,6)}…${account.slice(-4)}`;
    window.dispatchEvent(new CustomEvent('evo:wallet-connected',{detail:{account,wallet:walletInfo.name||'Wallet EVM'}}));
    return account;
  }

  window.connectWallet=universalConnectWallet;
  const btn=document.getElementById('walletBtn');
  if(btn){
    btn.onclick=async()=>{
      try{
        await universalConnectWallet();
        if(typeof toast==='function')toast(`${walletInfo?.name||'Wallet'} conectada. EVO no firma ni mueve fondos al conectar.`);
      }catch(e){
        if(typeof toast==='function')toast(e?.message||'Conexión cancelada');
      }
    };
  }

  console.info('EVO universal wallet connector ready',{standard:'EIP-6963 + EIP-1193',explicitAuthorization:true});
})();
