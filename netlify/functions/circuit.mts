import { createAppServices } from '../../src/app/services.js';
import { createFetchHandler } from '../../src/server/fetch-handler.js';

let cachedHandler;

function getHandler(){
  if(!cachedHandler){
    const services=createAppServices({
      dbPath:'/tmp/circuit-netlify.db',
      mode:'simulation',
      realtime:false
    });
    cachedHandler=createFetchHandler(services);
  }
  return cachedHandler;
}

export default async (request) => getHandler()(request);

export const config={
  path:['/api/*','/mcp/circuit']
};
