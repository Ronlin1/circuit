import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(relative){return readFile(new URL(relative,import.meta.url),'utf8')}

test('README exposes a 60-second judge path and the verified Agent OS proof', async()=>{
  const readme=await read('../../README.md');
  for(const phrase of [
    '60-second judge path',
    'Agent OS Proof',
    'Judge Mode',
    '745.63',
    '745.50',
    '0.684',
    '0.645',
    'ORDER_CAP_EXCEEDED',
    'DAILY_BUDGET_EXCEEDED',
    '5fba99e4-8280-45d2-bdaa-61da16f219a3',
    '777aeb09-5106-447b-8329-c25a1cfa298c',
    '0 Binance writes',
    'simulation/default',
    'not live Binance account data',
  ]) assert.match(readme,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'));
  assert.match(readme,/https:\/\/circuit-agent-os\.netlify\.app\/proof\//i);
  assert.match(readme,/https:\/\/circuit-agent-os\.netlify\.app\/simulation\/#judge-mode/i);
  assert.doesNotMatch(readme,/live trade (?:was )?executed/i);
});

test('submission package records final deliverables and public-repo gate without claiming they are already complete', async()=>{
  const submission=await read('../../docs/SUBMISSION.md');
  for(const phrase of [
    'Track A',
    'Live demo',
    'Agent OS Proof',
    'Judge Mode',
    'GitHub',
    'video',
    'X post',
    'survey',
    'public repository',
    'secret scan',
    '0 Binance writes',
  ]) assert.match(submission,new RegExp(phrase,'i'));
  assert.match(submission,/\[ \].*public repository/i);
  assert.match(submission,/\[ \].*video/i);
  assert.match(submission,/\[ \].*X post/i);
  assert.match(submission,/\[ \].*survey/i);
});

test('release checklist includes Phase 2 proof surfaces and the final visibility/submission gate', async()=>{
  const checklist=await read('../../docs/RELEASE_CHECKLIST.md');
  for(const phrase of [
    'Agent OS Proof',
    'Judge Mode',
    '8 / 8',
    'public repository',
    'final secret scan',
    'submission video',
    'X post',
    'survey',
  ]) assert.match(checklist,new RegExp(phrase,'i'));
});
