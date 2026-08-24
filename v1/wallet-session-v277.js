'use strict';

// EVO V4.0 · Explicit wallet connection policy
// A page load NEVER activates an injected wallet automatically.
// Wallet/provider preferences may remain stored only to improve the chooser
// after the user presses "Conectar wallet".
(()=>{
  const walletRe=/^0x[0-9a-fA-F]{40}$/;
  const preferenceKey='evo-wallet-preference-v277';

  function disconnectForStartup(){
    try{if(typeof account!=='undefined')account='';}catch{}
    try{if(typeof walletProvider!=='undefined')walletProvider=null;}catch{}
    try{if(typeof walletInfo!=='undefined')walletInfo=null;}catch{}
    try{if(typeof walletAccount!=='undefined')walletAccount=null;}catch{}
    window.evoRestoredWallet=null;
    window.evoWalletAccount=null;
    const button=document.getElementById('walletBtn');
    if(button){
      button.textContent='Conectar wallet';
      button.removeAttribute('title');
      delete button.dataset.issuerId;
    }
    window.dispatchEvent(new CustomEvent('evo:wallet-disconnected',{detail:{source:'STARTUP_EXPLICIT_CONNECT'}}));
  }

  // Keep a non-authoritative preference only after an explicit connection.
  // It may order the wallet/account chooser, but it must never activate a wallet.
  window.addEventListener('evo:wallet-connected',event=>{
    const value=String(event.detail?.account||'').toLowerCase();
    if(!walletRe.test(value))return;
    try{
      localStorage.setItem(preferenceKey,JSON.stringify({
        rdns:event.detail?.rdns||'',
        name:event.detail?.wallet||'',
        account:value,
      }));
    }catch{}
  });

  // Compatibility API: callers may invoke it, but restoration is intentionally disabled.
  window.evoRestoreWalletSession=async()=>{
    disconnectForStartup();
    return false;
  };

  disconnectForStartup();
  window.addEventListener('pageshow',()=>disconnectForStartup(),{once:true});
})();

window.addEventListener('load',()=>{
  if(!document.querySelector('script[data-evo-free-proof-v400]')){
    const script=document.createElement('script');
    script.src='./free-proof-antisybil-v400.js?v=20260823-v400-antisybil';
    script.dataset.evoFreeProofV400='1';
    script.onload=()=>{try{if(typeof account!=='undefined'&&/^0x[0-9a-fA-F]{40}$/.test(String(account||'')))window.evoRefreshEntitlement?.(String(account).toLowerCase())}catch{}};
    document.body.appendChild(script);
  }

  if(!document.querySelector('link[data-evo-seal-review-v400]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='./seal-review-v400.css?v=20260823-v400-review';
    style.dataset.evoSealReviewV400='1';
    document.head.appendChild(style);
  }
  if(!document.querySelector('script[data-evo-seal-review-v400]')){
    const review=document.createElement('script');
    review.src='./seal-review-v400.js?v=20260823-v400-review';
    review.dataset.evoSealReviewV400='1';
    document.body.appendChild(review);
  }

  if(!document.querySelector('link[data-evo-ui-polish-v400]')){
    const polish=document.createElement('link');
    polish.rel='stylesheet';
    polish.href='./ui-polish-v400.css?v=20260823-v400-filepicker';
    polish.dataset.evoUiPolishV400='1';
    document.head.appendChild(polish);
  }

  if(!document.querySelector('script[data-evo-i18n-critical-v400]')){
    const languageAudit=document.createElement('script');
    languageAudit.src='./i18n-critical-v400.js?v=20260823-v400-critical-copy';
    languageAudit.dataset.evoI18nCriticalV400='1';
    document.body.appendChild(languageAudit);
  }
},{once:true});
