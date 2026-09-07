import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServices } from '../../src/app/services.js';

test('runtime clock advances for a warm service when no fixed now is supplied',()=>{
  let current='2026-09-07T13:26:49.197Z';
  const services=createAppServices({dbPath:':memory:',mode:'simulation',clock:()=>current});
  try {
    assert.equal(services.now,current);
    assert.equal(services.currentTime(),current);
    current='2026-09-07T13:35:11.555Z';
    assert.equal(services.currentTime(),current);
  } finally { services.close(); }
});

test('explicit now keeps deterministic tests and scenarios pinned',()=>{
  const services=createAppServices({dbPath:':memory:',mode:'simulation',now:'2026-09-03T12:01:00.000Z',clock:()=> '2099-01-01T00:00:00.000Z'});
  try {
    assert.equal(services.now,'2026-09-03T12:01:00.000Z');
    assert.equal(services.currentTime(),'2026-09-03T12:01:00.000Z');
  } finally { services.close(); }
});
