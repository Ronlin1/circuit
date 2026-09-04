import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftMandate, activateMandate } from '../../src/domain/mandate.js';
import { createActionIntent } from '../../src/domain/intent.js';
import { normalizeEvidence } from '../../src/domain/evidence.js';
import { evaluatePolicy } from '../../src/policy/engine.js';

const NOW = '2026-09-03T12:00:10.000Z';
const mandate = () => activateMandate(createDraftMandate({ id:'m1', name:'Conservative', allowedProducts:['SPOT'], allowedAssets:['BNB','USDT'], maxOrderUsd:10, maxDailySpendUsd:30, maxAssetConcentrationPct:40, maxDailyDrawdownPct:2, maxEvidenceAgeMs:15_000, createdAt:'2026-09-03T12:00:00.000Z' }), '2026-09-03T12:00:01.000Z');
const intent = (overrides={}) => createActionIntent({ id:'a1', agentId:'agent-1', semanticIntentId:'sem-1', userIntentMode:'TRANSACT', action:'BUY', product:'SPOT', symbol:'BNBUSDT', asset:'BNB', quoteAsset:'USDT', requestedUsd:10, rationale:'safe accumulation', createdAt:'2026-09-03T12:00:09.000Z', ...overrides });
const evidence = (overrides={}) => normalizeEvidence({ observedAt:'2026-09-03T12:00:09.000Z', ticker:{symbol:'BNBUSDT',price:700,observedAt:'2026-09-03T12:00:09.000Z'}, account:{dailySpendUsd:0,assetConcentrationPct:20,dailyDrawdownPct:0.2,observedAt:'2026-09-03T12:00:09.000Z'}, priorSettlement:{semanticIntentId:'sem-1',state:'NONE',observedAt:'2026-09-03T12:00:09.000Z'}, ...overrides });

function expectReason(result, action, code) {
  assert.equal(result.action, action);
  assert.ok(result.reasonCodes.includes(code), `${code} absent from ${result.reasonCodes.join(',')}`);
}

test('allows a safe Spot action', () => {
  const result = evaluatePolicy({ mandate: mandate(), intent: intent(), evidence: evidence(), now: NOW });
  assert.equal(result.action, 'ALLOW');
  assert.equal(result.approvedUsd, 10);
  assert.deepEqual(result.reasonCodes, []);
});

test('blocks an inactive mandate', () => expectReason(evaluatePolicy({ mandate: createDraftMandate({name:'Draft',allowedAssets:['BNB'],maxOrderUsd:10,maxDailySpendUsd:30}), intent:intent(), evidence:evidence(), now:NOW }), 'BLOCK', 'MANDATE_NOT_ACTIVE'));
test('blocks a mutation derived from read-only intent', () => expectReason(evaluatePolicy({ mandate:mandate(), intent:intent({userIntentMode:'READ_ONLY'}), evidence:evidence(), now:NOW }), 'BLOCK', 'READ_ONLY_MUTATION'));
test('blocks forbidden product', () => expectReason(evaluatePolicy({ mandate:mandate(), intent:intent({product:'USD_M_FUTURES'}), evidence:evidence(), now:NOW }), 'BLOCK', 'PRODUCT_NOT_ALLOWED'));
test('blocks forbidden asset', () => expectReason(evaluatePolicy({ mandate:mandate(), intent:intent({asset:'DOGE',symbol:'DOGEUSDT'}), evidence:evidence(), now:NOW }), 'BLOCK', 'ASSET_NOT_ALLOWED'));
test('blocks oversized order', () => expectReason(evaluatePolicy({ mandate:mandate(), intent:intent({requestedUsd:11}), evidence:evidence(), now:NOW }), 'BLOCK', 'ORDER_CAP_EXCEEDED'));
test('blocks daily budget breach', () => expectReason(evaluatePolicy({ mandate:mandate(), intent:intent({requestedUsd:10}), evidence:evidence({account:{dailySpendUsd:25,assetConcentrationPct:20,dailyDrawdownPct:0.2,observedAt:'2026-09-03T12:00:09.000Z'}}), now:NOW }), 'BLOCK', 'DAILY_BUDGET_EXCEEDED'));
test('blocks concentration breach', () => expectReason(evaluatePolicy({ mandate:mandate(), intent:intent(), evidence:evidence({account:{dailySpendUsd:0,assetConcentrationPct:41,dailyDrawdownPct:0.2,observedAt:'2026-09-03T12:00:09.000Z'}}), now:NOW }), 'BLOCK', 'CONCENTRATION_LIMIT_EXCEEDED'));
test('blocks drawdown breach', () => expectReason(evaluatePolicy({ mandate:mandate(), intent:intent(), evidence:evidence({account:{dailySpendUsd:0,assetConcentrationPct:20,dailyDrawdownPct:2.1,observedAt:'2026-09-03T12:00:09.000Z'}}), now:NOW }), 'BLOCK', 'DRAWDOWN_LIMIT_EXCEEDED'));
test('blocks stale evidence', () => expectReason(evaluatePolicy({ mandate:mandate(), intent:intent(), evidence:evidence({observedAt:'2026-09-03T11:59:00.000Z'}), now:NOW }), 'BLOCK', 'EVIDENCE_STALE'));
test('pauses on uncertain prior settlement and PAUSE outranks other vetoes', () => {
  const result = evaluatePolicy({ mandate:mandate(), intent:intent({requestedUsd:99}), evidence:evidence({priorSettlement:{semanticIntentId:'sem-1',state:'UNKNOWN',observedAt:'2026-09-03T12:00:09.000Z'}}), now:NOW });
  expectReason(result, 'PAUSE', 'UNCERTAIN_PRIOR_SETTLEMENT');
  assert.ok(result.reasonCodes.includes('ORDER_CAP_EXCEEDED'));
});
