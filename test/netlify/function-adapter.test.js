import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServices } from '../../src/app/services.js';
import { createFetchHandler } from '../../src/server/fetch-handler.js';

function withHandler(fn){
  const services=createAppServices({dbPath:':memory:',mode:'simulation',now:'2026-09-04T08:00:00.000Z',realtime:false});
  const handler=createFetchHandler(services);
  return Promise.resolve(fn(handler,services)).finally(()=>services.close());
}

async function json(handler,path,options={}){
  const response=await handler(new Request(`https://circuit-agent-os.netlify.app${path}`,{
    headers:{'content-type':'application/json',...(options.headers??{})},
    ...options
  }));
  return {status:response.status,headers:response.headers,body:await response.json()};
}

test('fetch transport exposes serverless health without claiming realtime SSE',()=>withHandler(async(handler)=>{
  const response=await json(handler,'/api/health');
  assert.equal(response.status,200);
  assert.equal(response.body.ok,true);
  assert.equal(response.body.data.mode,'SIMULATION');
  assert.equal(response.body.data.realtime,false);
}));

test('fetch transport preserves deterministic scenario decisions',()=>withHandler(async(handler)=>{
  const response=await json(handler,'/api/scenarios/oversize-order/run',{method:'POST',body:'{}'});
  assert.equal(response.status,200);
  assert.equal(response.body.data.trace.decision,'BLOCK');
  assert.ok(response.body.data.trace.reasonCodes.includes('ORDER_CAP_EXCEEDED'));
}));

test('fetch transport preserves the advisory-only MCP surface',()=>withHandler(async(handler)=>{
  const response=await json(handler,'/mcp/circuit',{
    method:'POST',
    headers:{'mcp-protocol-version':'2026-07-28','mcp-method':'tools/list','accept':'application/json, text/event-stream'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{}})
  });
  assert.equal(response.status,200);
  assert.deepEqual(response.body.result.tools.map(tool=>tool.name).sort(),['circuit_evaluate_intent','circuit_status','circuit_trace_briefing']);
}));

test('fetch transport returns a finite no-stream response for the SSE route',()=>withHandler(async(handler)=>{
  const response=await handler(new Request('https://circuit-agent-os.netlify.app/api/events'));
  assert.equal(response.status,204);
  assert.equal(await response.text(),'');
}));

test('fetch transport keeps validation errors client-actionable',()=>withHandler(async(handler)=>{
  const response=await json(handler,'/api/mandates/compile',{method:'POST',body:JSON.stringify({text:''})});
  assert.equal(response.status,400);
  assert.equal(response.body.error.code,'INPUT_VALIDATION_ERROR');
}));

test('repository contains a Netlify function and publish configuration for API and MCP routes',async()=>{
  const {readFile,writeFile,mkdtemp,rm}=await import('node:fs/promises');
  const {spawnSync}=await import('node:child_process');
  const {resolve,join}=await import('node:path');
  const {tmpdir}=await import('node:os');
  const config=await readFile(resolve('netlify.toml'),'utf8');
  assert.match(config,/publish\s*=\s*["']public["']/);
  const fn=resolve('netlify/functions/circuit.mts');
  const source=await readFile(fn,'utf8');
  assert.match(source,/\/api\/\*/);
  assert.match(source,/\/mcp\/circuit/);
  assert.match(source,/createFetchHandler/);
  const scratch=await mkdtemp(join(tmpdir(),'circuit-netlify-fn-'));
  try{
    const checkFile=join(scratch,'circuit.mjs');
    await writeFile(checkFile,source);
    const syntax=spawnSync(process.execPath,['--check',checkFile],{encoding:'utf8'});
    assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);
  }finally{await rm(scratch,{recursive:true,force:true});}
});

test('release artifact packaging includes Netlify deployment files',async()=>{
  const {readFile}=await import('node:fs/promises');
  const workflow=await readFile(new URL('../../.github/workflows/ci.yml',import.meta.url),'utf8');
  assert.match(workflow,/^\s+netlify\s*$/m);
  assert.match(workflow,/^\s+netlify\.toml\s*$/m);
});
