import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServices } from '../../src/app/services.js';
import { createHttpServer } from '../../src/server/http.js';

async function withServer(fn) {
  const services=createAppServices({dbPath:':memory:',mode:'simulation',now:'2026-09-03T12:01:00.000Z'});
  const server=createHttpServer(services);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  try { await fn(`http://127.0.0.1:${port}`,services); }
  finally { await new Promise(resolve=>server.close(resolve)); services.close(); }
}

async function json(url,options={}) {
  const response=await fetch(url,{headers:{'content-type':'application/json',...(options.headers??{})},...options});
  return {status:response.status,body:await response.json()};
}

test('health and current mandate endpoints expose safe operating state', async()=>withServer(async(base)=>{
  const health=await json(`${base}/api/health`);
  assert.equal(health.status,200);
  assert.equal(health.body.ok,true);
  assert.equal(health.body.data.mode,'SIMULATION');
  const current=await json(`${base}/api/mandates/current`);
  assert.equal(current.body.data.status,'ACTIVE');
  assert.equal(current.body.data.maxOrderUsd,10);
}));

test('compile returns DRAFT and activation is a separate explicit call', async()=>withServer(async(base)=>{
  const compiled=await json(`${base}/api/mandates/compile`,{method:'POST',body:JSON.stringify({text:'Spot only. Assets: BNB, USDT. Maximum $7 per order and $21 per day.'})});
  assert.equal(compiled.status,201);
  assert.equal(compiled.body.data.status,'DRAFT');
  const activated=await json(`${base}/api/mandates/${compiled.body.data.id}/activate`,{method:'POST',body:'{}'});
  assert.equal(activated.status,200);
  assert.equal(activated.body.data.status,'ACTIVE');
}));

test('invalid control-plane input maps to stable HTTP 400 validation errors', async()=>withServer(async(base)=>{
  const compiled=await json(`${base}/api/mandates/compile`,{method:'POST',body:JSON.stringify({text:''})});
  assert.equal(compiled.status,400);
  assert.equal(compiled.body.ok,false);
  assert.equal(compiled.body.error.code,'INPUT_VALIDATION_ERROR');
}));

test('mandate activation distinguishes missing mandates from activation conflicts', async()=>withServer(async(base)=>{
  const missing=await json(`${base}/api/mandates/does-not-exist/activate`,{method:'POST',body:'{}'});
  assert.equal(missing.status,404);
  assert.equal(missing.body.error.code,'MANDATE_NOT_FOUND');

  const compiled=await json(`${base}/api/mandates/compile`,{method:'POST',body:JSON.stringify({text:'Spot only. Assets: BNB, USDT. Maximum $7 per order and $21 per day.'})});
  const first=await json(`${base}/api/mandates/${compiled.body.data.id}/activate`,{method:'POST',body:'{}'});
  assert.equal(first.status,200);
  const second=await json(`${base}/api/mandates/${compiled.body.data.id}/activate`,{method:'POST',body:'{}'});
  assert.equal(second.status,409);
  assert.equal(second.body.error.code,'MANDATE_ACTIVATION_CONFLICT');
}));

test('scenario run writes traces and exposes runtime state', async()=>withServer(async(base)=>{
  const run=await json(`${base}/api/scenarios/oversize-order/run`,{method:'POST',body:'{}'});
  assert.equal(run.status,200);
  assert.equal(run.body.data.trace.decision,'BLOCK');
  const traces=await json(`${base}/api/traces`);
  assert.ok(traces.body.data.length>=1);
  const agentId=encodeURIComponent(run.body.data.trace.agentId);
  const runtime=await json(`${base}/api/runtime/${agentId}`);
  assert.equal(runtime.body.data.state,'HEALTHY');
}));

test('paused runtime requires explicit recovery endpoint', async()=>withServer(async(base)=>{
  const run=await json(`${base}/api/scenarios/duplicate-retry-loop/run`,{method:'POST',body:'{}'});
  assert.equal(run.body.data.trace.decision,'PAUSE');
  const agentId=encodeURIComponent(run.body.data.trace.agentId);
  const before=await json(`${base}/api/runtime/${agentId}`);
  assert.equal(before.body.data.state,'PAUSED');
  const recovered=await json(`${base}/api/runtime/${agentId}/recover`,{method:'POST',body:'{}'});
  assert.equal(recovered.body.data.state,'HEALTHY');
}));
