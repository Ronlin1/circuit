import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson } from '../../src/trace/canonical-json.js';
import { FlightRecorder, verifyTraceChain } from '../../src/trace/flight-recorder.js';
import { createSqlitePersistence } from '../../src/persistence/sqlite.js';

test('canonicalJson sorts object keys recursively without reordering arrays', () => {
  const left = canonicalJson({z:1,a:{y:2,x:3},items:[{b:2,a:1},3]});
  const right = canonicalJson({items:[{a:1,b:2},3],a:{x:3,y:2},z:1});
  assert.equal(left, right);
  assert.equal(left, '{"a":{"x":3,"y":2},"items":[{"a":1,"b":2},3],"z":1}');
});

test('flight recorder links every trace to the previous hash', () => {
  const db = createSqlitePersistence(':memory:');
  const recorder = new FlightRecorder(db);
  const first = recorder.append({traceId:'t1',agentId:'a1',mandateId:'m1',mandateVersion:1,decision:'ALLOW',reasonCodes:[],timestamp:'2026-09-03T12:00:00Z'});
  const second = recorder.append({traceId:'t2',agentId:'a1',mandateId:'m1',mandateVersion:1,decision:'BLOCK',reasonCodes:['ORDER_CAP_EXCEEDED'],timestamp:'2026-09-03T12:00:01Z'});
  assert.equal(first.previousHash, 'GENESIS');
  assert.equal(second.previousHash, first.currentHash);
  assert.equal(verifyTraceChain(recorder.list()).valid, true);
});

test('trace verification detects tampering', () => {
  const db = createSqlitePersistence(':memory:');
  const recorder = new FlightRecorder(db);
  recorder.append({traceId:'t1',agentId:'a1',mandateId:'m1',mandateVersion:1,decision:'ALLOW',reasonCodes:[],timestamp:'2026-09-03T12:00:00Z'});
  recorder.append({traceId:'t2',agentId:'a1',mandateId:'m1',mandateVersion:1,decision:'BLOCK',reasonCodes:['ORDER_CAP_EXCEEDED'],timestamp:'2026-09-03T12:00:01Z'});
  const events = recorder.list();
  events[0].decision = 'BLOCK';
  const verification = verifyTraceChain(events);
  assert.equal(verification.valid, false);
  assert.equal(verification.brokenAt, 't1');
});

test('SQLite persistence round-trips structured trace payloads', () => {
  const db = createSqlitePersistence(':memory:');
  const recorder = new FlightRecorder(db);
  recorder.append({traceId:'t-sql',agentId:'agent-x',mandateId:'m',mandateVersion:2,intent:{requestedUsd:10},evidence:{observedAt:'2026-09-03T12:00:00Z'},decision:'ALLOW',reasonCodes:[],timestamp:'2026-09-03T12:00:00Z'});
  const stored = recorder.get('t-sql');
  assert.equal(stored.intent.requestedUsd, 10);
  assert.equal(stored.mandateVersion, 2);
  assert.ok(stored.currentHash.length === 64);
});
