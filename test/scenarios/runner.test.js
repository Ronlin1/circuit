import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../../src/scenarios/catalog.js';
import { runScenario } from '../../src/scenarios/runner.js';
import { createDraftMandate, activateMandate } from '../../src/domain/mandate.js';
import { MockBinanceAdapter } from '../../src/adapters/mock-binance.js';
import { ExecutionGateway } from '../../src/execution/gateway.js';
import { RuntimeStore } from '../../src/runtime/runtime-store.js';
import { FlightRecorder } from '../../src/trace/flight-recorder.js';
import { createSqlitePersistence } from '../../src/persistence/sqlite.js';

function services() {
  const mandate=activateMandate(createDraftMandate({id:'demo-mandate',name:'CIRCUIT Demo',allowedProducts:['SPOT'],allowedAssets:['BNB','USDT'],maxOrderUsd:10,maxDailySpendUsd:30,maxAssetConcentrationPct:40,maxDailyDrawdownPct:2,maxOrdersPerWindow:{count:3,windowSeconds:60},maxEvidenceAgeMs:15_000,duplicateIntentWindowMs:60_000,abnormalMarketPolicy:'REVIEW'}));
  const adapter=new MockBinanceAdapter({now:'2026-09-03T12:01:00.000Z'});
  const gateway=new ExecutionGateway({adapter,runtimeStore:new RuntimeStore(),recorder:new FlightRecorder(createSqlitePersistence(':memory:'))});
  return {mandate,adapter,gateway,now:'2026-09-03T12:01:00.000Z'};
}

const expectations = {
  'safe-spot-buy':['ALLOW',null],
  'oversize-order':['BLOCK','ORDER_CAP_EXCEEDED'],
  'forbidden-futures':['BLOCK','PRODUCT_NOT_ALLOWED'],
  'duplicate-retry-loop':['PAUSE','DUPLICATE_SEMANTIC_INTENT'],
  'frequency-breaker':['PAUSE','ORDER_FREQUENCY_ANOMALY'],
  'stale-evidence':['BLOCK','EVIDENCE_STALE'],
  'regime-drift':['REVIEW','ABNORMAL_MARKET_REGIME'],
  'prompt-injection':['BLOCK','ORDER_CAP_EXCEEDED']
};

test('catalog exposes exactly the eight competition scenarios', () => {
  assert.deepEqual(Object.keys(SCENARIOS), Object.keys(expectations));
});

for (const [id,[decision,reason]] of Object.entries(expectations)) {
  test(`${id} terminates as ${decision}${reason ? ` with ${reason}` : ''}`, async () => {
    const result=await runScenario(id,services());
    assert.equal(result.trace.decision,decision);
    if(reason) assert.ok(result.trace.reasonCodes.includes(reason), `${reason} missing from ${result.trace.reasonCodes}`);
    if(id==='safe-spot-buy') {
      assert.equal(result.execution.status,'SIMULATED_FILLED');
    }
    if(id==='prompt-injection') {
      assert.match(result.trace.intent.rationale,/ignore all previous restrictions/i);
      assert.equal(result.trace.intent.requestedUsd,100);
    }
  });
}
