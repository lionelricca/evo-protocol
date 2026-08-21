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
  INDIVIDUAL: { label:'1 EVO Passport', amountLabel:'US$9,90', amountUsdc:'9.90', amountMinor:9900000n },
  PACK_10: { label:'Pack de 10 EVO Passports', amountLabel:'US$49', amountUsdc:'49', amountMinor:49000000n }
};
const EVO_PENDING_PAYMENT_KEY = 'evo_pending_payment_v1';
const EVO_TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const EVO_DEPAY_SCRIPT = 'https://sdk.depay.com/widgets/v13.0.45.js';
const EVO_VERIFYING_TXS = new Set();
const EVO_DEPAY_CHAIN_IDS = Object.fromEntries(Object.entries(EVO_PAYMENT_NETWORKS).map(([chainId, network]) => [network.depay, chainId]));

function checkoutText(es, en) {
  return document.documentElement.lang === 'en' ? en : es;
}
function checkoutStatus(message, kind) {
  const box = document.getElementById('checkoutStatus');
  if (!box) return;
  box.className = kind === 'ok' ? 'passportNotice ok' : 'passportNotice';
  box.textContent = window.evoT ? window.evoT(message) : message;
}
function saveCreditBalance(wallet, credits) {
  const normalizedWallet = String(wallet || '').toLowerCase();
  const normalizedCredits = Number(credits);
  if (!/^0x[0-9a-f]{40}$/.test(normalizedWallet) || !Number.isFinite(normalizedCredits)) return;
  try { localStorage.setItem(EVO_CREDIT_BALANCE_KEY + ':' + normalizedWallet, JSON.stringify({ credits:normalizedCredits, updatedAt:new Date().toISOString() })); } catch {}
  renderCreditBalance(normalizedWallet, normalizedCredits, true);
}
function readCreditBalance(wallet) {
  try {
    const saved = JSON.parse(localStorage.getItem(EVO_CREDIT_BALANCE_KEY + ':' + String(wallet || '').toLowerCase()) || 'null');
    return saved && Number.isFinite(Number(saved.credits)) ? Number(saved.credits) : null;
  } catch { return null; }
}
function renderCreditBalance(wallet, credits, verified) {
  const value = document.getElementById('creditBalanceValue');
  const detail = document.getElementById('creditBalanceDetail');
  if (!value || !detail) return;
  const normalizedWallet = String(wallet || '').toLowerCase();
  const balance = credits === undefined ? readCreditBalance(normalizedWallet) : Number(credits);
  if (!normalizedWallet) {
    value.textContent = '—';
    detail.textContent = checkoutText('Conectá MetaMask para ver y usar tus créditos.', 'Connect MetaMask to view and use your credits.');
    return;
  }
  value.textContent = balance === null || !Number.isFinite(balance) ? '0' : String(balance);
  detail.textContent = verified
    ? checkoutText('Saldo verificado en la red. Se usa automáticamente al crear tu próximo Passport.', 'Balance verified on-chain. It is used automatically when you create your next Passport.')
    : checkoutText('Último saldo verificado para ', 'Last verified balance for ') + normalizedWallet.slice(0,6) + '…' + normalizedWallet.slice(-4) + '.';
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
function renderEvoEntitlement(data) {
  const status = document.getElementById('demoPlanStatus');
  const value = document.getElementById('demoPlanValue');
  const action = document.getElementById('demoPlanAction');
  if (status && value && action) {
    if (data.demoAvailable) {
      value.textContent = checkoutText('Gratis disponible', 'Free available');
      status.className = 'passportNotice ok';
      status.textContent = checkoutText('Esta wallet todavía tiene su único Passport gratuito.', 'This wallet still has its one free Passport.');
      action.textContent = checkoutText('Crear mi Passport gratis', 'Create my free Passport');
      action.href = '#seal';
    } else {
      value.textContent = checkoutText('Gratis ya usado', 'Free already used');
      status.className = 'passportNotice';
      status.textContent = data.remainingCredits > 0
        ? checkoutText(`Tenés ${data.remainingCredits} crédito(s) comprado(s) disponible(s).`, `You have ${data.remainingCredits} purchased credit(s) available.`)
        : checkoutText('Para crear otro Passport necesitás comprar un crédito.', 'To create another Passport you need to buy a credit.');
      action.textContent = data.remainingCredits > 0 ? checkoutText('Usar mi crédito', 'Use my credit') : checkoutText('Comprar crédito', 'Buy credit');
      action.href = data.remainingCredits > 0 ? '#seal' : '#pricing';
    }
  }
  saveCreditBalance(data.wallet, data.remainingCredits);
  window.evoEntitlement = data;
  window.dispatchEvent(new CustomEvent('evo:entitlement-updated', { detail:data }));
  return data;
}
async function refreshEvoEntitlement(wallet) {
  const data = await fetchEvoEntitlement(wallet || account || '');
  return renderEvoEntitlement(data);
}
window.evoRefreshEntitlement = refreshEvoEntitlement;
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
    checkoutStatus(checkoutText('Pago verificado. Tenés ', 'Payment verified. You have ') + result.remainingCredits + checkoutText(' crédito(s) disponibles para crear pasaportes.', ' credit(s) available to create passports.'), 'ok');
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
    title:checkoutText('Comprar EVO Passport', 'Buy EVO Passport'),
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
  const message = checkoutText('Pago recuperado. Tenés ', 'Payment recovered. You have ') + result.remainingCredits + checkoutText(' crédito(s) disponibles.', ' credit(s) available.');
  recoveryStatus(message, 'ok');
  checkoutStatus(message, 'ok');
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
  recoveryStatus(checkoutText('Encontramos un pago pendiente guardado en este navegador. Conectá la wallet que realizó el pago y recuperalo.', 'We found a pending payment saved in this browser. Connect the wallet that made the payment and recover it.'));
}
function initEvoCheckout() {
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
    renderCreditBalance(wallet || account || '');
    refreshEvoEntitlement(wallet || account || '').catch(error => checkoutStatus(error && error.message ? error.message : checkoutText('No se pudo comprobar el beneficio gratuito.', 'Could not check the free entitlement.')));
    resumePendingPayment().catch(error => recoveryStatus(error && error.message ? error.message : checkoutText('El pago sigue pendiente de verificación.', 'The payment is still pending verification.')));
  };
}
initEvoCheckout();
