import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeRequest, sendJson } from './router.js';
import { handleCircuitMcp } from '../mcp/circuit-server.js';

const PUBLIC_DIR=fileURLToPath(new URL('../../public/',import.meta.url));
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
async function serveStatic(req,res){
  const url=new URL(req.url,'http://circuit.local');
  const rawPath=url.pathname==='/'?'':url.pathname.replace(/^\/+/, '');
  const requestPath=rawPath===''?'index.html':rawPath.endsWith('/')?`${rawPath}index.html`:rawPath;
  const safe=normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const path=join(PUBLIC_DIR,safe);
  if(!path.startsWith(PUBLIC_DIR)) return sendJson(res,404,{ok:false,error:{code:'NOT_FOUND'}});
  try{const body=await readFile(path);res.writeHead(200,{'content-type':MIME[extname(path)]??'application/octet-stream','cache-control':'no-cache'});res.end(body);}catch{return sendJson(res,404,{ok:false,error:{code:'NOT_FOUND'}});}
}

function httpError(error){
  if(error instanceof TypeError) return {status:400,code:'INPUT_VALIDATION_ERROR',message:error.message};
  if(Number.isInteger(error?.statusCode)) return {status:error.statusCode,code:String(error.message||'REQUEST_ERROR'),message:String(error.message||'CIRCUIT rejected the request.')};
  return {status:500,code:'INTERNAL_ERROR',message:'CIRCUIT could not complete the request.'};
}

export function createHttpServer(services){
  return http.createServer(async(req,res)=>{
    try{if(req.url?.startsWith('/api/')) await routeRequest(req,res,services); else if(new URL(req.url,'http://circuit.local').pathname==='/mcp/circuit') await handleCircuitMcp(req,res,services); else await serveStatic(req,res);}catch(error){
      if(res.headersSent){res.end();return;}
      const classified=httpError(error);
      sendJson(res,classified.status,{ok:false,error:{code:classified.code,message:classified.message}});
    }
  });
}
