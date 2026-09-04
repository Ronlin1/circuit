import { compileMandate } from '../mandate/compiler.js';
import { createActionIntent } from '../domain/intent.js';
import { runScenario } from '../scenarios/runner.js';
import { SCENARIOS } from '../scenarios/catalog.js';
import { verifyTraceChain } from '../trace/flight-recorder.js';

export function sendJson(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));}

async function readJson(req,maxBytes=65_536){
  let bytes=0; const chunks=[];
  for await (const chunk of req){bytes+=chunk.length;if(bytes>maxBytes) throw Object.assign(new Error('BODY_TOO_LARGE'),{statusCode:413});chunks.push(chunk);}
  if(!chunks.length) return {};
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('INVALID_JSON'),{statusCode:400});}
}

export async function routeRequest(req,res,services){
  const url=new URL(req.url,'http://circuit.local'); const path=url.pathname;
  if(req.method==='GET'&&path==='/api/health') return sendJson(res,200,{ok:true,data:{status:'ready',mode:services.mode,adapter:services.adapter.constructor.name,traceChain:verifyTraceChain(services.recorder.list()).valid}});
  if(req.method==='GET'&&path==='/api/events') return services.events.connect(res);
  if(req.method==='GET'&&path==='/api/scenarios') return sendJson(res,200,{ok:true,data:SCENARIOS});
  if(req.method==='GET'&&path==='/api/mandates/current') return sendJson(res,200,{ok:true,data:services.getCurrentMandate()});
  if(req.method==='POST'&&path==='/api/mandates/compile'){
    const body=await readJson(req); const draft=compileMandate(body.text); services.storeMandate(draft); return sendJson(res,201,{ok:true,data:draft});
  }
  let match=path.match(/^\/api\/mandates\/([^/]+)\/activate$/);
  if(req.method==='POST'&&match){
    await readJson(req);
    const mandate=services.getMandate(match[1]);
    if(!mandate) return sendJson(res,404,{ok:false,error:{code:'MANDATE_NOT_FOUND'}});
    try{
      const active=services.activate(match[1],services.now);
      services.events.publish('mandate',active);
      return sendJson(res,200,{ok:true,data:active});
    }catch(error){
      if(error instanceof TypeError) return sendJson(res,409,{ok:false,error:{code:'MANDATE_ACTIVATION_CONFLICT',message:error.message}});
      throw error;
    }
  }
  match=path.match(/^\/api\/mandates\/([^/]+)$/);
  if(req.method==='GET'&&match){const mandate=services.getMandate(match[1]);return mandate?sendJson(res,200,{ok:true,data:mandate}):sendJson(res,404,{ok:false,error:{code:'MANDATE_NOT_FOUND'}});}
  if(req.method==='POST'&&path==='/api/intents/evaluate'){
    const body=await readJson(req); const intent=createActionIntent(body.intent??body); const mandate=services.getMandate(body.mandateId)??services.getCurrentMandate(); const trace=await services.gateway.evaluate(intent,{mandate,now:services.now,scenarioContext:body.scenarioContext??{}});services.events.publish('trace',trace);services.events.publish('runtime',{agentId:intent.agentId,state:services.gateway.runtimeState(intent.agentId)});return sendJson(res,200,{ok:true,data:trace});
  }
  match=path.match(/^\/api\/intents\/([^/]+)\/execute$/);
  if(req.method==='POST'&&match){await readJson(req);try{const result=await services.gateway.executeEvaluated(match[1]);services.events.publish('execution',result);return sendJson(res,200,{ok:true,data:result});}catch(error){return sendJson(res,409,{ok:false,error:{code:'TRACE_NOT_EXECUTABLE',message:error.message}});}}
  if(req.method==='GET'&&path==='/api/traces') return sendJson(res,200,{ok:true,data:services.recorder.list()});
  match=path.match(/^\/api\/traces\/([^/]+)$/);
  if(req.method==='GET'&&match){const trace=services.recorder.get(match[1]);return trace?sendJson(res,200,{ok:true,data:trace}):sendJson(res,404,{ok:false,error:{code:'TRACE_NOT_FOUND'}});}
  match=path.match(/^\/api\/runtime\/([^/]+)\/recover$/);
  if(req.method==='POST'&&match){await readJson(req);const state=services.gateway.recover(match[1]);const data={agentId:match[1],state};services.events.publish('runtime',data);return sendJson(res,200,{ok:true,data});}
  match=path.match(/^\/api\/runtime\/([^/]+)$/);
  if(req.method==='GET'&&match) return sendJson(res,200,{ok:true,data:{agentId:match[1],state:services.gateway.runtimeState(match[1])}});
  match=path.match(/^\/api\/scenarios\/([^/]+)\/run$/);
  if(req.method==='POST'&&match){await readJson(req);if(!SCENARIOS[match[1]]) return sendJson(res,404,{ok:false,error:{code:'SCENARIO_NOT_FOUND'}});const data=await runScenario(match[1],{gateway:services.gateway,mandate:services.getCurrentMandate(),adapter:services.adapter,now:services.now});services.events.publish('scenario',{id:match[1],decision:data.trace.decision});services.events.publish('trace',data.trace);services.events.publish('runtime',{agentId:data.trace.agentId,state:services.gateway.runtimeState(data.trace.agentId)});return sendJson(res,200,{ok:true,data});}
  return sendJson(res,404,{ok:false,error:{code:'NOT_FOUND'}});
}
