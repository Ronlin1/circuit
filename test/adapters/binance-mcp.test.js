import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { BinanceMcpAdapter } from '../../src/adapters/binance-mcp.js';

async function fakeMcp(handler,fn){
  const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${server.address().port}/mcp`;
  try{await fn(url);}finally{await new Promise(r=>server.close(r));}
}
const readBody=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return JSON.parse(Buffer.concat(chunks).toString('utf8'))};
const reply=(res,payload,status=200,headers={})=>{res.writeHead(status,{'content-type':'application/json',...headers});res.end(JSON.stringify(payload))};

test('modern MCP tools/list uses 2026 stateless routing headers', async()=>fakeMcp(async(req,res)=>{
  const body=await readBody(req);
  assert.equal(req.headers['mcp-protocol-version'],'2026-07-28');
  assert.equal(req.headers['mcp-method'],'tools/list');
  assert.equal(body.method,'tools/list');
  assert.equal(body.params._meta['io.modelcontextprotocol/clientInfo'].name,'circuit');
  reply(res,{jsonrpc:'2.0',id:body.id,result:{tools:[{name:'market.ticker',description:'ticker',inputSchema:{type:'object'}}]}});
},async url=>{
  const adapter=new BinanceMcpAdapter({url});
  const tools=await adapter.listTools();
  assert.equal(tools[0].name,'market.ticker');
}));

test('tools/call sends Mcp-Name and parses structured content', async()=>fakeMcp(async(req,res)=>{
  const body=await readBody(req);
  assert.equal(req.headers['mcp-method'],'tools/call');
  assert.equal(req.headers['mcp-name'],'market.ticker');
  assert.equal(body.params.name,'market.ticker');
  reply(res,{jsonrpc:'2.0',id:body.id,result:{structuredContent:{symbol:'BNBUSDT',price:700}}});
},async url=>{
  const adapter=new BinanceMcpAdapter({url});
  const result=await adapter.callTool('market.ticker',{symbol:'BNBUSDT'});
  assert.equal(result.structuredContent.price,700);
}));

test('401 fails closed without leaking bearer token', async()=>fakeMcp(async(_req,res)=>reply(res,{error:'unauthorized'},401),async url=>{
  const secret='super-secret-binance-token';
  const adapter=new BinanceMcpAdapter({url,bearerToken:secret});
  await assert.rejects(()=>adapter.listTools(),error=>error.code==='MCP_AUTH_REQUIRED'&&!error.message.includes(secret));
}));

test('legacy handshake fallback preserves MCP session id', async()=>{
  let initialized=false;let sessionSeen=false;
  await fakeMcp(async(req,res)=>{
    const body=await readBody(req);
    if(req.headers['mcp-protocol-version']==='2026-07-28') return reply(res,{jsonrpc:'2.0',id:body.id,error:{code:-32600,message:'modern envelope unsupported'}},400);
    if(body.method==='initialize') return reply(res,{jsonrpc:'2.0',id:body.id,result:{protocolVersion:'2025-11-25',capabilities:{tools:{}},serverInfo:{name:'fake',version:'1'}}},200,{'mcp-session-id':'session-123'});
    if(body.method==='notifications/initialized'){initialized=true;res.writeHead(202);return res.end();}
    if(body.method==='tools/list'){sessionSeen=req.headers['mcp-session-id']==='session-123';return reply(res,{jsonrpc:'2.0',id:body.id,result:{tools:[{name:'legacy.tool'}]}});}
    reply(res,{jsonrpc:'2.0',id:body.id,error:{code:-32601,message:'unknown'}},404);
  },async url=>{
    const adapter=new BinanceMcpAdapter({url});
    const tools=await adapter.listTools();
    assert.equal(tools[0].name,'legacy.tool');
    assert.equal(initialized,true);assert.equal(sessionSeen,true);
  });
});

test('financial adapter fails closed until required capability mapping is configured', async()=>fakeMcp(async(req,res)=>{
  const body=await readBody(req);
  reply(res,{jsonrpc:'2.0',id:body.id,result:{tools:[{name:'market.ticker',description:'Public ticker'}]}});
},async url=>{
  const adapter=new BinanceMcpAdapter({url});
  await assert.rejects(()=>adapter.getMarketEvidence({symbol:'BNBUSDT',semanticIntentId:'s1'}),error=>error.code==='MCP_CAPABILITY_MAPPING_REQUIRED');
  await assert.rejects(()=>adapter.execute({product:'SPOT',symbol:'BNBUSDT',action:'BUY'},10),error=>error.code==='MCP_CAPABILITY_MAPPING_REQUIRED');
}));
