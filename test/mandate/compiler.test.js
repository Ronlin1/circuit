import test from 'node:test';
import assert from 'node:assert/strict';
import { compileMandate } from '../../src/mandate/compiler.js';

test('compiler turns plain-language limits into a DRAFT only', () => {
  const draft=compileMandate('Conservative BNB agent. Spot only. Assets: BNB, USDT. Maximum $10 per order and $30 per day. Max concentration 20%. Max drawdown 2%. No more than 3 orders per 60 seconds.');
  assert.equal(draft.status,'DRAFT');
  assert.deepEqual(draft.allowedProducts,['SPOT']);
  assert.deepEqual(draft.allowedAssets,['BNB','USDT']);
  assert.equal(draft.maxOrderUsd,10);
  assert.equal(draft.maxDailySpendUsd,30);
  assert.equal(draft.maxAssetConcentrationPct,20);
  assert.equal(draft.maxDailyDrawdownPct,2);
  assert.deepEqual(draft.maxOrdersPerWindow,{count:3,windowSeconds:60});
});

test('compiler never enables futures or margin without explicit language', () => {
  const draft=compileMandate('Trade BNB and USDT. Max $5 per order. Max $20 per day.');
  assert.deepEqual(draft.allowedProducts,['SPOT']);
  assert.equal(draft.allowedProducts.includes('USD_M_FUTURES'),false);
  assert.equal(draft.allowedProducts.includes('MARGIN'),false);
});
