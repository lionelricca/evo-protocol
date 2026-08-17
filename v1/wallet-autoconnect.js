(()=>{
  async function silentReconnect(){
    try{
      if(typeof account==='undefined'||account||typeof findMetaMaskProvider!=='function')return;
      const p=await findMetaMaskProvider();
      const accounts=await p.request({method:'eth_accounts'});
      const a=accounts?.[0];if(!a)return;
      walletProvider=p;account=String(a).toLowerCase();
      const btn=document.getElementById('walletBtn');if(btn)btn.textContent=`MetaMask ${account.slice(0,6)}…${account.slice(-4)}`;
      window.dispatchEvent(new CustomEvent('evo:wallet-connected',{detail:{account}}));
    }catch(e){console.warn('EVO silent wallet reconnect unavailable',e)}
  }
  setTimeout(silentReconnect,700);
})();
