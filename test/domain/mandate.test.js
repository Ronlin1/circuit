import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftMandate, activateMandate } from '../../src/domain/mandate.js';
import { createActionIntent } from '../../src/domain/intent.js';
import { normalizeEvidence } from '../../src/domain/evidence.js';

test('creates a safe draft mandate with normalized assets and defaults', () => {
  const mandate = createDraftMandate({ name: 'Conservative BNB', allowedAssets: ['bnb', 'usdt'], maxOrderUsd: 10, maxDailySpendUsd: 30 });
  assert.equal(mandate.status, 'DRAFT');
  assert.deepEqual(mandate.allowedProducts, ['SPOT']);
  assert.deepEqual(mandate.allowedAssets, ['BNB', 'USDT']);
  assert.equal(mandate.maxEvidenceAgeMs, 15_000);
  assert.equal(mandate.uncertainSettlementPolicy, 'PAUSE');
});

test('rejects invalid financial caps', () => {
  assert.throws(() => createDraftMandate({ name: 'Bad', allowedAssets: ['BNB'], maxOrderUsd: 0, maxDailySpendUsd: 30 }), /maxOrderUsd/);
  assert.throws(() => createDraftMandate({ name: 'Bad', allowedAssets: ['BNB'], maxOrderUsd: 10, maxDailySpendUsd: 5 }), /maxDailySpendUsd/);
});

test('rejects unsupported abnormal market policies instead of weakening drift enforcement', () => {
  assert.throws(() => createDraftMandate({
    name: 'Unsafe policy',
    allowedAssets: ['BNB'],
    maxOrderUsd: 10,
    maxDailySpendUsd: 30,
    abnormalMarketPolicy: 'ALLOW'
  }), /abnormalMarketPolicy/);
});

test('activation returns an immutable active mandate', () => {
  const draft = createDraftMandate({ name: 'Safe', allowedAssets: ['BNB'], maxOrderUsd: 10, maxDailySpendUsd: 30 });
  const active = activateMandate(draft, '2026-09-03T12:00:00.000Z');
  assert.equal(active.status, 'ACTIVE');
  assert.equal(Object.isFrozen(active), true);
  assert.equal(Object.isFrozen(active.allowedAssets), true);
  assert.throws(() => active.allowedAssets.push('BTC'));
});

test('normalizes action intent symbols and assets', () => {
  const intent = createActionIntent({ agentId: 'agent-1', semanticIntentId: 'intent-1', userIntentMode: 'TRANSACT', action: 'BUY', product: 'SPOT', symbol: 'bnbusdt', asset: 'bnb', quoteAsset: 'usdt', requestedUsd: 10, rationale: 'test' });
  assert.equal(intent.symbol, 'BNBUSDT');
  assert.equal(intent.asset, 'BNB');
  assert.equal(intent.quoteAsset, 'USDT');
});

test('normalizes evidence and settlement state', () => {
  const evidence = normalizeEvidence({ observedAt: '2026-09-03T12:00:00Z', account: { dailySpendUsd: 5, assetConcentrationPct: 12, dailyDrawdownPct: 1, observedAt: '2026-09-03T12:00:00Z' }, priorSettlement: { semanticIntentId: 'i-1', state: 'NONE', observedAt: '2026-09-03T12:00:00Z' } });
  assert.equal(evidence.priorSettlement.state, 'NONE');
  assert.equal(evidence.account.dailySpendUsd, 5);
});
