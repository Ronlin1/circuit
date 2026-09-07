import test from 'node:test';
import assert from 'node:assert/strict';
import { runScenario } from '../../src/scenarios/runner.js';
import { createAppServices } from '../../src/app/services.js';

const EXPECTED = {
  'safe-spot-buy':'ALLOW',
  'oversize-order':'BLOCK',
  'forbidden-futures':'BLOCK',
  'duplicate-retry-loop':'PAUSE',
  'frequency-breaker':'PAUSE',
  'stale-evidence':'BLOCK',
  'regime-drift':'REVIEW',
  'prompt-injection':'BLOCK'
};

function scenarioServices(app) {
  return {
    gateway:app.gateway,
    mandate:app.getCurrentMandate(),
    adapter:app.adapter,
    now:app.currentTime()
  };
}

test('warm service reproduces all eight canonical verdicts for three consecutive Judge Mode passes', async () => {
  let now='2026-09-07T12:00:00.000Z';
  const app=createAppServices({clock:()=>now});
  now='2026-09-07T12:05:00.000Z';

  for (let pass=0; pass<3; pass += 1) {
    for (const [id,expected] of Object.entries(EXPECTED)) {
      const result=await runScenario(id,scenarioServices(app));
      assert.equal(result.trace.decision,expected,`pass ${pass + 1} ${id}`);
    }
    now=new Date(Date.parse(now)+60_000).toISOString();
  }

  app.close();
});

test('Judge Mode safe scenario is evaluation-only and never executes the adapter', async () => {
  const now='2026-09-07T12:00:00.000Z';
  const app=createAppServices({clock:()=>now});
  const before=app.adapter.executions.length;
  const result=await runScenario('safe-spot-buy',scenarioServices(app));

  assert.equal(result.trace.decision,'ALLOW');
  assert.equal(result.execution,null);
  assert.equal(app.adapter.executions.length,before);
  app.close();
});
