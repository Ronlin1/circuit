import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(relative){return readFile(new URL(relative,import.meta.url),'utf8')}

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

test('Agent OS Proof page documents the verified live Binance evidence run without overstating execution', async()=>{
  const html=await read('../../public/proof/index.html');
  assert.match(html,/BINANCE AGENT OS × CIRCUIT/i);
  assert.match(html,/VERIFIED LIVE PROOF/i);
  assert.match(html,/745\.63/);
  assert.match(html,/745\.50/);
  assert.match(html,/0\.684/);
  assert.match(html,/0\.645/);
  assert.match(html,/ORDER_CAP_EXCEEDED/);
  assert.match(html,/DAILY_BUDGET_EXCEEDED/);
  assert.match(html,/5fba99e4-8280-45d2-bdaa-61da16f219a3/);
  assert.match(html,/777aeb09-5106-447b-8329-c25a1cfa298c/);
  assert.match(html,/zero Binance (?:write|mutation)/i);
  assert.match(html,/simulation\/default/i);
  assert.match(html,/not live Binance account data/i);
  assert.doesNotMatch(html,/live trade (?:was )?executed/i);
});

test('Simulation Lab exposes one-click Judge Mode for all eight deterministic scenarios', async()=>{
  const [html,js]=await Promise.all([
    read('../../public/simulation/index.html'),
    read('../../public/simulation.js'),
  ]);
  assert.match(html,/id=["']run-judge-mode["']/);
  assert.match(html,/id=["']judge-mode-summary["']/);
  assert.match(html,/Run Judge Mode/i);
  for(const id of Object.keys(expectedScenarioVerdicts)) assert.match(html,new RegExp(`data-scenario=["']${id}["']`));
  assert.match(js,/async function runJudgeMode/);
  assert.match(js,/matchedCount/);
  assert.match(js,/expected/);
  assert.match(js,/actual/);
});

test('Proof is first-class in shared navigation and Home links judges directly to it', async()=>{
  const pagePaths=[
    '../../public/index.html',
    '../../public/mission-control/index.html',
    '../../public/simulation/index.html',
    '../../public/how-it-works/index.html',
    '../../public/live-agents/index.html',
    '../../public/about/index.html',
    '../../public/proof/index.html',
  ];
  for(const path of pagePaths){
    const html=await read(path);
    assert.match(html,/href=["']\/proof\/["']/);
  }
  const home=await read('../../public/index.html');
  assert.match(home,/View Agent OS Proof/i);
});
