'use strict';

(()=>{
  const walletRe=/^0x[0-9a-fA-F]{40}$/;
  const preferenceKey='evo-wallet-preference-v277';
  const announced=[];
  const bound=new WeakSet();

  const safe=(value,max=80)=>String(value||'Wallet').replace(/[<>]/g,'').trim().slice(0,max)||'Wallet';
  const providerName=provider=>{
    if(provider?.isMetaMask&&!provider?.isRabby)return 'MetaMask';
    if(provider?.isRabby)return 'Rabby';
    if(provider?.isCoinbaseWallet)return 'Coinbase Wallet';
    if(provider?.isBraveWallet)return 'Brave Wallet';
    if(provider?.isUniswapWallet||provider?.isUniswap)return 'Uniswap Wallet';
    return 'Wallet EVM';
  };
  const readPreference=()=>{try{return JSON.parse(localStorage.getItem(preferenceKey)||'null')}catch{return null}};
  const remember=(entry,accountValue)=>{try{localStorage.setItem(preferenceKey,JSON.stringify({rdns:entry?.info?.rdns||'',name:entry?.info?.name||providerName(entry?.provider),account:String(accountValue||'').toLowerCase()}))}catch{}};
  const clearAccount=()=>{
    try{if(typeof account!=='undefined')account='';}catch{}
    try{if(typeof walletProvider!=='undefined')walletProvider=null;}catch{}
    try{if(typeof walletInfo!=='undefined')walletInfo=null;}catch{}
    window.dispatchEvent(new CustomEvent('evo:wallet-disconnected'));
  };

  window.addEventListener('eip6963:announceProvider',event=>{
    const detail=event?.detail;
    if(!detail?.provider||typeof detail.provider.request!=='function')return;
    if(announced.some(item=>item.provider===detail.provider))return;
    announced.push({provider:detail.provider,info:{name:safe(detail.info?.name),rdns:safe(detail.info?.rdns,120)}});
  });

  const discover=async()=>{
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    await new Promise(resolve=>setTimeout(resolve,260));
    const list=[...announced];
    const injected=Array.isArray(window.ethereum?.providers)?window.ethereum.providers:[];
    injected.forEach(provider=>{if(provider?.request&&!list.some(item=>item.provider===provider))list.push({provider,info:{name:providerName(provider),rdns:'legacy-injected'}})});
    if(window.ethereum?.request&&!list.some(item=>item.provider===window.ethereum))list.push({provider:window.ethereum,info:{name:providerName(window.ethereum),rdns:'legacy-window.ethereum'}});
    const pref=readPreference();
    if(pref){
      list.sort((a,b)=>{
        const score=item=>(pref.rdns&&item.info?.rdns===pref.rdns?3:0)+(pref.name&&item.info?.name===pref.name?2:0)+(item.info?.name==='MetaMask'?1:0);
        return score(b)-score(a);
      });
    }else{
      list.sort((a,b)=>(b.info?.name==='MetaMask')-(a.info?.name==='MetaMask'));
    }
    return list;
  };

  const updateUi=(entry,accountValue)=>{
    const normalized=String(accountValue).toLowerCase();
    try{if(typeof account!=='undefined')account=normalized;}catch{}
    try{if(typeof walletProvider!=='undefined')walletProvider=entry.provider;}catch{}
    try{if(typeof walletInfo!=='undefined')walletInfo=entry.info;}catch{}
    window.evoRestoredWallet={account:normalized,wallet:entry.info?.name||providerName(entry.provider),provider:entry.provider};
    const button=document.getElementById('walletBtn');
    if(button)button.textContent=`${safe(entry.info?.name||providerName(entry.provider),24)} ${normalized.slice(0,6)}…${normalized.slice(-4)}`;
    remember(entry,normalized);
    window.dispatchEvent(new CustomEvent('evo:wallet-connected',{detail:{account:normalized,wallet:entry.info?.name||providerName(entry.provider),source:'SESSION_RESTORE',restored:true}}));
  };

  const bind=entry=>{
    const provider=entry.provider;
    if(bound.has(provider)||typeof provider?.on!=='function')return;
    bound.add(provider);
    provider.on('accountsChanged',accounts=>{
      const next=accounts?.[0];
      if(!walletRe.test(String(next||''))){clearAccount();return;}
      updateUi(entry,next);
    });
    provider.on('disconnect',()=>clearAccount());
  };

  const restore=async()=>{
    try{
      if(typeof account!=='undefined'&&walletRe.test(String(account||''))){
        window.dispatchEvent(new CustomEvent('evo:wallet-connected',{detail:{account:String(account).toLowerCase(),wallet:'Wallet EVM',source:'ALREADY_CONNECTED',restored:true}}));
        return true;
      }
    }catch{}

    const providers=await discover();
    const pref=readPreference();
    for(const entry of providers){
      try{
        const accounts=await entry.provider.request({method:'eth_accounts'});
        const candidate=Array.isArray(accounts)?accounts.find(value=>walletRe.test(String(value||''))):null;
        if(!candidate)continue;
        if(pref?.account&&providers.length>1&&String(candidate).toLowerCase()!==String(pref.account).toLowerCase()){
          const preferredExists=providers.some(item=>item!==entry&&(item.info?.rdns===pref.rdns||item.info?.name===pref.name));
          if(preferredExists)continue;
        }
        bind(entry);
        updateUi(entry,candidate);
        return true;
      }catch{}
    }
    return false;
  };

  window.addEventListener('evo:wallet-connected',event=>{
    if(event.detail?.source==='SESSION_RESTORE')return;
    const value=event.detail?.account;
    if(!walletRe.test(String(value||'')))return;
    try{localStorage.setItem(preferenceKey,JSON.stringify({rdns:'',name:event.detail?.wallet||'',account:String(value).toLowerCase()}))}catch{}
  });

  window.evoRestoreWalletSession=restore;
  restore();
  window.addEventListener('load',()=>setTimeout(()=>{try{if(typeof account==='undefined'||!walletRe.test(String(account||'')))restore();}catch{restore();}},250),{once:true});
})();
