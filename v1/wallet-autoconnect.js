// EVO V1: wallet access only after an explicit user click.
// Connecting requests eth_accounts permission from MetaMask. No message is signed here.

connectWallet = async function(){
  walletProvider = await findMetaMaskProvider();

  let accounts = [];
  try{
    await walletProvider.request({
      method:'wallet_requestPermissions',
      params:[{eth_accounts:{}}]
    });
    accounts = await walletProvider.request({method:'eth_accounts'});
  }catch(e){
    if(e?.code===4001 || String(e?.code)==='4001'){
      throw new Error('Autorización de wallet cancelada en MetaMask.');
    }
    // Compatibility fallback if the wallet does not expose wallet_requestPermissions.
    if(e?.code===-32601 || String(e?.code)==='-32601'){
      accounts = await walletProvider.request({method:'eth_requestAccounts'});
    }else{
      throw e;
    }
  }

  if(!accounts?.length){
    accounts = await walletProvider.request({method:'eth_requestAccounts'});
  }
  const a=accounts?.[0];
  if(!a)throw new Error('MetaMask no autorizó ninguna cuenta.');

  account=String(a).toLowerCase();
  const btn=document.getElementById('walletBtn');
  if(btn)btn.textContent=`MetaMask ${account.slice(0,6)}…${account.slice(-4)}`;
  window.dispatchEvent(new CustomEvent('evo:wallet-connected',{detail:{account}}));
  return account;
};

const evoWalletBtn=document.getElementById('walletBtn');
if(evoWalletBtn){
  evoWalletBtn.onclick=async()=>{
    try{
      await connectWallet();
      toast('Wallet autorizada. Conectar no firma mensajes ni mueve fondos.');
    }catch(e){
      toast(e?.message||'Conexión cancelada');
    }
  };
}

console.info('EVO wallet mode',{connect:'EXPLICIT PERMISSION',method:'wallet_requestPermissions -> eth_accounts',automatic:false,signatureOnConnect:false});
