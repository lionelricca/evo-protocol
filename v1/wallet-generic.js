(()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const options=[];

  function addOption(provider,info={}){
    if(!provider||typeof provider.request!=='function')return;
    if(options.some(x=>x.provider===provider||x.info?.uuid&&info?.uuid&&x.info.uuid===info.uuid))return;
    options.push({provider,info:{name:info.name||'Wallet EVM',rdns:info.rdns||'',uuid:info.uuid||'',icon:info.icon||''}});
  }

  window.addEventListener('eip6963:announceProvider',e=>addOption(e.detail?.provider,e.detail?.info||{}));
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  function collectLegacy(){
    const eth=window.ethereum;
    if(!eth)return;
    const ps=Array.isArray(eth.providers)?eth.providers:[eth];
    ps.forEach((p,i)=>{
      let name='Wallet EVM';
      if(p?.isMetaMask)name='MetaMask';
      else if(p?.isRabby)name='Rabby';
      else if(p?.isCoinbaseWallet)name='Coinbase Wallet';
      else if(p?.isBraveWallet)name='Brave Wallet';
      else if(p?.isUniswapWallet||p?.isUniswap)name='Uniswap Wallet';
      addOption(p,{name,rdns:`legacy-${i}`});
    });
  }

  function closePicker(){document.getElementById('evoWalletPicker')?.remove()}

  function pickWallet(){
    if(options.length===1)return Promise.resolve(options[0]);
    return new Promise((resolve,reject)=>{
      closePicker();
      const wrap=document.createElement('div');
      wrap.id='evoWalletPicker';
      wrap.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.68);z-index:99999;display:grid;place-items:center;padding:20px';
      const box=document.createElement('div');
      box.style.cssText='width:min(420px,100%);background:#0f0d20;border:1px solid #34304d;border-radius:18px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.45)';
      box.innerHTML='<h3 style="margin:0 0 6px">Elegir wallet</h3><p style="margin:0 0 14px;opacity:.72">Seleccioná la wallet EVM que querés autorizar.</p>';
      options.forEach((w,i)=>{
        const b=document.createElement('button');
        b.type='button';b.className='btn';
        b.style.cssText='width:100%;justify-content:flex-start;margin:6px 0;padding:12px 14px';
        b.textContent=w.info?.name||`Wallet ${i+1}`;
        b.onclick=()=>{closePicker();resolve(w)};
        box.appendChild(b);
      });
      const cancel=document.createElement('button');
      cancel.type='button';cancel.className='btn';cancel.style.cssText='width:100%;margin-top:10px';cancel.textContent='Cancelar';
      cancel.onclick=()=>{closePicker();reject(new Error('Conexión cancelada'))};
      box.appendChild(cancel);wrap.appendChild(box);document.body.appendChild(wrap);
      wrap.addEventListener('click',e=>{if(e.target===wrap){closePicker();reject(new Error('Conexión cancelada'))}});
    });
  }

  async function requestAuthorization(provider){
    try{
      await provider.request({method:'wallet_requestPermissions',params:[{eth_accounts:{}}]});
    }catch(e){
      const unsupported=e?.code===-32601||/not supported|unsupported|method/i.test(String(e?.message||''));
      if(!unsupported&&e?.code===4001)throw e;
    }
    const accounts=await provider.request({method:'eth_requestAccounts'});
    return accounts;
  }

  async function genericConnectWallet(){
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    await wait(350);collectLegacy();
    if(!options.length)throw new Error('No se detectó ninguna wallet EVM compatible en este navegador.');
    const chosen=await pickWallet();
    const accounts=await requestAuthorization(chosen.provider);
    const a=accounts?.[0];if(!a)throw new Error('La wallet no devolvió ninguna cuenta.');
    walletProvider=chosen.provider;
    walletInfo=chosen.info||{};
    account=String(a).toLowerCase();
    const btn=document.getElementById('walletBtn');
    if(btn)btn.textContent=`${walletInfo.name||'Wallet'} ${account.slice(0,6)}…${account.slice(-4)}`;
    window.dispatchEvent(new CustomEvent('evo:wallet-connected',{detail:{account,wallet:walletInfo.name||'Wallet EVM'}}));
    return account;
  }

  window.findMetaMaskProvider=async()=>{collectLegacy();window.dispatchEvent(new Event('eip6963:requestProvider'));await wait(300);const chosen=await pickWallet();walletInfo=chosen.info||{};return chosen.provider};
  window.connectWallet=genericConnectWallet;

  const btn=document.getElementById('walletBtn');
  if(btn)btn.onclick=async()=>{
    try{await genericConnectWallet();toast(`${walletInfo?.name||'Wallet'} conectada. EVO no mueve fondos al conectar.`)}
    catch(e){toast(e?.message||'Conexión cancelada')}
  };

  console.info('EVO generic EVM wallet connector enabled');
})();
