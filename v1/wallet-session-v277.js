'use strict';

// EVO V1 · explicit wallet connection policy
// Session auto-restore is intentionally disabled.
// A wallet is connected only after the user presses "Conectar wallet".
// The universal connector then requests account permission from the selected EVM wallet.
(()=>{
  window.evoRestoreWalletSession=async()=>false;
  try{window.evoRestoredWallet=null}catch{}
  console.info('EVO wallet session restore disabled: explicit authorization required.');
})();
