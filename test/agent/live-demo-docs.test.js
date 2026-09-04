import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=(path)=>readFile(path,'utf8');

test('live Agent OS demo profile pins official Binance and CIRCUIT MCP endpoints', async ()=>{
  const [config,profile,runbook]=await Promise.all([
    read('agent/codex-config.example.toml'),
    read('agent/CIRCUIT_SUPERVISOR.md'),
    read('docs/AGENT_OS_LIVE_DEMO.md')
  ]);
  for(const text of [config,runbook]){
    assert.match(text,/https:\/\/agent\.binance\.com\/mcp\/agentic/);
    assert.match(text,/https:\/\/circuit-agent-os\.netlify\.app\/mcp\/circuit/);
  }
  assert.match(profile,/circuit_evaluate_intent/);
  assert.match(profile,/never call any Binance write/i);
  assert.match(profile,/ALLOW.*human approval/is);
  assert.match(runbook,/market data only/i);
  assert.match(runbook,/\$100/);
  assert.match(runbook,/ORDER_CAP_EXCEEDED/);
  assert.match(runbook,/\$8/);
  assert.match(runbook,/stop at.*approval/i);
});
