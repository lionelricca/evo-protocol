'use strict';

const EVO_CHECKOUT_URL = SUPABASE_URL + '/functions/v1/evo-checkout';
const EVO_MERCHANT_WALLET = '0xDC6740245e026A19ea9EE2B62968ea8aeFFEAb16';
const EVO_PAYMENT_NETWORKS = {
  '137': { name:'Polygon', chainHex:'0x89', usdc:'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol:'POL', rpc:'https://polygon.drpc.org', explorer:'https://polygonscan.com/tx/' },
  '8453': { name:'Base', chainHex:'0x2105', usdc:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol:'ETH', rpc:'https://base.drpc.org', explorer:'https://basescan.org/tx/' },
  '42161': { name:'Arbitrum', chainHex:'0xa4b1', usdc:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol:'ETH', rpc:'https://arbitrum.drpc.org', explorer:'https://arbiscan.io/tx/' },
  '10': { name:'Optimism', chainHex:'0xa', usdc:'0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol:'ETH', rpc:'https://optimism.drpc.org', explorer:'https://optimistic.etherscan.io/tx/' },
  '43114': { name:'Avalanche', chainHex:'0xa86a', usdc:'0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol:'AVAX', rpc:'https://api.avax.network/ext/bc/C/rpc', explorer:'https://snowtrace.io/tx/' },
  '1': { name:'Ethereum', chainHex:'0x1', usdc:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol:'ETH', rpc:'https://eth.drpc.org', explorer:'https://etherscan.io/tx/' }
};
const EVO_PAYMENT_PLANS = {
  INDIVIDUAL: { label:'1 EVO Passport', amountLabel:'US$9,90', amountMinor:9900000n },
  PACK_10: { label:'Pack de 10 EVO Passports', amountLabel:'US$49', amountMinor:49000000n }
};

function checkoutText(es, en) {
  return document.documentElement.lang === 'en' ? en : es;
}
function checkoutStatus(message, kind) {
  const box = document.getElementById('checkoutStatus');
  if (!box) return;
  box.className = kind === 'ok' ? 'passportNotice ok' : 'passportNotice';
  box.textContent = window.evoT ? window.evoT(message) : message;
}
function encodeUsdcTransfer(recipient, amountMinor) {
  const selector = 'a9059cbb';
  const addressWord = recipient.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const amountWord = amountMinor.toString(16).padStart(64, '0');
  return '0x' + selector + addressWord + amountWord;
}
async function ensurePaymentNetwork(network) {
  try {
    await walletProvider.request({ method:'wallet_switchEthereumChain', params:[{ chainId:network.chainHex }] });
  } catch (error) {
    if (Number(error && error.code) !== 4902) throw error;
    await walletProvider.request({
      method:'wallet_addEthereumChain',
      params:[{
        chainId:network.chainHex,
        chainName:network.name,
        nativeCurrency:{ name:network.symbol, symbol:network.symbol, decimals:18 },
        rpcUrls:[network.rpc],
        blockExplorerUrls:[network.explorer.replace('/tx/', '')]
      }]
    });
  }
  const selected = String(await walletProvider.request({ method:'eth_chainId' })).toLowerCase();
  if (selected !== network.chainHex.toLowerCase()) throw new Error(checkoutText('MetaMask no cambió a la red elegida.', 'MetaMask did not switch to the selected network.'));
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
async function buyEvoPlan(planCode) {
  const plan = EVO_PAYMENT_PLANS[planCode];
  const select = document.getElementById('paymentNetwork');
  const chainId = String(select && select.value || '137');
  const network = EVO_PAYMENT_NETWORKS[chainId];
  if (!plan || !network) throw new Error(checkoutText('Plan o red no disponible.', 'Plan or network unavailable.'));
  if (!account || !walletProvider) await connectWallet();
  await ensurePaymentNetwork(network);
  const recipient = EVO_MERCHANT_WALLET;
  const approved = window.confirm(
    checkoutText('Vas a comprar ', 'You are buying ') + checkoutText(plan.label, planCode === 'INDIVIDUAL' ? '1 EVO Passport' : 'Pack of 10 EVO Passports') + '\n\n' +
    checkoutText('Importe: ', 'Amount: ') + checkoutText(plan.amountLabel, plan.amountLabel.replace(',', '.')) + checkoutText(' en USDC\n', ' in USDC\n') +
    checkoutText('Red: ', 'Network: ') + network.name + '\n' +
    checkoutText('Destino: ', 'Recipient: ') + recipient + '\n\n' +
    checkoutText('MetaMask mostrará la confirmación final. EVO nunca solicitará tu frase semilla.', 'MetaMask will show the final confirmation. EVO will never ask for your seed phrase.')
  );
  if (!approved) return;
  checkoutStatus(checkoutText('Revisá y confirmá el pago en MetaMask.', 'Review and confirm the payment in MetaMask.'));
  const txHash = await walletProvider.request({
    method:'eth_sendTransaction',
    params:[{
      from:account,
      to:network.usdc,
      value:'0x0',
      data:encodeUsdcTransfer(recipient, plan.amountMinor)
    }]
  });
  checkoutStatus(checkoutText('Pago enviado. EVO está verificando la cadena antes de acreditar.', 'Payment sent. EVO is verifying the chain before crediting.'));
  const result = await verifyCheckout(String(txHash).toLowerCase(), planCode, account, chainId);
  checkoutStatus(checkoutText('Pago verificado. Tenés ', 'Payment verified. You have ') + result.remainingCredits + checkoutText(' crédito(s) disponibles para crear pasaportes.', ' credit(s) available to create passports.'), 'ok');
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
}
initEvoCheckout();
