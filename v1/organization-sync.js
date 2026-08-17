(()=>{
  let lastAccount='';
  async function syncOrganizationWallet(){
    try{
      if(typeof account==='undefined'||!account||account===lastAccount)return;
      lastAccount=account;
      if(typeof autofillOrganizationFromWallet==='function')await autofillOrganizationFromWallet();
    }catch(e){console.warn('Organization wallet UI sync unavailable',e)}
  }
  const btn=document.getElementById('walletBtn');
  if(btn)btn.addEventListener('click',()=>{setTimeout(syncOrganizationWallet,500);setTimeout(syncOrganizationWallet,1500);setTimeout(syncOrganizationWallet,3000)});
  setInterval(syncOrganizationWallet,1500);
})();
