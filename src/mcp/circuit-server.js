import { createActionIntent } from '../domain/intent.js';
import { buildSupervisorBriefing } from '../supervisor/briefing.js';
import { verifyTraceChain } from '../trace/flight-recorder.js';

const MODERN_VERSION='2026-07-28';
const LEGACY_VERSION='2025-11-25';
const SERVER_INFO=Object.freeze({name:'circuit-runtime-control',version:'0.1.0'});
const SERVER_META=Object.freeze({'io.modelcontextprotocol/serverInfo':SERVER_INFO});

const TOOLS=Object.freeze([
  Object.freeze({
    name:'circuit_status',
    description:'Inspect CIRCUIT runtime state, active financial mandate, and audit-chain health. This tool cannot execute transactions or recover a paused agent.',
    inputSchema:{type:'object',properties:{agentId:{type:'string',description:'Optional worker agent identifier.'}},additionalProperties:false}
  }),
  Object.freeze({
    name:'circuit_evaluate_intent',
    description:'Submit a typed proposed financial action to CIRCUIT for deterministic policy and runtime-drift evaluation. Returns a trace and verdict but never executes it.',
    inputSchema:{type:'object',required:['intent'],properties:{intent:{type:'object',required:['agentId','semanticIntentId','userIntentMode','action','product','symbol','asset','quoteAsset','requestedUsd'],properties:{agentId:{type:'string'},semanticIntentId:{type:'string'},userIntentMode:{type:'string',enum:['READ_ONLY','TRANSACT']},action:{type:'string',enum:['BUY','SELL','CONVERT','TRANSFER']},product:{type:'string'},symbol:{type:'string'},asset:{type:'string'},quoteAsset:{type:'string'},requestedUsd:{type:'number'},quantity:{type:'number'},rationale:{type:'string'}},additionalProperties:false},scenarioContext:{type:'object'}},additionalProperties:false}
  }),
  Object.freeze({
    name:'circuit_trace_briefing',
    description:'Return an advisory-only supervisor briefing for an existing CIRCUIT trace. Agent rationale is explicitly marked untrusted and the recorded verdict is immutable.',
    inputSchema:{type:'object',required:['traceId'],properties:{traceId:{type:'string'}},additionalProperties:false}
  })
]);

function rpcHeaders(protocolVersion) {
  return {'content-type':'application/json; charset=utf-8','cache-control':'no-store',...(protocolVersion?{'mcp-protocol-version':protocolVersion}:{})};
}

function sendRpc(res,id,result,status=200,protocolVersion=MODERN_VERSION) {
  res.writeHead(status,rpcHeaders(protocolVersion));
  res.end(JSON.stringify({jsonrpc:'2.0',id:id??null,result}));
}

function sendRpcError(res,id,code,message,data,status=200,protocolVersion=MODERN_VERSION) {
  res.writeHead(status,rpcHeaders(protocolVersion));
  res.end(JSON.stringify({jsonrpc:'2.0',id:id??null,error:{code,message,...(data===undefined?{}:{data})}}));
}

async function readRpcBody(req,maxBytes=65_536) {
  let bytes=0; const chunks=[];
  for await (const chunk of req) {
    bytes+=chunk.length;
    if (bytes>maxBytes) throw Object.assign(new Error('Request body exceeds CIRCUIT MCP limit.'),{rpcCode:-32600,httpStatus:413});
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('Invalid JSON-RPC payload.'),{rpcCode:-32700,httpStatus:400}); }
}

function toolResult(data,{isError=false}={}) {
  const serializable=structuredClone(data);
  return {
    content:[{type:'text',text:JSON.stringify(serializable)}],
    structuredContent:serializable,
    isError,
    _meta:SERVER_META
  };
}

function mandateStatus(mandate) {
  if(!mandate) return null;
  return {
    id:mandate.id,version:mandate.version,status:mandate.status,
    allowedProducts:[...(mandate.allowedProducts??[])],allowedAssets:[...(mandate.allowedAssets??[])],
    maxOrderUsd:mandate.maxOrderUsd,maxDailySpendUsd:mandate.maxDailySpendUsd,
    maxAssetConcentrationPct:mandate.maxAssetConcentrationPct,maxDailyDrawdownPct:mandate.maxDailyDrawdownPct
  };
}

async function callTool(name,args,services) {
  if(name==='circuit_status') {
    const agentId=String(args?.agentId??'').trim();
    return toolResult({
      mode:services.mode,
      runtime:{agentId:agentId||null,state:agentId?services.gateway.runtimeState(agentId):null},
      mandate:mandateStatus(services.getCurrentMandate()),
      traceChain:verifyTraceChain(services.recorder.list()),
      executionExposed:false,
      recoveryExposed:false,
      mandateActivationExposed:false
    });
  }
  if(name==='circuit_evaluate_intent') {
    const intent=createActionIntent(args?.intent??{});
    const mandate=services.getCurrentMandate();
    const trace=await services.gateway.evaluate(intent,{mandate,now:services.now,scenarioContext:args?.scenarioContext??{}});
    services.events.publish('trace',trace);
    services.events.publish('runtime',{agentId:intent.agentId,state:services.gateway.runtimeState(intent.agentId)});
    return toolResult(trace);
  }
  if(name==='circuit_trace_briefing') {
    const traceId=String(args?.traceId??'').trim();
    const trace=services.recorder.get(traceId);
    if(!trace) return toolResult({code:'TRACE_NOT_FOUND',traceId},{isError:true});
    const mandate=services.getMandate(trace.mandateId)??services.getCurrentMandate();
    return toolResult(buildSupervisorBriefing(trace,mandate,services.gateway.runtimeState(trace.agentId)));
  }
  return toolResult({code:'MCP_TOOL_NOT_FOUND',message:'CIRCUIT does not expose this capability to agent clients.'},{isError:true});
}

function modernResultMeta(result={}) { return {...result,_meta:{...(result._meta??{}),...SERVER_META}}; }

export async function handleCircuitMcp(req,res,services) {
  if(req.method!=='POST') return sendRpcError(res,null,-32600,'CIRCUIT MCP accepts POST requests only.',undefined,405);
  let rpc;
  try { rpc=await readRpcBody(req); }
  catch(error) { return sendRpcError(res,null,error.rpcCode??-32600,error.message,undefined,error.httpStatus??400); }
  const id=rpc?.id??null;
  const method=rpc?.method;
  if(rpc?.jsonrpc!=='2.0'||typeof method!=='string') return sendRpcError(res,id,-32600,'Invalid JSON-RPC request.');

  if(method==='initialize') {
    const requested=rpc.params?.protocolVersion;
    if(requested!==LEGACY_VERSION) return sendRpcError(res,id,-32022,'UnsupportedProtocolVersion',{supported:[MODERN_VERSION,LEGACY_VERSION]},200,null);
    return sendRpc(res,id,{protocolVersion:LEGACY_VERSION,capabilities:{tools:{listChanged:false}},serverInfo:SERVER_INFO},200,null);
  }
  if(method==='notifications/initialized') {
    res.writeHead(202,{'cache-control':'no-store'});
    return res.end();
  }

  const version=String(req.headers['mcp-protocol-version']??rpc.params?._meta?.['io.modelcontextprotocol/protocolVersion']??'');
  const modern=version===MODERN_VERSION;
  const legacy=!version;
  if(!modern&&!legacy) return sendRpcError(res,id,-32022,'UnsupportedProtocolVersion',{supported:[MODERN_VERSION,LEGACY_VERSION]});
  const responseProtocol=modern?MODERN_VERSION:null;

  if(method==='server/discover') {
    if(!modern) return sendRpcError(res,id,-32022,'UnsupportedProtocolVersion',{supported:[MODERN_VERSION,LEGACY_VERSION]},200,responseProtocol);
    return sendRpc(res,id,modernResultMeta({capabilities:{tools:{listChanged:false}}}),200,responseProtocol);
  }
  if(method==='tools/list') return sendRpc(res,id,modern?modernResultMeta({tools:TOOLS}):{tools:TOOLS},200,responseProtocol);
  if(method==='tools/call') {
    try { return sendRpc(res,id,await callTool(rpc.params?.name,rpc.params?.arguments??{},services),200,responseProtocol); }
    catch(error) { return sendRpc(res,id,toolResult({code:'MCP_TOOL_INPUT_INVALID',message:error instanceof Error?error.message:'Invalid tool input.'},{isError:true}),200,responseProtocol); }
  }
  return sendRpcError(res,id,-32601,'Method not found.',undefined,200,responseProtocol);
}

export function listCircuitTools() { return structuredClone(TOOLS); }
