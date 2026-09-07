import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServices } from '../../src/app/services.js';
import { createHttpServer } from '../../src/server/http.js';

async function withServer(fn) {
  const services=createAppServices({dbPath:':memory:',mode:'simulation',now:'2026-09-07T12:00:00.000Z'});
  const server=createHttpServer(services);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  try { await fn(`http://127.0.0.1:${port}`); }
  finally { await new Promise(resolve=>server.close(resolve)); services.close(); }
}

async function post(base,body,headers={}) {
  const response=await fetch(`${base}/mcp/circuit`,{
    method:'POST',
    headers:{'content-type':'application/json','accept':'application/json, text/event-stream',...headers},
    body:JSON.stringify(body)
  });
  return {status:response.status,body:await response.json()};
}

test('Codex 2025-06-18 handshake negotiates and can list CIRCUIT tools', async()=>withServer(async(base)=>{
  const initialized=await post(base,{
    jsonrpc:'2.0',id:1,method:'initialize',
    params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'codex-mcp-client',title:'Codex',version:'0.153.4'}}
  });
  assert.equal(initialized.status,200);
  assert.equal(initialized.body.result.protocolVersion,'2025-06-18');

  const listed=await post(base,{
    jsonrpc:'2.0',id:2,method:'tools/list',params:{}
  },{'mcp-protocol-version':'2025-06-18'});
  assert.equal(listed.status,200);
  assert.deepEqual(listed.body.result.tools.map(tool=>tool.name).sort(),[
    'circuit_evaluate_intent','circuit_status','circuit_trace_briefing'
  ]);
}));
