import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('release exposes supervisor demo and Agent OS probe scripts and packages agent profile', async ()=>{
  const pkg=JSON.parse(await readFile('package.json','utf8'));
  const workflow=await readFile('.github/workflows/ci.yml','utf8');
  const readme=await readFile('README.md','utf8');

  assert.equal(pkg.scripts['agent:demo'],'node scripts/run-supervisor-demo.js');
  assert.equal(pkg.scripts['agent:probe'],'node scripts/agent-os-probe.js');
  assert.match(workflow,/^\s+agent\s*$/m);
  assert.match(readme,/CIRCUIT Supervisor Agent/);
  assert.match(readme,/AGENT_OS_LIVE_DEMO\.md/);
  assert.match(readme,/npm run agent:demo/);
});
