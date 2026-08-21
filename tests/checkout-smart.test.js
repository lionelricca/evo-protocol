'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

function checkoutHarness() {
  const storage = new Map();
  const listeners = new Map();
  const elements = new Map();
  const makeElement = id => ({
    id,
    className:'',
    disabled:false,
    textContent:'',
    value:id === 'recoveryPlan' ? 'INDIVIDUAL' : id === 'recoveryNetwork' ? '137' : '',
    addEventListener(type, handler) { listeners.set(id + ':' + type, handler); }
  });
  ['buyIndividualBtn','buyPackBtn','recoverPaymentBtn','checkoutStatus','recoveryStatus','recoveryTxHash','recoveryPlan','recoveryNetwork'].forEach(id => elements.set(id, makeElement(id)));

  const calls = { paymentConfig:null, verification:null };
  const context = {
    SUPABASE_URL:'https://example.supabase.co',
    account:null,
    walletProvider:null,
    connectWallet:async () => {},
    console,
    setTimeout,
    clearTimeout,
    fetch:async (_url, options) => {
      calls.verification = JSON.parse(options.body);
      return { status:200, ok:true, json:async () => ({ remainingCredits:1 }) };
    },
    localStorage:{
      getItem:key => storage.has(key) ? storage.get(key) : null,
      setItem:(key, value) => storage.set(key, value),
      removeItem:key => storage.delete(key)
    },
    document:{
      documentElement:{ lang:'es' },
      getElementById:id => elements.get(id) || null,
      querySelector:() => null,
      createElement:() => ({ dataset:{} }),
      head:{ appendChild:() => {} }
    },
    window:{
      DePayWidgets:{ Payment:async config => { calls.paymentConfig = config; } },
      evoT:value => value
    }
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('v1/checkout.js','utf8'), context);
  return { calls, elements, listeners, storage };
}

test('smart checkout settles exact USDC prices on every supported network', async () => {
  const harness = checkoutHarness();
  await harness.listeners.get('buyIndividualBtn:click')();
  const config = harness.calls.paymentConfig;
  assert.ok(config, 'payment widget should open');
  assert.equal(config.accept.length, 6);
  assert.deepEqual(new Set(config.accept.map(option => option.blockchain)), new Set(['polygon','base','arbitrum','optimism','avalanche','ethereum']));
  assert.ok(config.accept.every(option => option.amount === '9.90'));
  assert.ok(config.accept.every(option => option.receiver.toLowerCase() === '0xdc6740245e026a19ea9ee2b62968ea8aeffeab16'));
});

test('smart checkout pins the reviewed DePay widget release', () => {
  const source = fs.readFileSync('v1/checkout.js', 'utf8');
  assert.match(source, /https:\/\/sdk\.depay\.com\/widgets\/v13\.0\.45\.js/);
  assert.doesNotMatch(source, /integrate\.depay\.com\/widgets\/v10\.js/);
});

test('submitted smart payment is recoverable and verified against its settlement chain', async () => {
  const harness = checkoutHarness();
  await harness.listeners.get('buyIndividualBtn:click')();
  const transaction = {
    id:'0x' + 'a'.repeat(64),
    from:'0x' + 'b'.repeat(40),
    blockchain:'polygon'
  };
  harness.calls.paymentConfig.sent(transaction);
  await new Promise(resolve => setImmediate(resolve));
  const pending = JSON.parse(harness.storage.get('evo_pending_payment_v1'));
  assert.equal(pending.chainId, '137');
  assert.equal(pending.planCode, 'INDIVIDUAL');

  harness.calls.paymentConfig.succeeded(transaction);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(harness.calls.verification, {
    action:'verify',
    txHash:transaction.id,
    planCode:'INDIVIDUAL',
    payerWallet:transaction.from,
    chainId:137
  });
  assert.equal(harness.storage.has('evo_pending_payment_v1'), false);
});
