import test from 'node:test';
import assert from 'node:assert/strict';
import { transitionRuntime } from '../../src/runtime/state-machine.js';
import { RuntimeStore } from '../../src/runtime/runtime-store.js';

test('healthy warning enters WATCH and review enters DEGRADED', () => {
  assert.equal(transitionRuntime('HEALTHY',{type:'WARNING'}), 'WATCH');
  assert.equal(transitionRuntime('WATCH',{type:'REVIEW'}), 'DEGRADED');
});

test('pause and emergency are sticky without explicit recovery', () => {
  assert.equal(transitionRuntime('HEALTHY',{type:'PAUSE'}), 'PAUSED');
  assert.equal(transitionRuntime('PAUSED',{type:'NORMAL'}), 'PAUSED');
  assert.equal(transitionRuntime('PAUSED',{type:'RECOVER'}), 'HEALTHY');
  assert.equal(transitionRuntime('HEALTHY',{type:'EMERGENCY'}), 'EMERGENCY');
  assert.equal(transitionRuntime('EMERGENCY',{type:'NORMAL'}), 'EMERGENCY');
  assert.equal(transitionRuntime('EMERGENCY',{type:'RECOVER'}), 'PAUSED');
});

test('runtime store records recent intents and explicit state', () => {
  const store = new RuntimeStore();
  store.recordIntent({agentId:'agent-1',id:'i1',createdAt:'2026-09-03T12:00:00Z'});
  store.recordIntent({agentId:'agent-1',id:'i2',createdAt:'2026-09-03T12:00:10Z'});
  assert.deepEqual(store.recentIntents('agent-1'), [{agentId:'agent-1',id:'i1',createdAt:'2026-09-03T12:00:00Z'},{agentId:'agent-1',id:'i2',createdAt:'2026-09-03T12:00:10Z'}]);
  store.setState('agent-1','PAUSED');
  assert.equal(store.getState('agent-1'), 'PAUSED');
});
