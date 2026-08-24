// EVO V4.0 RC · Secure multi-wallet connector
// - Explicit user action only
// - EIP-6963 discovery first
// - User chooses the provider when multiple wallets are installed
// - User chooses the account when one provider exposes multiple accounts
// - Re-selecting a connected wallet requests a fresh account permission
// - Explicit account choice is authoritative for silent startup restore
// - Address + chain are resolved ephemerally on simple connect
// - Persistent EVO identity requires a signed/proven EVO action
// - NO personal_sign, NO transaction, NO token approval during connect

(()=>{
  const isProvider=p=>!!p&&typeof p.request==='function';
  const WALLET_REGISTER_URL=`${SUPABASE_URL}/functions/v1/register-evo-wallet`;
  const preferenceKey='evo-wallet-preference-v277';
  const explicitPreferenceKey='evo-wallet-explicit-v400';
  const walletRe=/^0x[0-9a-fA-F]{40}$/;
  let boundProvider=null;
  let walletAccount=null;

  function safeText(v,max=80){return String(v||'Wallet').replace(/[<>]/g,'').trim().slice(0,max)||'Wallet'}
  function readPreference(){try{return JSON.parse(localStorage.getItem(preferenceKey)||'null')}catch{return null}}
  function preferencePayload(entry,accountValue){return {rdns:entry?.info?.rdns||'',name:entry?.info?.name||'Wallet EVM',account:String(accountValue||'').toLowerCase()}}
  function rememberPreference(entry,accountValue){try{localStorage.setItem(preferenceKey,JSON.stringify(preferencePayload(entry,accountValue)))}catch{}}
  function rememberExplicitPreference(entry,accountValue){try{localStorage.setItem(explicitPreferenceKey,JSON.stringify(preferencePayload(entry,accountValue)))}catch{}}
  function normalizeAccounts(accounts){
    return [...new Set((Array.isArray(accounts)?accounts:[]).map(value=>String(value||'').toLowerCase()).filter(value=>walletRe.test(value)))];
  }
  function resetWalletUi(message='Conectar wallet'){
    account='';walletProvider=null;walletInfo=null;walletAccount=null;window.evoWalletAccount=null;
    const btn=document.getElementById('walletBtn');if(btn){btn.textContent=message;btn.removeAttribute('title');delete btn.dataset.issuerId}
    window.dispatchEvent(new CustomEvent('evo:wallet-disconnected'));
  }

  async function registerWalletAccount(provider,displayName='Wallet EVM'){
    const issuerWallet=String(account||'').toLowerCase();
    if(!/^0x[0-9a-f]{40}$/.test(issuerWallet))throw new Error('La wallet conectada no es válida.');
    const chainId=String(await provider.request({method:'eth_chainId'})).toLowerCase();
    if(!/^0x[0-9a-f]+$/.test(chainId))throw new Error('La red EVM no devolvió un chain ID válido.');
    const r=await fetch(WALLET_REGISTER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({issuerWallet,chainId})});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok||!data?.account)throw new Error(data?.error||`No se pudo resolver la identidad EVO (${r.status})`);
    walletAccount={...data.account,persisted:Boolean(data.persisted),registration_mode:String(data.registrationMode||'')};window.evoWalletAccount=walletAccount;
    const btn=document.getElementById('walletBtn');
    if(btn){
      btn.dataset.issuerId=walletAccount.issuer_id||'';
      const state=walletAccount.persisted?'Identidad EVO persistida':'Identidad provisional · se persiste sólo con prueba firmada';
      btn.title=`EVO Issuer ID: ${walletAccount.issuer_id||'N/A'}\nRed: ${walletAccount.last_chain_id||chainId}\nEstado: ${state}`;
    }
    window.dispatchEvent(new CustomEvent('evo:wallet-registered',{detail:{...walletAccount,wallet:displayName}}));
    return walletAccount;
  }

  async function registerWalletAccountSafely(provider,displayName){
    try{return await registerWalletAccount(provider,displayName)}catch(e){console.error('EVO wallet identity resolution',e);window.dispatchEvent(new CustomEvent('evo:wallet-registration-error',{detail:{message:e?.message||String(e)}}));return null}
  }

  async function discoverWallets(){
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    await sleep(350);
    const seen=new Set(),wallets=[];
    for(const d of discoveredProviders){
      if(!d?.provider||!isProvider(d.provider))continue;
      const uuid=String(d.info?.uuid||'');
      if(uuid&&seen.has(uuid))continue;
      if(uuid)seen.add(uuid);
      wallets.push({provider:d.provider,info:{uuid,name:safeText(d.info?.name),rdns:safeText(d.info?.rdns,120)},source:'EIP-6963'});
    }
    if(wallets.length)return wallets;

    const legacy=[],injected=Array.isArray(window.ethereum?.providers)?window.ethereum.providers:[];
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

  function ensurePicker(id,title,subtitle){
    let dlg=document.getElementById(id);
    if(!dlg){
      dlg=document.createElement('dialog');dlg.id=id;
      dlg.innerHTML=`<div class="evoWalletPickerInner"><div class="evoWalletPickerHead"><div><h3></h3><p></p></div><button class="evoWalletClose" type="button" aria-label="Cerrar">×</button></div><div class="evoWalletList"></div><div class="evoWalletSafety">Conectar una wallet no firma mensajes, no aprueba tokens y no mueve EVO, POL ni otros fondos. La conexión sola tampoco crea una identidad persistente.</div></div>`;
      document.body.appendChild(dlg);dlg.querySelector('.evoWalletClose').onclick=()=>dlg.close('cancel');
    }
    dlg.querySelector('h3').textContent=title;dlg.querySelector('.evoWalletPickerHead p').textContent=subtitle;
    return dlg;
  }

  function chooseWallet(wallets){
    if(wallets.length===1)return Promise.resolve(wallets[0]);
    const dlg=ensurePicker('evoWalletPicker','Elegí tu wallet','EVO sólo solicitará permiso para ver la cuenta pública.'),list=dlg.querySelector('.evoWalletList');list.innerHTML='';
    return new Promise((resolve,reject)=>{
      let settled=false;const finish=(value,err)=>{if(settled)return;settled=true;dlg.close();err?reject(err):resolve(value)};
      wallets.forEach(w=>{const b=document.createElement('button');b.type='button';b.className='evoWalletChoice';const name=document.createElement('b');name.textContent=w.info.name;const meta=document.createElement('small');meta.textContent=w.source==='EIP-6963'?(w.info.rdns||'EIP-6963'):'Compatibilidad heredada';b.append(name,meta);b.onclick=()=>finish(w);list.appendChild(b)});
      dlg.onclose=()=>{if(!settled){settled=true;reject(new Error('Selección de wallet cancelada.'))}};dlg.showModal();
    });
  }

  function chooseAccount(entry,accounts){
    const valid=normalizeAccounts(accounts);
    if(!valid.length)return Promise.reject(new Error('La wallet no devolvió una cuenta EVM válida.'));
    if(valid.length===1)return Promise.resolve(valid[0]);
    const dlg=ensurePicker('evoAccountPicker','Elegí la cuenta','MetaMask autorizó más de una cuenta. Elegí cuál querés usar en EVO.'),list=dlg.querySelector('.evoWalletList');list.innerHTML='';
    const pref=readPreference();
    return new Promise((resolve,reject)=>{
      let settled=false;const finish=(value,err)=>{if(settled)return;settled=true;dlg.close();err?reject(err):resolve(value)};
      valid.forEach(value=>{
        const b=document.createElement('button');b.type='button';b.className='evoWalletChoice';
        const name=document.createElement('b');name.textContent=`${safeText(entry.info?.name,24)} ${value.slice(0,6)}…${value.slice(-4)}`;
        const meta=document.createElement('small');meta.textContent=`${value}${String(pref?.account||'').toLowerCase()===value?' · última usada en EVO':''}`;
        b.append(name,meta);b.onclick=()=>finish(value);list.appendChild(b);
      });
      dlg.onclose=()=>{if(!settled){settled=true;reject(new Error('Selección de cuenta cancelada.'))}};dlg.showModal();
    });
  }

  function unsupportedMethod(error){
    if(error?.code===-32601||String(error?.code)==='-32601')return true;
    const msg=String(error?.message||'').toLowerCase();
    return msg.includes('unsupported')||msg.includes('not supported')||msg.includes('method not found');
  }

  async function revokeAccountPermission(provider){
    try{
      await provider.request({method:'wallet_revokePermissions',params:[{eth_accounts:{}}]});
      return true;
    }catch(error){
      if(unsupportedMethod(error))return false;
      console.warn('EVO could not revoke account permission before re-selection',error);
      return false;
    }
  }

  async function requestAccounts(provider,{forceReselect=false}={}){
    if(forceReselect){
      await revokeAccountPermission(provider);
      const fresh=normalizeAccounts(await provider.request({method:'eth_requestAccounts'}));
      if(fresh.length)return fresh;
    }
    try{
      await provider.request({method:'wallet_requestPermissions',params:[{eth_accounts:{}}]});
      const granted=normalizeAccounts(await provider.request({method:'eth_accounts'}));if(granted.length)return granted;
    }catch(e){
      if(e?.code===4001||String(e?.code)==='4001')throw new Error('Autorización cancelada en la wallet.');
      if(!unsupportedMethod(e))throw e;
    }
    return normalizeAccounts(await provider.request({method:'eth_requestAccounts'}));
  }

  function setActiveAccount(entry,accountValue,detail={}){
    const normalized=String(accountValue||'').toLowerCase();
    if(!walletRe.test(normalized))throw new Error('La cuenta seleccionada no es válida.');
    walletProvider=entry.provider;walletInfo=entry.info;account=normalized;walletAccount=null;window.evoWalletAccount=null;
    rememberPreference(entry,normalized);
    if(detail.explicit)rememberExplicitPreference(entry,normalized);
    const btn=document.getElementById('walletBtn');if(btn)btn.textContent=`${safeText(entry.info?.name,24)} ${normalized.slice(0,6)}…${normalized.slice(-4)}`;
    window.dispatchEvent(new CustomEvent('evo:wallet-connected',{detail:{account:normalized,wallet:entry.info?.name||'Wallet EVM',rdns:entry.info?.rdns||'',...detail}}));
    return normalized;
  }

  function bindProvider(entry){
    const provider=entry.provider,displayName=entry.info?.name||'Wallet EVM';
    if(boundProvider===provider||typeof provider?.on!=='function')return;
    boundProvider=provider;
    provider.on('accountsChanged',accounts=>{
      const valid=normalizeAccounts(accounts);
      if(!valid.length){resetWalletUi();return}
      const pref=readPreference();const preferred=String(pref?.account||'').toLowerCase();const current=String(account||'').toLowerCase();
      let next='';
      if(preferred&&valid.includes(preferred))next=preferred;
      else if(valid.length===1)next=valid[0];
      else if(current&&valid.includes(current))next=current;
      if(!next){resetWalletUi('Seleccionar cuenta');toast('Hay varias cuentas autorizadas. Elegí cuál usar desde EVO.');return}
      setActiveAccount(entry,next,{changed:true,source:'ACCOUNTS_CHANGED'});
      registerWalletAccountSafely(provider,displayName);
    });
    provider.on('chainChanged',()=>{if(account)registerWalletAccountSafely(provider,displayName)});
    provider.on('disconnect',()=>{resetWalletUi();toast('Wallet desconectada.')});
  }

  window.evoConnectWallet=async function(options={}){
    const forceReselect=Boolean(options?.forceReselect);
    const wallets=await discoverWallets();if(!wallets.length)throw new Error('No se detectó ninguna wallet EVM compatible.');
    let selected=null;
    if(forceReselect&&walletProvider){selected=wallets.find(item=>item.provider===walletProvider)||null;}
    if(!selected)selected=await chooseWallet(wallets);
    const accounts=await requestAccounts(selected.provider,{forceReselect});
    const chosen=await chooseAccount(selected,accounts);
    bindProvider(selected);
    const active=setActiveAccount(selected,chosen,{source:forceReselect?'ACCOUNT_RESELECT':selected.source,explicit:true});
    await registerWalletAccountSafely(selected.provider,selected.info.name);
    return active;
  };

  window.evoGetWalletAccount=()=>walletAccount;

  connectWallet=window.evoConnectWallet;
  const btn=document.getElementById('walletBtn');if(btn)btn.onclick=async()=>{try{
    const connected=walletRe.test(String(account||''));
    if(connected)toast('Elegí nuevamente la cuenta que querés usar en MetaMask.');
    await window.evoConnectWallet({forceReselect:connected});
    const a=window.evoWalletAccount;
    toast(a?.persisted?`Identidad EVO confirmada · ${a.issuer_id||''}`:'Wallet conectada · la identidad persistente se crea sólo con una prueba EVO firmada.');
  }catch(e){toast(e?.message||'Conexión cancelada')}};
  console.info('EVO wallet security',{discovery:'EIP-6963 FIRST',selection:'PROVIDER + ACCOUNT USER CONTROLLED',reselection:'EXPLICIT PERMISSION REFRESH',startupPreference:'EXPLICIT ACCOUNT AUTHORITATIVE',legacy:'FALLBACK ONLY',connect:'ACCOUNT PERMISSION + EPHEMERAL IDENTITY RESOLUTION',persistence:'SIGNED/PROVEN ACTION ONLY',accountChanges:'TRACKED',chainChanges:'TRACKED',signOnConnect:false,transactionsOnConnect:false});
})();
