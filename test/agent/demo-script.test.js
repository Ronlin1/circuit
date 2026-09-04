import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('supervisor demo proves unsafe intent is blocked and safe intent stops at approval', ()=>{
  const result=spawnSync(process.execPath,['scripts/run-supervisor-demo.js'],{cwd:process.cwd(),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/CIRCUIT SUPERVISOR AGENT PROOF/);
  assert.match(result.stdout,/\$100 BNB.*BLOCK.*ORDER_CAP_EXCEEDED/s);
  assert.match(result.stdout,/\$8 BNB.*ALLOW.*AWAITING_APPROVAL/s);
  assert.match(result.stdout,/Binance executions:\s*0/);
});
