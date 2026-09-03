import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAppServices } from '../../src/app/services.js';
import { createHttpServer } from '../../src/server/http.js';

const scenarios=['safe-spot-buy','oversize-order','forbidden-futures','duplicate-retry-loop','frequency-breaker','stale-evidence','regime-drift','prompt-injection'];

test('mission control exposes required semantic hooks and all attack controls', async()=>{
  const html=await readFile(new URL('../../public/index.html',import.meta.url),'utf8');
  assert.match(html,/CIRCUIT/);
  assert.match(html,/Runtime Control Plane for Agentic Finance/);
  for(const id of ['environment-badge','runtime-state','mandate-card','runtime-health','activity-timeline','trace-inspector']) assert.match(html,new RegExp(`id=["']${id}["']`));
  for(const scenario of scenarios) assert.match(html,new RegExp(`data-scenario=["']${scenario}["']`));
});

test('brand system is black, yellow and white with accessible semantic tokens', async()=>{
  const css=await readFile(new URL('../../public/styles.css',import.meta.url),'utf8');
  assert.match(css,/--bg:\s*#0[0-9a-f]{5}/i);
  assert.match(css,/--accent:\s*#f0b90b/i);
  assert.match(css,/--text:\s*#f[0-9a-f]{5}/i);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/:focus-visible/);
});

test('HTTP server serves the mission control shell and assets', async()=>{
  const services=createAppServices({dbPath:':memory:',mode:'simulation',now:'2026-09-03T12:01:00.000Z'});
  const server=createHttpServer(services);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const page=await fetch(base); assert.equal(page.status,200); assert.match(await page.text(),/CIRCUIT/);
    const css=await fetch(`${base}/styles.css`); assert.equal(css.status,200); assert.match(css.headers.get('content-type'),/text\/css/);
  } finally { await new Promise(resolve=>server.close(resolve)); services.close(); }
});

test('mission control exposes the MCP-native agent interface without execution controls', async()=>{
  const html=await readFile(new URL('../../public/index.html',import.meta.url),'utf8');
  assert.match(html,/AGENT INTERFACE/);
  assert.match(html,/\/mcp\/circuit/);
  assert.match(html,/MCP 2026-07-28/);
  const panel=html.match(/<article[^>]+agent-interface-panel[\s\S]*?<\/article>/)?.[0]??'';
  assert.doesNotMatch(panel,/execute|recover|activate/i);
});
