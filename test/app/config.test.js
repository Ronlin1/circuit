import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuntimeConfig } from '../../src/app/config.js';

test('uses local persistent sqlite path outside serverless hosting', () => {
  assert.deepEqual(resolveRuntimeConfig({}), {
    port: 3000,
    mode: 'simulation',
    dbPath: 'circuit.db'
  });
});

test('uses writable temporary sqlite path on Vercel', () => {
  assert.equal(resolveRuntimeConfig({ VERCEL: '1' }).dbPath, '/tmp/circuit.db');
});

test('explicit environment values override deployment defaults', () => {
  assert.deepEqual(resolveRuntimeConfig({
    VERCEL: '1',
    CIRCUIT_PORT: '4242',
    CIRCUIT_MODE: 'live',
    CIRCUIT_DB_PATH: '/tmp/custom.db'
  }), {
    port: 4242,
    mode: 'live',
    dbPath: '/tmp/custom.db'
  });
});
