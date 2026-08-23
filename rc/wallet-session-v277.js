'use strict';

(()=>{
  const walletRe=/^0x[0-9a-fA-F]{40}$/;
  const preferenceKey='evo-wallet-preference-v277';
  const explicitPreferenceKey='evo-wallet-explicit-v400';
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
  const readJson=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
  const readPreference=()=>readJson(preferenceKey);
  const readExplicitPreference=()=>readJson(explicitPreferenceKey);
  const startupPreference=()=>readExplicitPreference()||readPreference();
  const remember=(entry,accountValue)=>{try{localStorage.setItem(preferenceKey,JSON.stringify({rdns:entry?.info?.rdns||'',name:entry?.info?.name||providerName(entry?.provider),account:String(accountValue||'').toLowerCase()}))}catch{}};
  const normalizeAccounts=accounts=>[...new Set((Array.isArray(accounts)?accounts:[]).map(value=>String(value||'').toLowerCase()).filter(value=>walletRe.test(value)))];
  const clearAccount=()=>{
    try{if(typeof account!=='undefined')account='';}catch{}
    try{if(typeof walletProvider!=='undefined')walletProvider=null;}catch{}
    try{if(typeof walletInfo!=='undefined')walletInfo=null;}catch{}
    window.evoRestoredWallet=null;
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
    const pref=startupPreference();
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
    window.dispatchEvent(new CustomEvent('evo:wallet-connected',{detail:{account:normalized,wallet:entry.info?.name||providerName(entry.provider),rdns:entry.info?.rdns||'',source:'SESSION_RESTORE',restored:true}}));
  };

  const silentCandidate=(accounts,pref)=>{
    const valid=normalizeAccounts(accounts);
    if(!valid.length)return null;
    const preferred=String(pref?.account||'').toLowerCase();
    if(preferred&&valid.includes(preferred))return preferred;
    if(preferred)return null;
    return valid.length===1?valid[0]:null;
  };

  const bind=entry=>{
    const provider=entry.provider;
    if(bound.has(provider)||typeof provider?.on!=='function')return;
    bound.add(provider);
    provider.on('accountsChanged',accounts=>{
      const valid=normalizeAccounts(accounts);
      if(!valid.length){clearAccount();return;}
      const pref=startupPreference();const preferred=String(pref?.account||'').toLowerCase();
      let current='';try{current=String(typeof account!=='undefined'?account:'').toLowerCase()}catch{}
      const next=(preferred&&valid.includes(preferred))?preferred:(preferred?null:(valid.length===1?valid[0]:(current&&valid.includes(current)?current:null)));
      if(!next){clearAccount();return;}
      updateUi(entry,next);
    });
    provider.on('disconnect',()=>clearAccount());
  };

  const restore=async()=>{
    const pref=startupPreference();
    try{
      const existing=String(typeof account!=='undefined'?account:'').toLowerCase();
      const preferred=String(pref?.account||'').toLowerCase();
      if(walletRe.test(existing)&&(!preferred||existing===preferred)){
        window.dispatchEvent(new CustomEvent('evo:wallet-connected',{detail:{account:existing,wallet:'Wallet EVM',source:'ALREADY_CONNECTED',restored:true}}));
        return true;
      }
    }catch{}

    const providers=await discover();
    for(const entry of providers){
      try{
        const accounts=await entry.provider.request({method:'eth_accounts'});
        const candidate=silentCandidate(accounts,pref);
        if(!candidate)continue;
        bind(entry);
        updateUi(entry,candidate);
        return true;
      }catch{}
    }
    clearAccount();
    return false;
  };

  window.addEventListener('evo:wallet-connected',event=>{
    if(event.detail?.source==='SESSION_RESTORE')return;
    const value=event.detail?.account;
    if(!walletRe.test(String(value||'')))return;
    try{localStorage.setItem(preferenceKey,JSON.stringify({rdns:event.detail?.rdns||'',name:event.detail?.wallet||'',account:String(value).toLowerCase()}))}catch{}
  });

  window.evoRestoreWalletSession=restore;
  restore();
  window.addEventListener('load',()=>setTimeout(()=>{try{if(typeof account==='undefined'||!walletRe.test(String(account||'')))restore();}catch{restore();}},250),{once:true});
})();

window.addEventListener('load',()=>{
  if(document.querySelector('script[data-evo-free-proof-v400]'))return;
  const script=document.createElement('script');
  script.src='./free-proof-antisybil-v400.js?v=20260823-v400-antisybil';
  script.dataset.evoFreeProofV400='1';
  script.onload=()=>{try{if(typeof account!=='undefined'&&/^0x[0-9a-fA-F]{40}$/.test(String(account||'')))window.evoRefreshEntitlement?.(String(account).toLowerCase())}catch{}};
  document.body.appendChild(script);
},{once:true});
