import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverBinanceCapabilities } from '../../src/agent/binance-discovery.js';

test('capability discovery uses tools/list only and returns a sanitized report', async ()=>{
  const calls=[];
  const adapter={
    bearerToken:'should-never-appear',
    async listTools(){
      calls.push('listTools');
      return [
        {name:'market_tool',description:'Read market data',inputSchema:{type:'object',properties:{symbol:{type:'string'},secret:{type:'string',default:'sensitive'}}}},
        {name:'write_tool',description:'Potential write',inputSchema:{type:'object',properties:{symbol:{type:'string'},quantity:{type:'number'}}}}
      ];
    },
    async callTool(){calls.push('callTool');throw new Error('must not be called');}
  };

  const report=await discoverBinanceCapabilities(adapter);

  assert.deepEqual(calls,['listTools']);
  assert.equal(report.connected,true);
  assert.equal(report.toolCount,2);
  assert.deepEqual(report.tools,[
    {name:'market_tool',description:'Read market data',inputKeys:['secret','symbol']},
    {name:'write_tool',description:'Potential write',inputKeys:['quantity','symbol']}
  ]);
  assert.equal(JSON.stringify(report).includes('should-never-appear'),false);
  assert.equal(JSON.stringify(report).includes('sensitive'),false);
});

test('capability discovery rejects malformed MCP tool inventories', async ()=>{
  await assert.rejects(
    ()=>discoverBinanceCapabilities({listTools:async()=>({tools:[]})}),
    /tool array/i
  );
});
