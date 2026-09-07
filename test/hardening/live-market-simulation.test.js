import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAppServices } from '../../src/app/services.js';
import { createHttpServer } from '../../src/server/http.js';

const read=(relative)=>readFile(new URL(relative,import.meta.url),'utf8');

const marketSnapshot={
  symbol:'BNBUSDT',
  price:745.5,
  bidPrice:745.5,
  askPrice:745.51,
  spreadBps:0.13413726266075887,
  tickerObservedAt:'2026-09-07T14:01:47.795Z',
  observedAt:'2026-09-07T14:01:49.500Z',
  source:'BINANCE_SPOT_PUBLIC_REST',
  readOnly:true,
};

test('Guide cards reserve safe corner space instead of clipping labels',async()=>{
  const css=await read('../../public/hardening.css');
  assert.match(css,/\.guide-section\{[^}]*border-radius:(?:14|16)px[^}]*padding:(?:26|28|30)px/i);
  assert.match(css,/\.judge-step[^}]*border-radius:(?:12|14)px[^}]*padding:(?:20|22|24)px/i);
  assert.match(css,/\.persona-card[^}]*padding:(?:20|22|24)px/i);
  assert.match(css,/\.verdict-card[^}]*padding:(?:20|22|24)px/i);
  assert.match(css,/\.reason-card[^}]*padding:(?:20|22|24)px/i);
});

test('Simulation page exposes a real live-market evaluation surface with explicit evidence boundary',async()=>{
  const [html,js]=await Promise.all([
    read('../../public/simulation/index.html'),
    read('../../public/simulation.js'),
  ]);
  for(const id of [
    'live-market-price','live-market-bid','live-market-ask','live-market-spread','live-market-age','live-market-source',
    'live-intent-usd','evaluate-live-intent','live-simulation-result','live-stream-status',
  ]) assert.match(html,new RegExp(`id=["']${id}["']`));
  assert.match(html,/LIVE BINANCE MARKET DATA/i);
  assert.match(html,/SIMULATED(?:\/DEFAULT)? ACCOUNT STATE/i);
  assert.match(html,/ZERO BINANCE WRITES/i);
  assert.match(js,/wss:\/\/stream\.binance\.com:9443\/stream\?streams=bnbusdt@trade\/bnbusdt@bookTicker/i);
  assert.match(js,/\/api\/market\/live\?symbol=BNBUSDT/);
  assert.match(js,/\/api\/live-simulation\/evaluate/);
  assert.match(js,/binanceWrites/);
});

test('default services expose a read-only Binance public market provider',()=>{
  const services=createAppServices({dbPath:':memory:',mode:'simulation',now:'2026-09-07T14:01:50.000Z'});
  try{assert.equal(typeof services.marketDataProvider,'function')}finally{services.close()}
});

async function withServer(fn){
  let marketCalls=0;
  const services=createAppServices({
    dbPath:':memory:',
    mode:'simulation',
    now:'2026-09-07T14:01:50.000Z',
    marketDataProvider:async(symbol)=>{
      marketCalls+=1;
      assert.equal(symbol,'BNBUSDT');
      return {...marketSnapshot};
    },
  });
  const server=createHttpServer(services);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  try{await fn(`http://127.0.0.1:${port}`,()=>marketCalls,services)}finally{await new Promise(resolve=>server.close(resolve));services.close()}
}

test('GET /api/market/live returns normalized read-only Binance market evidence',async()=>withServer(async(base,getCalls)=>{
  const response=await fetch(`${base}/api/market/live?symbol=BNBUSDT`);
  const payload=await response.json();
  assert.equal(response.status,200);
  assert.equal(payload.ok,true);
  assert.deepEqual(payload.data,marketSnapshot);
  assert.equal(getCalls(),1);
}));

test('live page evaluation fetches fresh market evidence server-side and never executes Binance writes',async()=>withServer(async(base,getCalls,services)=>{
  const evaluate=async(requestedUsd)=>{
    const response=await fetch(`${base}/api/live-simulation/evaluate`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({requestedUsd}),
    });
    return {status:response.status,payload:await response.json()};
  };

  assert.equal(services.adapter.executions.length,0);
  const blocked=await evaluate(100);
  assert.equal(blocked.status,200);
  assert.equal(blocked.payload.data.market.price,745.5);
  assert.equal(blocked.payload.data.trace.evidence.ticker.price,745.5);
  assert.equal(blocked.payload.data.trace.decision,'BLOCK');
  assert.ok(blocked.payload.data.trace.reasonCodes.includes('ORDER_CAP_EXCEEDED'));
  assert.ok(blocked.payload.data.trace.reasonCodes.includes('DAILY_BUDGET_EXCEEDED'));
  assert.equal(blocked.payload.data.binanceWrites,0);
  assert.equal(blocked.payload.data.accountState,'SIMULATION_DEFAULTS');
  assert.equal(services.adapter.executions.length,0);

  const allowed=await evaluate(8);
  assert.equal(allowed.status,200);
  assert.equal(allowed.payload.data.market.price,745.5);
  assert.equal(allowed.payload.data.trace.evidence.ticker.price,745.5);
  assert.equal(allowed.payload.data.trace.decision,'ALLOW');
  assert.deepEqual(allowed.payload.data.trace.reasonCodes,[]);
  assert.equal(allowed.payload.data.binanceWrites,0);
  assert.equal(allowed.payload.data.accountState,'SIMULATION_DEFAULTS');
  assert.equal(services.adapter.executions.length,0);
  assert.equal(getCalls(),2);
}));

test('Binance public provider implementation is read-only, non-caching and time-bounded',async()=>{
  const source=await read('../../src/market/binance-public.js').catch(()=> '');
  assert.match(source,/https:\/\/api\.binance\.com\/api\/v3\/ticker\/24hr/i);
  assert.match(source,/method:\s*['"]GET['"]/i);
  assert.doesNotMatch(source,/POST|DELETE|PUT|apiKey|authorization/i);
  assert.match(source,/cache:\s*['"]no-store['"]/i);
  assert.match(source,/AbortSignal\.timeout\(\s*[1-9][0-9]{2,4}\s*\)/);
  assert.match(source,/spreadBps/);
  assert.match(source,/closeTime/);
});

test('live evaluation reports write count from adapter execution state instead of a hard-coded constant',async()=>{
  const source=await read('../../src/server/router.js');
  assert.match(source,/executions\?\.length|executions\.length/);
  assert.doesNotMatch(source,/binanceWrites:\s*0\s*,\s*executionAttempted:false/);
});
