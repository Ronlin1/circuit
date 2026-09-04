import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pages=[
  ['home','../../public/index.html'],
  ['mission-control','../../public/mission-control/index.html'],
  ['simulation','../../public/simulation/index.html'],
  ['how-it-works','../../public/how-it-works/index.html'],
  ['live-agents','../../public/live-agents/index.html'],
  ['about','../../public/about/index.html'],
];

async function read(relative){return readFile(new URL(relative,import.meta.url),'utf8')}

test('all product pages exist and share primary navigation', async()=>{
  for(const [name,path] of pages){
    const html=await read(path);
    assert.match(html,/class=["'][^"']*site-nav/,`${name} should include site nav`);
    for(const href of ['/', '/mission-control/', '/simulation/', '/how-it-works/', '/live-agents/', '/about/']){
      assert.match(html,new RegExp(`href=["']${href.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`),`${name} nav should link ${href}`);
    }
    assert.match(html,/href=["']\/assets\/circuit-mark\.svg["']/i,`${name} should use CIRCUIT mark as favicon`);
    assert.match(html,/src=["']\/assets\/circuit-mark\.svg["']/i,`${name} should use CIRCUIT mark in navbar`);
  }
});

test('public CIRCUIT mark is byte-identical to the canonical GitHub mark', async()=>{
  const [publicMark,canonicalMark]=await Promise.all([
    read('../../public/assets/circuit-mark.svg'),
    read('../../docs/assets/circuit-mark.svg'),
  ]);
  assert.equal(publicMark,canonicalMark);
});

test('shared product shell provides health-driven live status on every page', async()=>{
  for(const [name,path] of pages){
    const html=await read(path);
    assert.match(html,/src=["']\/shared\.js["']/i,`${name} should load shared shell behavior`);
    assert.match(html,/data-live-indicator/,`${name} should expose live status hook`);
  }
  const js=await read('../../public/shared.js');
  assert.match(js,/fetch\(['"]\/api\/health['"],/);
  assert.match(js,/is-live/);
  assert.match(js,/DEGRADED/);
});

test('CIRCUIT hero orbits intent policy drift and execution around the core', async()=>{
  const html=await read('../../public/index.html');
  for(const label of ['INTENT','POLICY','DRIFT','EXECUTION']){
    assert.match(html,new RegExp(`<span[^>]+orbit-label[^>]*>${label}<\\/span>`));
  }
  const [baseCss,productCss]=await Promise.all([read('../../public/styles.css'),read('../../public/product.css')]);
  const css=`${baseCss}\n${productCss}`;
  assert.match(css,/@keyframes\s+orbitSpin/);
  assert.match(css,/@keyframes\s+orbitCounter/);
  assert.match(css,/@keyframes\s+livePulse/);
  assert.match(css,/\.live-indicator\.is-live/);
});

test('Mission Control owns the operational dashboard while Home stays judge-facing', async()=>{
  const [home,mission,js]=await Promise.all([
    read('../../public/index.html'),
    read('../../public/mission-control/index.html'),
    read('../../public/app.js'),
  ]);
  assert.doesNotMatch(home,/id=["']mandate-card["']/);
  for(const id of ['environment-badge','runtime-state','dashboard-boot-state','mandate-card','runtime-health','activity-timeline','trace-inspector','recover-agent']){
    assert.match(mission,new RegExp(`id=["']${id}["']`));
  }
  assert.match(js,/dashboard-boot-state/);
  assert.match(js,/READY/);
  assert.match(js,/ERROR/);
});

const expectedScenarioVerdicts={
  'safe-spot-buy':'ALLOW',
  'oversize-order':'BLOCK',
  'forbidden-futures':'BLOCK',
  'duplicate-retry-loop':'PAUSE',
  'frequency-breaker':'PAUSE',
  'stale-evidence':'BLOCK',
  'regime-drift':'REVIEW',
  'prompt-injection':'BLOCK',
};

test('Simulation Lab exposes all deterministic scenarios with expected verdicts', async()=>{
  const html=await read('../../public/simulation/index.html');
  assert.match(html,/src=["']\/simulation\.js["']/i);
  assert.match(html,/id=["']simulation-result["']/);
  assert.match(html,/id=["']simulation-history["']/);
  for(const [id,verdict] of Object.entries(expectedScenarioVerdicts)){
    assert.match(html,new RegExp(`data-scenario=["']${id}["']`));
    assert.match(html,new RegExp(`data-expected=["']${verdict}["']`));
  }
  const js=await read('../../public/simulation.js');
  assert.match(js,/\/api\/scenarios\/\$\{id\}\/run/);
  assert.match(js,/actual/);
  assert.match(js,/expected/);
  assert.match(js,/reasonCodes/);
});

test('How it Works explains the complete CIRCUIT control path and immutable veto', async()=>{
  const html=await read('../../public/how-it-works/index.html');
  for(const phrase of ['FINANCIAL MANDATE','POLICY ENGINE','RUNTIME DRIFT','FLIGHT RECORDER','EXECUTION GATEWAY','fail closed']){
    assert.match(html,new RegExp(phrase,'i'));
  }
  assert.match(html,/AI can (?:interpret|reason)[\s\S]*deterministic code owns the veto/i);
});

test('Live Agents documents only safe MCP tools and the production hardening boundary', async()=>{
  const html=await read('../../public/live-agents/index.html');
  for(const tool of ['circuit_status','circuit_evaluate_intent','circuit_trace_briefing']) assert.match(html,new RegExp(tool));
  assert.doesNotMatch(html,/circuit_execute/);
  for(const phrase of ['simulation-first','authentication','durable persistence','rate limiting','observability','incident recovery','Binance Agent OS']){
    assert.match(html,new RegExp(phrase,'i'));
  }
  assert.match(html,/does not enable live financial execution/i);
});

test('About tells the CIRCUIT origin story without inventing a trading-performance claim', async()=>{
  const html=await read('../../public/about/index.html');
  assert.match(html,/Binance Agent OS Mini Hackathon/i);
  assert.match(html,/after an AI agent receives permission to act/i);
  assert.match(html,/runtime supervision/i);
  assert.doesNotMatch(html,/guarantee(?:d)? profit/i);
});
