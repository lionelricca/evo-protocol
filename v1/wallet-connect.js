(()=>{
  const sleepMs=ms=>new Promise(r=>setTimeout(r,ms));
  let pickerOpen=false;

  function walletName(detail,index){
    const n=String(detail?.info?.name||'').trim();
    return n||`Wallet ${index+1}`;
  }

  async function walletCandidates(){
    try{window.dispatchEvent(new Event('eip6963:requestProvider'))}catch{}
    await sleepMs(350);
    const list=[];
    try{
      for(const d of discoveredProviders||[]){
        if(!d?.provider)continue;
        const uuid=String(d?.info?.uuid||'');
        if(uuid&&list.some(x=>String(x?.info?.uuid||'')===uuid))continue;
        if(!uuid&&list.some(x=>x.provider===d.provider))continue;
        list.push(d);
      }
    }catch{}
    if(!list.length){
      const injected=window.ethereum;
      const providers=Array.isArray(injected?.providers)?injected.providers:[];
      if(providers.length){
        providers.forEach((p,i)=>list.push({provider:p,info:{name:p?.isMetaMask?'MetaMask':p?.isCoinbaseWallet?'Coinbase Wallet':p?.isRabby?'Rabby':p?.isBraveWallet?'Brave Wallet':p?.isUniswapWallet||p?.isUniswap?'Uniswap Wallet':`Wallet ${i+1}`,rdns:'legacy-injected'}}));
      }else if(injected){
        list.push({provider:injected,info:{name:injected?.isMetaMask?'MetaMask':injected?.isCoinbaseWallet?'Coinbase Wallet':injected?.isRabby?'Rabby':injected?.isBraveWallet?'Brave Wallet':injected?.isUniswapWallet||injected?.isUniswap?'Uniswap Wallet':'Wallet EVM',rdns:'legacy-injected'}});
      }
    }
    return list;
  }

  function closePicker(){
    document.getElementById('evoWalletPicker')?.remove();
    pickerOpen=false;
  }

  function chooseWallet(list){
    return new Promise(resolve=>{
      if(list.length===1)return resolve(list[0]);
      closePicker();pickerOpen=true;
      const overlay=document.createElement('div');overlay.id='evoWalletPicker';
      overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:#05050de8;display:flex;align-items:center;justify-content:center;padding:20px';
      const card=document.createElement('div');card.style.cssText='width:min(460px,100%);background:#0b0917;border:1px solid #ffffff20;border-radius:18px;padding:20px;box-shadow:0 24px 80px #000a';
      card.innerHTML='<span class="kicker">EVO WALLET</span><h3 style="margin:8px 0">Elegí tu wallet</h3><p style="color:#aaa4bd">EVO acepta cualquier wallet EVM compatible. Al elegirla, esa wallet pedirá autorización para compartir tu cuenta pública. No se firma ningún mensaje en este paso.</p>';
      const options=document.createElement('div');options.style.cssText='display:grid;gap:10px;margin-top:16px';
      list.forEach((d,i)=>{
        const b=document.createElement('button');b.type='button';b.className='btn';b.style.cssText='display:flex;justify-content:space-between;align-items:center;width:100%';
        b.innerHTML=`<b>${esc(walletName(d,i))}</b><span style="color:#aaa4bd">Conectar</span>`;
        b.onclick=()=>{closePicker();resolve(d)};options.appendChild(b);
      });
      const cancel=document.createElement('button');cancel.type='button';cancel.className='btn';cancel.textContent='Cancelar';cancel.style.marginTop='14px';cancel.onclick=()=>{closePicker();resolve(null)};
      card.appendChild(options);card.appendChild(cancel);overlay.appendChild(card);document.body.appendChild(overlay);
      overlay.addEventListener('click',e=>{if(e.target===overlay){closePicker();resolve(null)}});
    });
  }

  async function requestExplicitAccountPermission(provider){
    if(!provider?.request)throw new Error('La wallet seleccionada no es compatible con EIP-1193.');
    try{
      await provider.request({method:'wallet_requestPermissions',params:[{eth_accounts:{}}]});
    }catch(e){
      const code=Number(e?.code);
      const msg=String(e?.message||'').toLowerCase();
      const unsupported=code===-32601||code===4200||msg.includes('not supported')||msg.includes('unsupported')||msg.includes('method not found');
      if(!unsupported)throw e;
    }
    const accounts=await provider.request({method:'eth_requestAccounts'});
    return accounts;
  }

  async function connectAnyWallet(){
    const list=await walletCandidates();
    if(!list.length)throw new Error('No se detectó ninguna wallet EVM. Instalá o desbloqueá una wallet compatible y volvé a intentar.');
    const selected=await chooseWallet(list);if(!selected)throw new Error('Conexión cancelada.');
    const provider=selected.provider;
    const accounts=await requestExplicitAccountPermission(provider);
    const a=accounts?.[0];if(!a)throw new Error('La wallet no autorizó ninguna cuenta.');
    walletProvider=provider;walletInfo=selected.info||{name:'Wallet EVM'};account=String(a).toLowerCase();
    const name=walletName(selected,0);
    const btn=document.getElementById('walletBtn');if(btn)btn.textContent=`${name} ${account.slice(0,6)}…${account.slice(-4)}`;
    window.dispatchEvent(new CustomEvent('evo:wallet-connected',{detail:{account,wallet:name}}));
    return account;
  }

  connectWallet=connectAnyWallet;
  const btn=document.getElementById('walletBtn');
  if(btn){
    btn.textContent='Conectar wallet';
    btn.onclick=async()=>{
      try{await connectAnyWallet();toast('Wallet autorizada. EVO sólo recibió la cuenta pública; todavía no se firmó nada.')}catch(e){if(String(e?.message||'')!=='Conexión cancelada.')toast(e?.message||'Conexión cancelada')}
    };
  }
  console.info('EVO Wallet Connect V1',{standard:'EIP-6963 + EIP-1193',wallets:'ANY COMPATIBLE EVM WALLET',explicitPermission:true,signatureOnConnect:false});
})();
