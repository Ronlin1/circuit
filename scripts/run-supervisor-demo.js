#!/usr/bin/env node
import { createAppServices } from '../src/app/services.js';
import { CircuitSupervisorAgent } from '../src/agent/supervisor-agent.js';

const NOW='2026-09-05T00:00:00.000Z';
const services=createAppServices({now:NOW});

const planner={
  async plan({goal}){
    const match=goal.match(/\$(\d+(?:\.\d+)?)/);
    if(!match) throw new TypeError('Demo goal must contain a USD amount');
    const requestedUsd=Number(match[1]);
    return {
      semanticIntentId:`proof-${requestedUsd}`,
      userIntentMode:'TRANSACT',
      action:'BUY',
      product:'SPOT',
      symbol:'BNBUSDT',
      asset:'BNB',
      quoteAsset:'USDT',
      requestedUsd,
      rationale:`Deterministic proof proposal for ${goal}`
    };
  }
};

const agent=new CircuitSupervisorAgent({planner,services,approvalGate:async()=>false,agentId:'circuit-proof-agent'});

try{
  const unsafe=await agent.run({goal:'Buy $100 BNB'});
  const safe=await agent.run({goal:'Buy $8 BNB'});
  console.log('CIRCUIT SUPERVISOR AGENT PROOF');
  console.log(`$100 BNB -> ${unsafe.trace.decision} -> ${unsafe.trace.reasonCodes.join(',')}`);
  console.log(`$8 BNB -> ${safe.trace.decision} -> ${safe.status}`);
  console.log(`Binance executions: ${services.adapter.executions.length}`);
}finally{
  services.close();
}
