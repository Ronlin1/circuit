import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServices } from '../../src/app/services.js';
import { createHttpServer } from '../../src/server/http.js';

async function withServer(fn){
  const services=createAppServices({dbPath:':memory:',mode:'simulation',now:'2026-09-03T12:01:00.000Z'});
  const server=createHttpServer(services);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{await fn(base)}finally{await new Promise(resolve=>server.close(resolve));services.close()}
}

test('local server serves every static product route with directory-index parity', async()=>withServer(async(base)=>{
  for(const route of ['/', '/mission-control/', '/simulation/', '/how-it-works/', '/live-agents/', '/about/']){
    const response=await fetch(`${base}${route}`);
    assert.equal(response.status,200,`${route} should return 200`);
    assert.match(response.headers.get('content-type')??'',/text\/html/);
    assert.match(await response.text(),/CIRCUIT/);
  }
}));
