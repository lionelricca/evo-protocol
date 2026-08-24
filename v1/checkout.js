'use strict';

const EVO_CHECKOUT_URL = SUPABASE_URL + '/functions/v1/evo-checkout';
const EVO_MERCHANT_WALLET = '0xDC6740245e026A19ea9EE2B62968ea8aeFFEAb16';
const EVO_PAYMENT_NETWORKS = {
  '137': { name:'Polygon', depay:'polygon', usdc:'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
  '8453': { name:'Base', depay:'base', usdc:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  '42161': { name:'Arbitrum', depay:'arbitrum', usdc:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  '10': { name:'Optimism', depay:'optimism', usdc:'0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
  '43114': { name:'Avalanche', depay:'avalanche', usdc:'0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' },
  '1': { name:'Ethereum', depay:'ethereum', usdc:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }
};
const EVO_PAYMENT_PLANS = {
  INDIVIDUAL: { label:'1 EVO Proof', amountLabel:'US$9,90', amountUsdc:'9.90', amountMinor:9900000n },
  PACK_10: { label:'10 EVO Proofs', amountLabel:'US$49', amountUsdc:'49', amountMinor:49000000n }
};
const EVO_PENDING_PAYMENT_KEY = 'evo_pending_payment_v1';
const EVO_TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const EVO_DEPAY_SCRIPT = 'https://sdk.depay.com/widgets/v13.0.45.js';
const EVO_VERIFYING_TXS = new Set();
const EVO_DEPAY_CHAIN_IDS = Object.fromEntries(Object.entries(EVO_PAYMENT_NETWORKS).map(([chainId, network]) => [network.depay, chainId]));

function checkoutText(es, en) {
  return document.documentElement.lang === 'en' ? en : es;
}
function proofQuantity(count) {
  const value = Math.max(0, Number(count) || 0);
  return value + ' EVO Proof' + (value === 1 ? '' : 's');
}
function checkoutStatus(message, kind) {
  const box = document.getElementById('checkoutStatus');
  if (!box) return;
  box.className = kind === 'ok' ? 'passportNotice ok' : 'passportNotice';
  box.textContent = window.evoT ? window.evoT(message) : message;
}
function checkoutNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
}
function ensureProofBalanceUi() {
  if (document.getElementById('proofWalletCard')) return;
  const panel = document.querySelector('.paymentPanel');
  const status = document.getElementById('checkoutStatus');
  if (!panel || !status) return;
  const card = document.createElement('div');
  card.id = 'proofWalletCard';
  card.className = 'proofWalletCard';
  card.innerHTML = `<div class="proofWalletHead"><span class="kicker">EVO PROOF WALLET</span><strong id="proofWalletState">NO WALLET</strong></div><div class="proofWalletStats"><div class="proofWalletStat"><span id="proofFreeLabel">Free Proof</span><b id="proofBalanceFree">—</b></div><div class="proofWalletStat"><span id="proofPurchasedLabel">Comprados</span><b id="proofBalancePurchased">—</b></div><div class="proofWalletStat"><span id="proofUsedLabel">Usados</span><b id="proofBalanceUsed">—</b></div><div class="proofWalletStat"><span id="proofAvailableLabel">Disponibles</span><b id="creditBalanceValue">—</b></div></div><p id="creditBalanceDetail" class="proofWalletDetail">Conectá tu wallet para comprobar tu Free Proof.</p><div class="actions"><button id="proofRevealBalanceBtn" class="btn" type="button">Ver saldo privado</button></div>`;
  panel.insertBefore(card, status);
  const reveal = document.getElementById('proofRevealBalanceBtn');
  if (reveal) reveal.addEventListener('click', () => revealPrivateEvoBalance().catch(error => checkoutStatus(error && error.message ? error.message : checkoutText('No se pudo leer el saldo privado.', 'Could not read the private balance.'))));
  updateProofBalanceLabels();
}
function updateProofBalanceLabels() {
  const en = document.documentElement.lang === 'en';
  const state = document.getElementById('proofWalletState');
  const purchased = document.getElementById('proofPurchasedLabel');
  const used = document.getElementById('proofUsedLabel');
  const available = document.getElementById('proofAvailableLabel');
  const reveal = document.getElementById('proofRevealBalanceBtn');
  if (state && !account) state.textContent = en ? 'NO WALLET' : 'SIN WALLET';
  if (purchased) purchased.textContent = en ? 'Purchased' : 'Comprados';
  if (used) used.textContent = en ? 'Used' : 'Usados';
  if (available) available.textContent = en ? 'Available' : 'Disponibles';
  if (reveal && window.evoEntitlement?.privacy !== 'SIGNED_PRIVATE_BALANCE') reveal.textContent = en ? 'View private balance' : 'Ver saldo privado';
}
function clearExactBalanceUi() {
  const purchased = document.getElementById('proofBalancePurchased');
  const used = document.getElementById('proofBalanceUsed');
  const available = document.getElementById('creditBalanceValue');
  if (purchased) purchased.textContent = checkoutText('PRIVADO', 'PRIVATE');
  if (used) used.textContent = checkoutText('PRIVADO', 'PRIVATE');
  if (available) available.textContent = checkoutText('PRIVADO', 'PRIVATE');
}
function renderPlanEntitlement(data) {
  const status = document.getElementById('demoPlanStatus');
  const value = document.getElementById('demoPlanValue');
  const action = document.getElementById('demoPlanAction');
  if (!status || !value || !action) return;
  if (data.demoAvailable) {
    value.textContent = checkoutText('Gratis disponible', 'Free available');
    status.className = 'passportNotice ok';
    status.textContent = checkoutText('Esta wallet todavía tiene su único Free Proof.', 'This wallet still has its one Free Proof.');
    action.textContent = checkoutText('Crear mi Passport gratis', 'Create my free Passport');
    action.href = '#seal';
    return;
  }
  value.textContent = checkoutText('Gratis ya usado', 'Free already used');
  status.className = 'passportNotice';
  if (data.canCreate) {
    status.textContent = checkoutText('Esta wallet puede crear otro Passport. La cantidad exacta de EVO Proofs es privada.', 'This wallet can create another Passport. The exact EVO Proof balance is private.');
    action.textContent = checkoutText('Usar mi Proof', 'Use my Proof');
    action.href = '#seal';
  } else {
    status.textContent = checkoutText('Para crear otro Passport necesitás 1 EVO Proof.', 'To create another Passport you need 1 EVO Proof.');
    action.textContent = checkoutText('Comprar Proof', 'Buy Proof');
    action.href = '#pricing';
  }
}
function renderPublicEntitlement(data) {
  ensureProofBalanceUi();
  renderPlanEntitlement(data);
  const free = document.getElementById('proofBalanceFree');
  const state = document.getElementById('proofWalletState');
  const detail = document.getElementById('creditBalanceDetail');
  const reveal = document.getElementById('proofRevealBalanceBtn');
  if (free) free.textContent = data.demoAvailable ? checkoutText('Disponible', 'Available') : checkoutText('Usado', 'Used');
  clearExactBalanceUi();
  if (state) state.textContent = checkoutText('RESUMEN PÚBLICO', 'PUBLIC SUMMARY');
  if (detail) detail.textContent = data.demoAvailable
    ? checkoutText('Tu Free Proof está disponible. El saldo comprado/usado es privado y requiere una firma de lectura.', 'Your Free Proof is available. Purchased/used balance is private and requires a read signature.')
    : data.canCreate
      ? checkoutText('Podés crear otro Passport. La cantidad exacta de EVO Proofs sólo se muestra después de firmar una solicitud de lectura.', 'You can create another Passport. The exact EVO Proof balance is shown only after signing a read request.')
      : checkoutText('No hay un Proof disponible para crear otro Passport. Los contadores exactos siguen siendo privados.', 'No Proof is available to create another Passport. Exact counters remain private.');
  if (reveal) {
    reveal.disabled = false;
    reveal.textContent = checkoutText('Ver saldo privado', 'View private balance');
  }
  window.evoEntitlement = data;
  if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') window.dispatchEvent(new CustomEvent('evo:entitlement-updated', { detail:data }));
  return data;
}
function renderPrivateEvoBalance(data) {
  ensureProofBalanceUi();
  renderPlanEntitlement(data);
  const free = document.getElementById('proofBalanceFree');
  const purchased = document.getElementById('proofBalancePurchased');
  const used = document.getElementById('proofBalanceUsed');
  const available = document.getElementById('creditBalanceValue');
  const state = document.getElementById('proofWalletState');
  const detail = document.getElementById('creditBalanceDetail');
  const reveal = document.getElementById('proofRevealBalanceBtn');
  if (free) free.textContent = data.demoAvailable ? checkoutText('Disponible', 'Available') : checkoutText('Usado', 'Used');
  if (purchased) purchased.textContent = String(Number(data.purchasedCredits || 0));
  if (used) used.textContent = String(Number(data.consumedCredits || 0));
  if (available) available.textContent = String(Number(data.remainingCredits || 0));
  if (state) state.textContent = checkoutText('SALDO PRIVADO VERIFICADO', 'VERIFIED PRIVATE BALANCE');
  if (detail) detail.textContent = Number(data.remainingCredits || 0) > 0
    ? checkoutText(`${proofQuantity(data.remainingCredits)} listo(s) para crear nuevos Passports. La lectura fue autorizada por tu firma.`, `${proofQuantity(data.remainingCredits)} ready to create new Passports. This read was authorized by your signature.`)
    : data.demoAvailable
      ? checkoutText('Tu Free Proof sigue disponible. La lectura exacta fue autorizada por tu firma.', 'Your Free Proof is still available. The exact read was authorized by your signature.')
      : checkoutText('No tenés EVO Proofs disponibles. La lectura exacta fue autorizada por tu firma.', 'You have no EVO Proofs available. The exact read was authorized by your signature.');
  if (reveal) {
    reveal.disabled = false;
    reveal.textContent = checkoutText('Actualizar saldo privado', 'Refresh private balance');
  }
  window.evoEntitlement = data;
  if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') window.dispatchEvent(new CustomEvent('evo:entitlement-updated', { detail:data }));
  return data;
}
async function fetchEvoEntitlement(wallet) {
  const normalizedWallet = String(wallet || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(normalizedWallet)) throw new Error(checkoutText('Wallet inválida.', 'Invalid wallet.'));
  const response = await fetch(EVO_CHECKOUT_URL, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ action:'status', wallet:normalizedWallet })
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.error || checkoutText('No se pudo consultar el beneficio.', 'Could not check the entitlement.'));
  return data;
}
async function fetchPrivateEvoBalance(wallet) {
  if (!account || !walletProvider) await connectWallet();
  const normalizedWallet = String(wallet || account || '').toLowerCase();
  const connectedWallet = String(account || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(normalizedWallet) || normalizedWallet !== connectedWallet) throw new Error(checkoutText('Conectá la misma wallet cuyo saldo querés consultar.', 'Connect the same wallet whose balance you want to read.'));
  const origin = location.origin;
  if (!/^https:\/\//i.test(origin) && !/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin)) throw new Error(checkoutText('El saldo privado requiere un origen web seguro.', 'Private balance requires a secure web origin.'));
  const nonce = checkoutNonce();
  const signedAt = new Date().toISOString();
  const signatureMessage = `EVO CHECKOUT BALANCE V1\nWallet: ${normalizedWallet}\nOrigin: ${origin}\nNonce: ${nonce}\nSigned: ${signedAt}`;
  toast(checkoutText('Firmá para ver tu saldo exacto. No es una transacción y no mueve fondos.', 'Sign to view your exact balance. This is not a transaction and moves no funds.'));
  const signature = await walletProvider.request({ method:'personal_sign', params:[signatureMessage, account] });
  const response = await fetch(EVO_CHECKOUT_URL, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ action:'balance', wallet:normalizedWallet, origin, nonce, signedAt, signature, signatureMessage })
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.error || checkoutText('No se pudo leer el saldo privado.', 'Could not read the private balance.'));
  return data;
}
async function refreshEvoEntitlement(wallet) {
  const data = await fetchEvoEntitlement(wallet || account || '');
  return renderPublicEntitlement(data);
}
async function revealPrivateEvoBalance(wallet) {
  ensureProofBalanceUi();
  const reveal = document.getElementById('proofRevealBalanceBtn');
  if (reveal) {
    reveal.disabled = true;
    reveal.textContent = checkoutText('Esperando firma…', 'Waiting for signature…');
  }
  try {
    const data = await fetchPrivateEvoBalance(wallet || account || '');
    checkoutStatus(checkoutText('Saldo exacto verificado mediante firma de tu wallet.', 'Exact balance verified with your wallet signature.'), 'ok');
    return renderPrivateEvoBalance(data);
  } finally {
    if (reveal && window.evoEntitlement?.privacy !== 'SIGNED_PRIVATE_BALANCE') {
      reveal.disabled = false;
      reveal.textContent = checkoutText('Ver saldo privado', 'View private balance');
    }
  }
}
window.evoRefreshEntitlement = refreshEvoEntitlement;
window.evoRefreshPrivateBalance = revealPrivateEvoBalance;

function savePendingPayment(payment) {
  try { localStorage.setItem(EVO_PENDING_PAYMENT_KEY, JSON.stringify(payment)); } catch {}
}
function readPendingPayment() {
  try {
    const payment = JSON.parse(localStorage.getItem(EVO_PENDING_PAYMENT_KEY) || 'null');
    if (!payment || !EVO_TX_HASH_RE.test(String(payment.txHash || ''))) return null;
    if (!EVO_PAYMENT_PLANS[payment.planCode] || !EVO_PAYMENT_NETWORKS[String(payment.chainId)]) return null;
    return payment;
  } catch { return null; }
}
function clearPendingPayment(txHash) {
  try {
    const payment = readPendingPayment();
    if (!payment || String(payment.txHash).toLowerCase() === String(txHash).toLowerCase()) localStorage.removeItem(EVO_PENDING_PAYMENT_KEY);
  } catch {}
}
function recoveryStatus(message, kind) {
  const box = document.getElementById('recoveryStatus');
  if (!box) return;
  box.className = kind === 'ok' ? 'result ok' : 'result';
  box.textContent = message;
}
function loadDePayWidgets() {
  if (window.DePayWidgets) return Promise.resolve(window.DePayWidgets);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-evo-depay]');
    if (existing) {
      existing.addEventListener('load', () => window.DePayWidgets ? resolve(window.DePayWidgets) : reject(new Error('depay_unavailable')), { once:true });
      existing.addEventListener('error', () => reject(new Error('depay_unavailable')), { once:true });
      return;
    }
    const script = document.createElement('script');
    script.src = EVO_DEPAY_SCRIPT;
    script.async = true;
    script.dataset.evoDepay = 'true';
    script.onload = () => window.DePayWidgets ? resolve(window.DePayWidgets) : reject(new Error('depay_unavailable'));
    script.onerror = () => reject(new Error('depay_unavailable'));
    document.head.appendChild(script);
  });
}
async function verifyCheckout(txHash, planCode, payerWallet, chainId) {
  for (let attempt = 0; attempt < 48; attempt += 1) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, 5000));
    let response;
    try {
      response = await fetch(EVO_CHECKOUT_URL, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ action:'verify', txHash, planCode, payerWallet, chainId:Number(chainId) })
      });
    } catch {
      checkoutStatus(checkoutText('La red de verificación está temporalmente ocupada. Reintentando…', 'The verification network is temporarily busy. Retrying…'));
      continue;
    }
    let data = {};
    try { data = await response.json(); } catch {}
    if (response.status === 202 || response.status === 503) {
      const progress = data.confirmations !== undefined ? ' (' + data.confirmations + '/' + data.requiredConfirmations + ' confirmaciones)' : '';
      checkoutStatus(checkoutText('Pago enviado. Esperando confirmación segura', 'Payment sent. Waiting for secure confirmation') + progress + '…');
      continue;
    }
    if (!response.ok) throw new Error(data.reason || data.error || checkoutText('No se pudo verificar el pago.', 'The payment could not be verified.'));
    return data;
  }
  throw new Error(checkoutText('El pago sigue pendiente. Guardá el hash: ', 'The payment is still pending. Save the hash: ') + txHash + checkoutText('. EVO puede verificarlo nuevamente.', '. EVO can verify it again.'));
}
function paymentDetails(transaction, planCode) {
  const txHash = String(transaction && transaction.id || '').toLowerCase();
  const payerWallet = String(transaction && transaction.from || '').toLowerCase();
  const chainId = EVO_DEPAY_CHAIN_IDS[String(transaction && transaction.blockchain || '').toLowerCase()];
  if (!EVO_TX_HASH_RE.test(txHash) || !/^0x[0-9a-f]{40}$/.test(payerWallet) || !chainId) return null;
  return { txHash, payerWallet, chainId, planCode };
}
async function processSmartPayment(transaction, planCode, verifyNow) {
  const payment = paymentDetails(transaction, planCode);
  if (!payment) {
    checkoutStatus(checkoutText('El pago fue enviado, pero faltan datos para acreditarlo automáticamente. Conservá el hash y usá Recuperar pago.', 'The payment was sent, but some data is missing for automatic crediting. Keep the hash and use Recover payment.'));
    return;
  }
  savePendingPayment({ ...payment, createdAt:new Date().toISOString() });
  if (!verifyNow || EVO_VERIFYING_TXS.has(payment.txHash)) {
    checkoutStatus(checkoutText('Pago enviado. EVO esperará la confirmación de la red.', 'Payment sent. EVO will wait for network confirmation.'));
    return;
  }
  EVO_VERIFYING_TXS.add(payment.txHash);
  try {
    checkoutStatus(checkoutText('Pago confirmado por la wallet. EVO está verificando la liquidación en USDC.', 'Payment confirmed by the wallet. EVO is verifying the USDC settlement.'));
    const result = await verifyCheckout(payment.txHash, planCode, payment.payerWallet, payment.chainId);
    clearPendingPayment(payment.txHash);
    const message = result.applied
      ? checkoutText(`Pago verificado. Se acreditó el plan de ${proofQuantity(result.planCredits)}. Tu saldo exacto sigue privado.`, `Payment verified. The ${proofQuantity(result.planCredits)} plan was credited. Your exact balance remains private.`)
      : checkoutText(`Pago ya verificado. El plan de ${proofQuantity(result.planCredits)} ya estaba acreditado.`, `Payment already verified. The ${proofQuantity(result.planCredits)} plan was already credited.`);
    checkoutStatus(message, 'ok');
    await refreshEvoEntitlement(payment.payerWallet);
  } finally {
    EVO_VERIFYING_TXS.delete(payment.txHash);
  }
}
async function buyEvoPlan(planCode) {
  const plan = EVO_PAYMENT_PLANS[planCode];
  if (!plan) throw new Error(checkoutText('Plan no disponible.', 'Plan unavailable.'));
  checkoutStatus(checkoutText('Preparando las opciones disponibles en tu wallet…', 'Preparing the options available in your wallet…'));
  const widgets = await loadDePayWidgets();
  const accept = Object.values(EVO_PAYMENT_NETWORKS).map(network => ({
    blockchain:network.depay,
    amount:plan.amountUsdc,
    token:network.usdc,
    receiver:EVO_MERCHANT_WALLET
  }));
  await widgets.Payment({
    accept,
    currency:'USD',
    title:plan.label,
    wallets:{ sort:['MetaMask'] },
    style:{
      colors:{ primary:'#73e6ff', text:'#dff9ff', buttonText:'#061018', icons:'#c493ff' },
      colorsDarkMode:{ primary:'#73e6ff', text:'#f4f8ff', buttonText:'#061018', icons:'#c493ff' }
    },
    sent:transaction => { processSmartPayment(transaction, planCode, false).catch(() => {}); },
    succeeded:transaction => { processSmartPayment(transaction, planCode, true).catch(error => checkoutStatus(error && error.message ? error.message : checkoutText('No se pudo acreditar el pago todavía. Usá Recuperar pago.', 'The payment could not be credited yet. Use Recover payment.'))); },
    critical:() => checkoutStatus(checkoutText('El selector de pagos no está disponible temporalmente. No se realizó ningún cobro.', 'The payment selector is temporarily unavailable. No charge was made.'))
  });
}
async function recoverEvoPayment() {
  const txInput = document.getElementById('recoveryTxHash');
  const planInput = document.getElementById('recoveryPlan');
  const networkInput = document.getElementById('recoveryNetwork');
  const txHash = String(txInput && txInput.value || '').trim().toLowerCase();
  const planCode = String(planInput && planInput.value || '').toUpperCase();
  const chainId = String(networkInput && networkInput.value || '');
  if (!EVO_TX_HASH_RE.test(txHash)) throw new Error(checkoutText('Ingresá un hash de transacción válido.', 'Enter a valid transaction hash.'));
  if (!EVO_PAYMENT_PLANS[planCode] || !EVO_PAYMENT_NETWORKS[chainId]) throw new Error(checkoutText('Seleccioná el plan y la red originales del pago.', 'Select the original payment plan and network.'));
  if (!account || !walletProvider) await connectWallet();
  const payerWallet = String(account).toLowerCase();
  savePendingPayment({ txHash, planCode, chainId, payerWallet, createdAt:new Date().toISOString() });
  recoveryStatus(checkoutText('Verificando el pago en la red seleccionada…', 'Verifying the payment on the selected network…'));
  const result = await verifyCheckout(txHash, planCode, payerWallet, chainId);
  clearPendingPayment(txHash);
  const message = result.applied
    ? checkoutText(`Pago recuperado. Se acreditó el plan de ${proofQuantity(result.planCredits)}.`, `Payment recovered. The ${proofQuantity(result.planCredits)} plan was credited.`)
    : checkoutText(`Pago recuperado. El plan de ${proofQuantity(result.planCredits)} ya estaba acreditado.`, `Payment recovered. The ${proofQuantity(result.planCredits)} plan was already credited.`);
  recoveryStatus(message, 'ok');
  checkoutStatus(message + checkoutText(' Firmá “Ver saldo privado” si querés consultar los contadores exactos.', ' Sign “View private balance” if you want to read the exact counters.'), 'ok');
  await refreshEvoEntitlement(payerWallet);
}
function restorePendingPaymentForm() {
  const payment = readPendingPayment();
  if (!payment) return;
  const txInput = document.getElementById('recoveryTxHash');
  const planInput = document.getElementById('recoveryPlan');
  const networkInput = document.getElementById('recoveryNetwork');
  if (txInput) txInput.value = payment.txHash;
  if (planInput) planInput.value = payment.planCode;
  if (networkInput) networkInput.value = String(payment.chainId);
  recoveryStatus(checkoutText('Encontramos un pago pendiente guardado en este navegador. Conectá la wallet que realizó el pago y recuperalo.', 'We found a pending payment saved in this browser. Connect the wallet that made it to recover it.'));
}
async function resumePendingPayment() {
  const payment = readPendingPayment();
  if (!payment) return null;
  const connected = String(account || '').toLowerCase();
  if (connected && payment.payerWallet && String(payment.payerWallet).toLowerCase() !== connected) {
    recoveryStatus(checkoutText('Hay un pago pendiente de otra wallet. Conectá la wallet que lo realizó para recuperarlo.', 'There is a pending payment from another wallet. Connect the wallet that made it to recover it.'));
    return payment;
  }
  recoveryStatus(checkoutText('Hay un pago pendiente guardado. Podés recuperarlo con el botón Recuperar pago.', 'A pending payment is saved. You can recover it with the Recover payment button.'));
  return payment;
}
function rewriteLegacyCreditText(text) {
  const en = document.documentElement.lang === 'en';
  const exact = new Map([
    ['¿Ya pagaste y no recibiste tus créditos?', en ? 'Already paid but did not receive your EVO Proofs?' : '¿Ya pagaste y no recibiste tus EVO Proofs?'],
    ['Already paid but did not receive your credits?', 'Already paid but did not receive your EVO Proofs?'],
    ['Usá esta opción solamente si el pago fue enviado pero los créditos todavía no aparecen.', en ? 'Use this option only if the payment was sent but your EVO Proofs have not appeared yet.' : 'Usá esta opción solamente si el pago fue enviado pero tus EVO Proofs todavía no aparecen.'],
    ['Use this option only if the payment was sent but the credits have not appeared yet.', 'Use this option only if the payment was sent but your EVO Proofs have not appeared yet.'],
    ['1 EVO Passport · US$9,90', en ? '1 EVO Proof · US$9.90' : '1 EVO Proof · US$9,90'],
    ['1 EVO Passport · US$9.90', '1 EVO Proof · US$9.90'],
    ['Pack de 10 · US$49', '10 EVO Proofs · US$49'],
    ['Pack of 10 · US$49', '10 EVO Proofs · US$49'],
    ['Esta wallet ya usó su Passport gratuito y no tiene créditos disponibles. Comprá un crédito antes de continuar.', en ? 'This wallet already used its free Passport and has no EVO Proof available. Buy 1 EVO Proof to continue.' : 'Esta wallet ya usó su Passport gratuito y no tiene EVO Proof disponible. Comprá 1 EVO Proof antes de continuar.'],
    ['Firma tu Passport. Se usará 1 crédito; no es una transacción blockchain.', en ? 'Sign your Passport. 1 EVO Proof will be used; this is not a blockchain transaction.' : 'Firmá tu Passport. Se usará 1 EVO Proof; no es una transacción blockchain.']
  ]);
  return exact.get(text) || text;
}
function rewriteLegacyCreditNodes(root) {
  if (!root || typeof Node === 'undefined') return;
  if (root.nodeType === Node.TEXT_NODE) {
    const parent = root.parentElement;
    if (parent && !/^(SCRIPT|STYLE|CODE)$/i.test(parent.tagName)) {
      const next = rewriteLegacyCreditText(root.nodeValue);
      if (next !== root.nodeValue) root.nodeValue = next;
    }
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent || /^(SCRIPT|STYLE|CODE)$/i.test(parent.tagName)) continue;
    const next = rewriteLegacyCreditText(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}
function initProofPresentationObserver() {
  if (!document.body || typeof MutationObserver === 'undefined' || typeof Node === 'undefined' || typeof NodeFilter === 'undefined') return;
  rewriteLegacyCreditNodes(document.body);
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') rewriteLegacyCreditNodes(mutation.target);
      mutation.addedNodes.forEach(node => rewriteLegacyCreditNodes(node));
    }
  });
  observer.observe(document.body, { childList:true, subtree:true, characterData:true });
  const language = document.getElementById('languageSelect');
  if (language) language.addEventListener('change', () => setTimeout(() => {
    updateProofBalanceLabels();
    rewriteLegacyCreditNodes(document.body);
    if (window.evoEntitlement?.privacy === 'SIGNED_PRIVATE_BALANCE') renderPrivateEvoBalance(window.evoEntitlement);
    else if (window.evoEntitlement) renderPublicEntitlement(window.evoEntitlement);
  }, 0));
}
function resetProofWalletUi() {
  ensureProofBalanceUi();
  const state = document.getElementById('proofWalletState');
  const detail = document.getElementById('creditBalanceDetail');
  const free = document.getElementById('proofBalanceFree');
  const reveal = document.getElementById('proofRevealBalanceBtn');
  if (state) state.textContent = checkoutText('SIN WALLET', 'NO WALLET');
  if (detail) detail.textContent = checkoutText('Conectá tu wallet para comprobar tu Free Proof.', 'Connect your wallet to check your Free Proof.');
  if (free) free.textContent = '—';
  ['proofBalancePurchased','proofBalanceUsed','creditBalanceValue'].forEach(id => { const node = document.getElementById(id); if (node) node.textContent = '—'; });
  if (reveal) {
    reveal.disabled = false;
    reveal.textContent = checkoutText('Ver saldo privado', 'View private balance');
  }
  window.evoEntitlement = null;
}
function initEvoCheckout() {
  ensureProofBalanceUi();
  initProofPresentationObserver();
  const buttons = [
    [document.getElementById('buyIndividualBtn'), 'INDIVIDUAL'],
    [document.getElementById('buyPackBtn'), 'PACK_10']
  ];
  buttons.forEach(([button, planCode]) => {
    if (!button) return;
    button.addEventListener('click', async () => {
      buttons.forEach(([item]) => { if (item) item.disabled = true; });
      try { await buyEvoPlan(planCode); }
      catch (error) {
        const message = error && error.message ? error.message : checkoutText('Compra cancelada o no completada.', 'Purchase cancelled or not completed.');
        checkoutStatus(message);
      } finally {
        buttons.forEach(([item]) => { if (item) item.disabled = false; });
      }
    });
  });
  const recoverButton = document.getElementById('recoverPaymentBtn');
  if (recoverButton) {
    recoverButton.addEventListener('click', async () => {
      recoverButton.disabled = true;
      try { await recoverEvoPayment(); }
      catch (error) { recoveryStatus(error && error.message ? error.message : checkoutText('No se pudo recuperar el pago.', 'The payment could not be recovered.')); }
      finally { recoverButton.disabled = false; }
    });
  }
  restorePendingPaymentForm();
  window.evoWalletConnected = wallet => {
    const connectedWallet = wallet || account || '';
    window.evoEntitlement = null;
    refreshEvoEntitlement(connectedWallet).catch(error => checkoutStatus(error && error.message ? error.message : checkoutText('No se pudo comprobar el beneficio gratuito.', 'Could not check the free entitlement.')));
    resumePendingPayment().catch(error => recoveryStatus(error && error.message ? error.message : checkoutText('El pago sigue pendiente de verificación.', 'The payment is still pending verification.')));
  };
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('evo:wallet-connected', event => window.evoWalletConnected(event.detail && event.detail.account));
    window.addEventListener('evo:wallet-disconnected', resetProofWalletUi);
  }
  if (account) window.evoWalletConnected(account); else resetProofWalletUi();
}
initEvoCheckout();