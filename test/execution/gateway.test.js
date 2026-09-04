import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftMandate, activateMandate } from '../../src/domain/mandate.js';
import { createActionIntent } from '../../src/domain/intent.js';
import { MockBinanceAdapter } from '../../src/adapters/mock-binance.js';
import { ExecutionGateway } from '../../src/execution/gateway.js';
import { RuntimeStore } from '../../src/runtime/runtime-store.js';
import { FlightRecorder } from '../../src/trace/flight-recorder.js';
import { createSqlitePersistence } from '../../src/persistence/sqlite.js';

const mandate = () => activateMandate(createDraftMandate({id:'m',name:'Gateway',allowedAssets:['BNB','USDT'],maxOrderUsd:10,maxDailySpendUsd:30,maxOrdersPerWindow:{count:3,windowSeconds:60}}));
const intent = (overrides={}) => createActionIntent({id:'i',agentId:'agent-1',semanticIntentId:'sem-1',userIntentMode:'TRANSACT',action:'BUY',product:'SPOT',symbol:'BNBUSDT',asset:'BNB',quoteAsset:'USDT',requestedUsd:10,rationale:'safe',createdAt:'2026-09-03T12:00:10.000Z',...overrides});
function services(adapter = new MockBinanceAdapter({ now:'2026-09-03T12:00:10.000Z' })) {
  return { adapter, gateway:new ExecutionGateway({adapter, runtimeStore:new RuntimeStore(), recorder:new FlightRecorder(createSqlitePersistence(':memory:'))}) };
}

test('ALLOW evaluation becomes explicitly executable and execution reaches adapter once', async () => {
  const {adapter,gateway}=services();
  const trace=await gateway.evaluate(intent(),{mandate:mandate(),now:'2026-09-03T12:00:10.000Z'});
  assert.equal(trace.decision,'ALLOW');
  assert.equal(adapter.executions.length,0);
  const result=await gateway.executeEvaluated(trace.traceId);
  assert.equal(result.status,'SIMULATED_FILLED');
  assert.equal(adapter.executions.length,1);
  await assert.rejects(()=>gateway.executeEvaluated(trace.traceId),/not executable/);
});

test('BLOCK decision never becomes executable', async () => {
  const {adapter,gateway}=services();
  const trace=await gateway.evaluate(intent({requestedUsd:100}),{mandate:mandate(),now:'2026-09-03T12:00:10.000Z'});
  assert.equal(trace.decision,'BLOCK');
  await assert.rejects(()=>gateway.executeEvaluated(trace.traceId),/not executable/);
  assert.equal(adapter.executions.length,0);
});

test('PAUSE decision never becomes executable and pauses runtime', async () => {
  const adapter=new MockBinanceAdapter({now:'2026-09-03T12:00:10.000Z',priorSettlementState:'UNKNOWN'});
  const {gateway}=services(adapter);
  const trace=await gateway.evaluate(intent(),{mandate:mandate(),now:'2026-09-03T12:00:10.000Z'});
  assert.equal(trace.decision,'PAUSE');
  assert.equal(gateway.runtimeState('agent-1'),'PAUSED');
  await assert.rejects(()=>gateway.executeEvaluated(trace.traceId),/not executable/);
  assert.equal(adapter.executions.length,0);
});

test('already paused runtime blocks subsequent otherwise-safe action', async () => {
  const {adapter,gateway}=services();
  gateway.pause('agent-1');
  const trace=await gateway.evaluate(intent(),{mandate:mandate(),now:'2026-09-03T12:00:10.000Z'});
  assert.equal(trace.decision,'PAUSE');
  assert.ok(trace.reasonCodes.includes('RUNTIME_NOT_EXECUTABLE'));
  assert.equal(adapter.executions.length,0);
});
