// EVO V1 · Secure multi-wallet connector
// - Explicit user action only
// - EIP-6963 discovery first
// - User chooses the provider when multiple wallets are installed
// - Connection requests account permission only
// - NO personal_sign, NO transaction, NO token approval during connect

(()=>{
  const isProvider=p=>!!p&&typeof p.request==='function';

  function safeText(v,max=80){return String(v||'Wallet').replace(/[<>]/g,'').trim().slice(0,max)||'Wallet'}

  async function discoverWallets(){
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    await sleep(350);

    const seen=new Set();
    const wallets=[];
    for(const d of discoveredProviders){
      if(!d?.provider||!isProvider(d.provider))continue;
      const uuid=String(d.info?.uuid||'');
      if(uuid&&seen.has(uuid))continue;
      if(uuid)seen.add(uuid);
      wallets.push({
        provider:d.provider,
        info:{
          uuid,
          name:safeText(d.info?.name),
          rdns:safeText(d.info?.rdns,120)
        },
        source:'EIP-6963'
      });
    }

    if(wallets.length)return wallets;

    // Legacy fallback only when no EIP-6963 provider was announced.
    const legacy=[];
    const injected=Array.isArray(window.ethereum?.providers)?window.ethereum.providers:[];
    for(const p of injected){if(isProvider(p)&&!legacy.some(x=>x.provider===p))legacy.push({provider:p,info:{name:legacyName(p),rdns:'legacy-injected'},source:'LEGACY'})}
    if(!legacy.length&&isProvider(window.ethereum))legacy.push({provider:window.ethereum,info:{name:legacyName(window.ethereum),rdns:'legacy-window.ethereum'},source:'LEGACY'});
    return legacy;
  }

  function legacyName(p){
    if(p?.isMetaMask&&!p?.isRabby)return 'MetaMask';
    if(p?.isRabby)return 'Rabby';
    if(p?.isCoinbaseWallet)return 'Coinbase Wallet';
    if(p?.isBraveWallet)return 'Brave Wallet';
    if(p?.isUniswapWallet||p?.isUniswap)return 'Uniswap Wallet';
    return 'Wallet EVM';
  }

  function ensurePicker(){
    let dlg=document.getElementById('evoWalletPicker');
    if(dlg)return dlg;
    const style=document.createElement('style');
    style.textContent=`#evoWalletPicker{border:1px solid #ffffff22;border-radius:18px;background:#0b0915;color:#fff;padding:0;max-width:460px;width:calc(100% - 32px);box-shadow:0 25px 80px #000b}#evoWalletPicker::backdrop{background:#000a}.evoWalletPickerInner{padding:20px}.evoWalletPickerHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.evoWalletPickerHead h3{margin:0 0 6px}.evoWalletPickerHead p{margin:0;color:#aaa4bd;font-size:13px}.evoWalletClose{background:none;border:0;color:#fff;font-size:24px;cursor:pointer}.evoWalletList{display:grid;gap:9px;margin-top:18px}.evoWalletChoice{width:100%;text-align:left;padding:13px 14px;border:1px solid #ffffff18;border-radius:13px;background:#ffffff08;color:#fff;cursor:pointer}.evoWalletChoice:hover{border-color:#f4ca7560;background:#ffffff0d}.evoWalletChoice b{display:block}.evoWalletChoice small{display:block;color:#8f899f;margin-top:3px;word-break:break-all}.evoWalletSafety{margin-top:14px;padding:11px;border:1px solid #f4ca7530;border-radius:12px;color:#c8c1d6;font-size:12px}`;
    document.head.appendChild(style);
    dlg=document.createElement('dialog');
    dlg.id='evoWalletPicker';
    dlg.innerHTML=`<div class="evoWalletPickerInner"><div class="evoWalletPickerHead"><div><h3>Elegí tu wallet</h3><p>EVO sólo solicitará permiso para ver la cuenta pública.</p></div><button class="evoWalletClose" type="button" aria-label="Cerrar">×</button></div><div id="evoWalletList" class="evoWalletList"></div><div class="evoWalletSafety">Conectar una wallet no firma mensajes, no aprueba tokens y no mueve EVO, POL ni otros fondos.</div></div>`;
    document.body.appendChild(dlg);
    dlg.querySelector('.evoWalletClose').onclick=()=>dlg.close('cancel');
    return dlg;
  }

  function chooseWallet(wallets){
    if(wallets.length===1)return Promise.resolve(wallets[0]);
    const dlg=ensurePicker(),list=dlg.querySelector('#evoWalletList');
    list.innerHTML='';
    return new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(value,err)=>{if(settled)return;settled=true;dlg.close();err?reject(err):resolve(value)};
      wallets.forEach(w=>{
        const b=document.createElement('button');
        b.type='button';b.className='evoWalletChoice';
        const name=document.createElement('b');name.textContent=w.info.name;
        const meta=document.createElement('small');meta.textContent=w.source==='EIP-6963'?(w.info.rdns||'EIP-6963'):'Compatibilidad heredada';
        b.append(name,meta);b.onclick=()=>finish(w);list.appendChild(b);
      });
      dlg.onclose=()=>{if(!settled){settled=true;reject(new Error('Selección de wallet cancelada.'))}};
      dlg.showModal();
    });
  }

  async function requestAccounts(provider){
    // First ask the wallet for explicit account permission when supported.
    try{
      await provider.request({method:'wallet_requestPermissions',params:[{eth_accounts:{}}]});
      const granted=await provider.request({method:'eth_accounts'});
      if(granted?.length)return granted;
    }catch(e){
      if(e?.code===4001||String(e?.code)==='4001')throw new Error('Autorización cancelada en la wallet.');
      // -32601 = method unsupported. Fall through to standard EIP-1193 account request.
      if(!(e?.code===-32601||String(e?.code)==='-32601')){
        // Some wallets use different unsupported-method codes/messages; eth_requestAccounts remains the interoperable fallback.
        const msg=String(e?.message||'').toLowerCase();
        if(!msg.includes('unsupported')&&!msg.includes('not supported')&&!msg.includes('method not found'))throw e;
      }
    }
    return await provider.request({method:'eth_requestAccounts'});
  }

  window.evoConnectWallet = async function(){
    const wallets=await discoverWallets();
    if(!wallets.length)throw new Error('No se detectó ninguna wallet EVM compatible.');
    const selected=await chooseWallet(wallets);
    const accounts=await requestAccounts(selected.provider);
    const a=accounts?.[0];
    if(!/^0x[0-9a-fA-F]{40}$/.test(String(a||'')))throw new Error('La wallet no devolvió una cuenta EVM válida.');

    walletProvider=selected.provider;
    walletInfo=selected.info;
    account=String(a).toLowerCase();

    const btn=document.getElementById('walletBtn');
    if(btn)btn.textContent=`${safeText(selected.info.name,24)} ${account.slice(0,6)}…${account.slice(-4)}`;
    window.dispatchEvent(new CustomEvent('evo:wallet-connected',{detail:{account,wallet:selected.info.name,source:selected.source}}));
    return account;
  };

  // Override the legacy MetaMask-only connector used by the rest of V1.
  connectWallet=window.evoConnectWallet;

  const btn=document.getElementById('walletBtn');
  if(btn)btn.onclick=async()=>{
    try{
      await window.evoConnectWallet();
      toast('Wallet autorizada. No se firmó ningún mensaje ni se movieron fondos.');
    }catch(e){toast(e?.message||'Conexión cancelada')}
  };

  console.info('EVO wallet security',{discovery:'EIP-6963 FIRST',selection:'USER CONTROLLED',legacy:'FALLBACK ONLY',connect:'ACCOUNT PERMISSION ONLY',signOnConnect:false,transactionsOnConnect:false});
})();
