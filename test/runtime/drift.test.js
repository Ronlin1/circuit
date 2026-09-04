import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftMandate, activateMandate } from '../../src/domain/mandate.js';
import { createActionIntent } from '../../src/domain/intent.js';
import { normalizeEvidence } from '../../src/domain/evidence.js';
import { detectRuntimeDrift } from '../../src/runtime/drift.js';

const mandate = (overrides={}) => activateMandate(createDraftMandate({ name:'Runtime', allowedAssets:['BNB','USDT'], maxOrderUsd:10, maxDailySpendUsd:100, maxOrdersPerWindow:{count:3,windowSeconds:60}, duplicateIntentWindowMs:60_000, abnormalMarketPolicy:'REVIEW', ...overrides }));
const intent = (overrides={}) => createActionIntent({ agentId:'a', semanticIntentId:'sem-4', userIntentMode:'TRANSACT', action:'BUY', product:'SPOT', symbol:'BNBUSDT', asset:'BNB', quoteAsset:'USDT', requestedUsd:10, rationale:'r', createdAt:'2026-09-03T12:00:50.000Z', ...overrides });
const evidence = (overrides={}) => normalizeEvidence({ observedAt:'2026-09-03T12:00:50.000Z', account:{dailySpendUsd:0,assetConcentrationPct:10,dailyDrawdownPct:0,observedAt:'2026-09-03T12:00:50.000Z'}, priorSettlement:{semanticIntentId:'sem-4',state:'NONE',observedAt:'2026-09-03T12:00:50.000Z'}, volatility:{symbol:'BNBUSDT',score:1,baseline:1,observedAt:'2026-09-03T12:00:50.000Z'}, ...overrides });

test('normal flow has no runtime drift', () => {
  const result = detectRuntimeDrift({mandate:mandate(),intent:intent(),evidence:evidence(),recentIntents:[]});
  assert.equal(result.action, 'ALLOW');
  assert.deepEqual(result.reasonCodes, []);
});

test('duplicate semantic intent with uncertain prior settlement pauses', () => {
  const prior = intent({id:'old',createdAt:'2026-09-03T12:00:20.000Z'});
  const result = detectRuntimeDrift({mandate:mandate(),intent:intent(),evidence:evidence({priorSettlement:{semanticIntentId:'sem-4',state:'SUBMITTED',observedAt:'2026-09-03T12:00:50.000Z'}}),recentIntents:[prior]});
  assert.equal(result.action, 'PAUSE');
  assert.ok(result.reasonCodes.includes('DUPLICATE_SEMANTIC_INTENT'));
});

test('order burst beyond mandate window pauses', () => {
  const recent = [10,20,30].map((s,i)=>intent({id:`i${i}`,semanticIntentId:`s${i}`,createdAt:`2026-09-03T12:00:${s}.000Z`}));
  const result = detectRuntimeDrift({mandate:mandate(),intent:intent(),evidence:evidence(),recentIntents:recent});
  assert.equal(result.action, 'PAUSE');
  assert.ok(result.reasonCodes.includes('ORDER_FREQUENCY_ANOMALY'));
});

test('abnormal market regime requests review', () => {
  const result = detectRuntimeDrift({mandate:mandate(),intent:intent(),evidence:evidence({volatility:{symbol:'BNBUSDT',score:2.5,baseline:1,observedAt:'2026-09-03T12:00:50.000Z'}}),recentIntents:[]});
  assert.equal(result.action, 'REVIEW');
  assert.ok(result.reasonCodes.includes('ABNORMAL_MARKET_REGIME'));
});

test('abnormal market regime can be configured to pause', () => {
  const result = detectRuntimeDrift({mandate:mandate({abnormalMarketPolicy:'PAUSE'}),intent:intent(),evidence:evidence({volatility:{symbol:'BNBUSDT',score:2.5,baseline:1,observedAt:'2026-09-03T12:00:50.000Z'}}),recentIntents:[]});
  assert.equal(result.action, 'PAUSE');
});
