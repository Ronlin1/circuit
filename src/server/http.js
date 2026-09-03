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
  const requestPath=url.pathname==='/'?'index.html':url.pathname.replace(/^\/+/, '');
  const safe=normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const path=join(PUBLIC_DIR,safe);
  if(!path.startsWith(PUBLIC_DIR)) return sendJson(res,404,{ok:false,error:{code:'NOT_FOUND'}});
  try{const body=await readFile(path);res.writeHead(200,{'content-type':MIME[extname(path)]??'application/octet-stream','cache-control':'no-cache'});res.end(body);}catch{return sendJson(res,404,{ok:false,error:{code:'NOT_FOUND'}});}
}

export function createHttpServer(services){
  return http.createServer(async(req,res)=>{
    try{if(req.url?.startsWith('/api/')) await routeRequest(req,res,services); else if(new URL(req.url,'http://circuit.local').pathname==='/mcp/circuit') await handleCircuitMcp(req,res,services); else await serveStatic(req,res);}catch(error){
      if(res.headersSent){res.end();return;}
      const status=error.statusCode??500;
      sendJson(res,status,{ok:false,error:{code:status===500?'INTERNAL_ERROR':error.message,message:status===500?'CIRCUIT could not complete the request.':error.message}});
    }
  });
}
