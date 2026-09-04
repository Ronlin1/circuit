import { routeRequest } from './router.js';
import { handleCircuitMcp } from '../mcp/circuit-server.js';

function classifyError(error){
  if(error instanceof TypeError) return {status:400,code:'INPUT_VALIDATION_ERROR',message:error.message};
  if(Number.isInteger(error?.statusCode)) return {status:error.statusCode,code:String(error.message||'REQUEST_ERROR'),message:String(error.message||'CIRCUIT rejected the request.')};
  return {status:500,code:'INTERNAL_ERROR',message:'CIRCUIT could not complete the request.'};
}

function nodeRequest(request,body){
  const url=new URL(request.url);
  const headers={};
  for(const [key,value] of request.headers) headers[key.toLowerCase()]=value;
  return {
    method:request.method,
    url:`${url.pathname}${url.search}`,
    headers,
    async *[Symbol.asyncIterator](){ if(body.length) yield body; }
  };
}

function responseCollector(){
  let status=200;
  let headers={};
  const chunks=[];
  return {
    get headersSent(){return chunks.length>0||Object.keys(headers).length>0;},
    writeHead(nextStatus,nextHeaders={}){status=nextStatus;headers={...headers,...nextHeaders};},
    end(chunk){if(chunk!==undefined&&chunk!==null)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(String(chunk)));},
    toResponse(){return new Response(chunks.length?Buffer.concat(chunks):null,{status,headers});}
  };
}

function jsonResponse(status,data){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}

export function createFetchHandler(services){
  return async function handleFetch(request){
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/api/events') return new Response(null,{status:204,headers:{'cache-control':'no-store'}});
    const body=Buffer.from(await request.arrayBuffer());
    const req=nodeRequest(request,body);
    const res=responseCollector();
    try{
      if(url.pathname==='/mcp/circuit') await handleCircuitMcp(req,res,services);
      else if(url.pathname.startsWith('/api/')) await routeRequest(req,res,services);
      else return jsonResponse(404,{ok:false,error:{code:'NOT_FOUND'}});
      return res.toResponse();
    }catch(error){
      const classified=classifyError(error);
      return jsonResponse(classified.status,{ok:false,error:{code:classified.code,message:classified.message}});
    }
  };
}
