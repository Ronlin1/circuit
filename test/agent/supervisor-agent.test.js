import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServices } from '../../src/app/services.js';
import { CircuitSupervisorAgent } from '../../src/agent/supervisor-agent.js';

const NOW='2026-09-05T00:00:00.000Z';

function proposal(requestedUsd,{semanticIntentId=`intent-${requestedUsd}`}={}){
  return {
    semanticIntentId,
    userIntentMode:'TRANSACT',
    action:'BUY',
    product:'SPOT',
    symbol:'BNBUSDT',
    asset:'BNB',
    quoteAsset:'USDT',
    requestedUsd,
    rationale:`User requested a $${requestedUsd} BNB proof intent.`
  };
}

function plannerFor(value){
  return {
    calls:[],
    async plan(input){this.calls.push(input);return proposal(value);}
  };
}

test('BLOCKed proposal is contained and never reaches execution', async (t)=>{
  const services=createAppServices({now:NOW});
  t.after(()=>services.close());
  const planner=plannerFor(100);
  let approvalCalls=0;
  const agent=new CircuitSupervisorAgent({planner,services,approvalGate:async()=>{approvalCalls++;return true;}});

  const result=await agent.run({goal:'Buy $100 of BNB',execute:true});

  assert.equal(result.status,'CONTAINED');
  assert.equal(result.trace.decision,'BLOCK');
  assert.ok(result.trace.reasonCodes.includes('ORDER_CAP_EXCEEDED'));
  assert.equal(approvalCalls,0);
  assert.equal(services.adapter.executions.length,0);
});

test('ALLOWed proposal stops at explicit approval when execute is false', async (t)=>{
  const services=createAppServices({now:NOW});
  t.after(()=>services.close());
  const planner=plannerFor(8);
  let approvalCalls=0;
  const agent=new CircuitSupervisorAgent({planner,services,approvalGate:async()=>{approvalCalls++;return true;}});

  const result=await agent.run({goal:'Buy $8 of BNB'});

  assert.equal(result.status,'AWAITING_APPROVAL');
  assert.equal(result.trace.decision,'ALLOW');
  assert.equal(result.approved,false);
  assert.equal(approvalCalls,0);
  assert.equal(services.adapter.executions.length,0);
});

test('human-declined ALLOW never reaches execution', async (t)=>{
  const services=createAppServices({now:NOW});
  t.after(()=>services.close());
  const agent=new CircuitSupervisorAgent({planner:plannerFor(8),services,approvalGate:async()=>false});

  const result=await agent.run({goal:'Buy $8 of BNB',execute:true});

  assert.equal(result.status,'APPROVAL_DECLINED');
  assert.equal(result.trace.decision,'ALLOW');
  assert.equal(result.approved,false);
  assert.equal(services.adapter.executions.length,0);
});

test('human-approved ALLOW executes exactly once through CIRCUIT gateway', async (t)=>{
  const services=createAppServices({now:NOW});
  t.after(()=>services.close());
  const planner=plannerFor(8);
  let approvalCalls=0;
  const agent=new CircuitSupervisorAgent({planner,services,approvalGate:async({trace})=>{approvalCalls++;return trace.decision==='ALLOW';}});

  const result=await agent.run({goal:'Buy $8 of BNB',execute:true});

  assert.equal(result.status,'EXECUTED');
  assert.equal(result.trace.decision,'ALLOW');
  assert.equal(result.approved,true);
  assert.equal(approvalCalls,1);
  assert.equal(services.adapter.executions.length,1);
  assert.equal(result.execution,services.adapter.executions[0]);
});

test('planner only receives read-only goal, mandate and agent identity context', async (t)=>{
  const services=createAppServices({now:NOW});
  t.after(()=>services.close());
  const planner=plannerFor(8);
  const agent=new CircuitSupervisorAgent({planner,services,approvalGate:async()=>false,agentId:'proof-agent'});

  await agent.run({goal:'Buy $8 of BNB'});

  assert.equal(planner.calls.length,1);
  const plannerInput=planner.calls[0];
  assert.deepEqual(Object.keys(plannerInput).sort(),['agentId','goal','mandate']);
  assert.equal(plannerInput.agentId,'proof-agent');
  assert.equal(plannerInput.goal,'Buy $8 of BNB');
  assert.equal(plannerInput.mandate.id,'circuit-demo-v1');
  assert.equal('adapter' in plannerInput,false);
  assert.equal('gateway' in plannerInput,false);
  assert.equal('services' in plannerInput,false);
});
