import test from 'node:test';
import assert from 'node:assert/strict';
import { scanText } from '../../scripts/secret-scan.js';

test('detects high-risk credential patterns without returning the secret value', () => {
  const secret='ghp_'+'1234567890abcdefghijklmnopqrstuvwxyzABCD';
  const bearer='abc123-'+'real-token-value';
  const envName='BINANCE_MCP_'+'BEARER_TOKEN';
  const findings=scanText(`TOKEN=${secret}\n${envName}=${bearer}`,'fixture.env');
  assert.ok(findings.length>=2);
  const serialized=JSON.stringify(findings);
  assert.equal(serialized.includes(secret),false);
  assert.equal(serialized.includes(bearer),false);
});

test('detects private key blocks', () => {
  const findings=scanText('-----BEGIN '+'PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----','key.pem');
  assert.ok(findings.some(f=>f.rule==='PRIVATE_KEY'));
});

test('allows safe examples and placeholders', () => {
  for(const text of ['BINANCE_MCP_BEARER_TOKEN=','# BINANCE_MCP_BEARER_TOKEN=','BINANCE_MCP_BEARER_TOKEN=your-token-here','https://agent.binance.com/mcp/agentic','currentHash: 0123456789abcdef']){
    assert.deepEqual(scanText(text,'safe.txt'),[]);
  }
});
