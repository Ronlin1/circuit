import { createAppServices } from '../src/app/services.js';
import { runScenario } from '../src/scenarios/runner.js';
import { SCENARIOS } from '../src/scenarios/catalog.js';
import { verifyTraceChain } from '../src/trace/flight-recorder.js';
const services=createAppServices({dbPath:':memory:',mode:'simulation',now:'2026-09-03T12:01:00.000Z'});
try{
  for(const [id,scenario] of Object.entries(SCENARIOS)){
    const result=await runScenario(id,{gateway:services.gateway,mandate:services.getCurrentMandate(),adapter:services.adapter,now:services.now});
    if(result.trace.decision!==scenario.expected)throw new Error(`${id}: expected ${scenario.expected}, got ${result.trace.decision}`);
    console.log(`${id.padEnd(22)} ${result.trace.decision}`);
  }
  const chain=verifyTraceChain(services.recorder.list());if(!chain.valid)throw new Error(`Trace chain invalid at ${chain.brokenAt}`);
  console.log('Scenario matrix: 8/8 deterministic outcomes; trace chain intact');
} finally {services.close();}
