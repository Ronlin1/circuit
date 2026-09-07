import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServices } from '../../src/app/services.js';
import { createHttpServer } from '../../src/server/http.js';

async function withWarmServer(fn){
  let current='2026-09-07T13:26:49.197Z';
  const services=createAppServices({dbPath:':memory:',mode:'simulation',clock:()=>current});
  const server=createHttpServer(services);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try { await fn({base,advance:value=>{current=value;}}); }
  finally { await new Promise(resolve=>server.close(resolve)); services.close(); }
}

async function evaluate(base,requestedUsd,semanticIntentId,scenarioContext){
  const response=await fetch(`${base}/mcp/circuit`,{
    method:'POST',
    headers:{'content-type':'application/json','accept':'application/json, text/event-stream'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'circuit_evaluate_intent',arguments:{
      intent:{agentId:'circuit-live-proof-agent',semanticIntentId,userIntentMode:'TRANSACT',action:'BUY',product:'SPOT',symbol:'BNBUSDT',asset:'BNB',quoteAsset:'USDT',requestedUsd,rationale:'live Binance evidence regression'},
      scenarioContext
    }}})
  });
  const body=await response.json();
  return body.result.structuredContent ?? JSON.parse(body.result.content[0].text);
}

test('warm MCP service evaluates fresh live evidence against request time, not cold-start time',async()=>withWarmServer(async({base,advance})=>{
  advance('2026-09-07T13:35:11.555Z');
  const scenarioContext={price:746.13,observedAt:'2026-09-07T13:35:11.555Z',tickerObservedAt:'2026-09-07T13:35:11.085Z',bookObservedAt:'2026-09-07T13:35:11.555Z',spreadBps:0.13402579996637165};

  const safe=await evaluate(base,8,'live-safe-8',scenarioContext);
  assert.equal(safe.evidence.ticker.price,746.13);
  assert.equal(safe.decision,'ALLOW');
  assert.ok(!safe.reasonCodes.includes('EVIDENCE_STALE'));

  const oversized=await evaluate(base,100,'live-block-100',scenarioContext);
  assert.equal(oversized.decision,'BLOCK');
  assert.ok(oversized.reasonCodes.includes('ORDER_CAP_EXCEEDED'));
  assert.ok(oversized.reasonCodes.includes('DAILY_BUDGET_EXCEEDED'));
  assert.ok(!oversized.reasonCodes.includes('EVIDENCE_STALE'));
}));
