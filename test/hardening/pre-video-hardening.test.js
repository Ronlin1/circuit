import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createActionIntent } from '../../src/domain/intent.js';
import { normalizeEvidence } from '../../src/domain/evidence.js';
import { createAppServices } from '../../src/app/services.js';
import { createHttpServer } from '../../src/server/http.js';

const read=(relative)=>readFile(new URL(relative,import.meta.url),'utf8');

test('primary navigation presents How it Works as a practical Guide',async()=>{
  const [shared,guide]=await Promise.all([
    read('../../public/shared.js'),
    read('../../public/how-it-works/index.html'),
  ]);
  assert.match(shared,/ensureGuideNavigation/);
  assert.match(shared,/textContent=['"]Guide['"]/);
  assert.match(guide,/href=["']\/how-it-works\/["']/i);
});

test('Guide explains judge, builder and operator journeys with verdict and reason references',async()=>{
  const html=await read('../../public/how-it-works/index.html');
  for(const phrase of [
    '60-second judge path',
    'Agent builder',
    'Operator',
    'Financial Mandate',
    'scenarioContext',
    'circuit_status',
    'circuit_evaluate_intent',
    'circuit_trace_briefing',
    'codex mcp add binance',
    'codex mcp add circuit',
    'live Binance market evidence',
    'simulation/default account-state',
  ]) assert.match(html,new RegExp(phrase,'i'));

  for(const verdict of ['ALLOW','RESIZE','REVIEW','BLOCK','PAUSE']) assert.match(html,new RegExp(`>${verdict}<`));
  for(const code of [
    'ORDER_CAP_EXCEEDED',
    'DAILY_BUDGET_EXCEEDED',
    'PRODUCT_NOT_ALLOWED',
    'EVIDENCE_STALE',
    'DUPLICATE_SEMANTIC_INTENT',
    'ORDER_FREQUENCY_ANOMALY',
    'ABNORMAL_MARKET_REGIME',
    'UNCERTAIN_PRIOR_SETTLEMENT',
  ]) assert.match(html,new RegExp(code));
});

test('Mission Control exposes defensible decision intelligence instead of a synthetic score',async()=>{
  const [html,js]=await Promise.all([
    read('../../public/mission-control/index.html'),
    read('../../public/app.js'),
  ]);
  for(const id of [
    'decision-total','decision-allow','decision-contained','decision-review','decision-paused','trace-integrity',
    'latest-decision','latest-intent','latest-verdict','latest-reasons','latest-evidence-age',
  ]) assert.match(html,new RegExp(`id=["']${id}["']`));
  assert.match(html,/BINANCE AGENT OS/i);
  assert.match(html,/VERIFIED LIVE PROOF/i);
  assert.match(html,/href=["']\/proof\/["']/i);
  for(const filter of ['ALL','ALLOW','BLOCK','REVIEW','PAUSE']) assert.match(html,new RegExp(`data-trace-filter=["']${filter}["']`));
  assert.doesNotMatch(html,/id=["']runtime-score["']/);
  assert.match(js,/renderDecisionIntelligence/);
  assert.match(js,/renderLatestDecision/);
  assert.match(js,/activeTraceFilter/);
  assert.match(js,/data-trace-filter/);
});

const validIntent={
  agentId:'hardening-agent',semanticIntentId:'hardening-intent',userIntentMode:'TRANSACT',action:'BUY',product:'SPOT',symbol:'BNBUSDT',asset:'BNB',quoteAsset:'USDT',requestedUsd:8
};

test('typed intents reject invalid quantities instead of recording non-finite or non-positive values',()=>{
  for(const quantity of [0,-1,Number.NaN,Number.POSITIVE_INFINITY]){
    assert.throws(()=>createActionIntent({...validIntent,quantity}),/quantity must be positive/i);
  }
});

test('live market evidence rejects impossible ticker prices and spreads at normalization',()=>{
  const base={observedAt:'2026-09-07T14:01:49.500Z',ticker:{symbol:'BNBUSDT',price:745.5},book:{symbol:'BNBUSDT',spreadBps:0.13}};
  for(const price of [0,-1,Number.NaN,Number.POSITIVE_INFINITY]){
    assert.throws(()=>normalizeEvidence({...base,ticker:{...base.ticker,price}}),/ticker price must be positive/i);
  }
  for(const spreadBps of [-1,Number.NaN,Number.POSITIVE_INFINITY]){
    assert.throws(()=>normalizeEvidence({...base,book:{...base.book,spreadBps}}),/book spreadBps must be non-negative/i);
  }
});

async function withServer(fn){
  const services=createAppServices({dbPath:':memory:',mode:'simulation',now:'2026-09-07T14:01:50.000Z'});
  const server=createHttpServer(services);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  try{await fn(`http://127.0.0.1:${port}`,services)}finally{await new Promise(resolve=>server.close(resolve));services.close()}
}

async function evaluate(base,index,scenarioContext){
  const response=await fetch(`${base}/api/intents/evaluate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    intent:{...validIntent,agentId:`burst-agent-${index}`,semanticIntentId:`burst-intent-${index}`},
    scenarioContext,
  })});
  return {status:response.status,body:await response.json()};
}

test('small concurrent evaluation burst stays deterministic and creates unique traces',async()=>withServer(async(base)=>{
  const scenarioContext={price:745.5,observedAt:'2026-09-07T14:01:49.500Z',tickerObservedAt:'2026-09-07T14:01:49.000Z',bookObservedAt:'2026-09-07T14:01:49.500Z',spreadBps:0.13};
  const results=await Promise.all(Array.from({length:12},(_,index)=>evaluate(base,index,scenarioContext)));
  assert.ok(results.every(result=>result.status===200));
  assert.ok(results.every(result=>result.body.data.decision==='ALLOW'));
  assert.equal(new Set(results.map(result=>result.body.data.traceId)).size,12);
}));

test('future-dated evidence fails closed as EVIDENCE_STALE',async()=>withServer(async(base)=>{
  const scenarioContext={price:745.5,observedAt:'2026-09-07T14:02:00.000Z',tickerObservedAt:'2026-09-07T14:02:00.000Z',bookObservedAt:'2026-09-07T14:02:00.000Z',spreadBps:0.13};
  const result=await evaluate(base,'future',scenarioContext);
  assert.equal(result.status,200);
  assert.equal(result.body.data.decision,'BLOCK');
  assert.ok(result.body.data.reasonCodes.includes('EVIDENCE_STALE'));
}));
