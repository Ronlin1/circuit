#!/usr/bin/env node
import { BinanceMcpAdapter, McpClientError } from '../src/adapters/binance-mcp.js';
import { discoverBinanceCapabilities } from '../src/agent/binance-discovery.js';

const endpoint=process.env.BINANCE_MCP_URL??'https://agent.binance.com/mcp/agentic';
const adapter=new BinanceMcpAdapter({
  url:endpoint,
  bearerToken:process.env.BINANCE_MCP_BEARER_TOKEN,
  clientName:'circuit-agent-os-proof',
  clientVersion:'0.1.0'
});

try{
  const report=await discoverBinanceCapabilities(adapter);
  console.log(JSON.stringify({status:'CONNECTED',endpoint,...report},null,2));
}catch(error){
  if(error instanceof McpClientError){
    const status=error.code==='MCP_AUTH_REQUIRED'?'AUTH_REQUIRED':error.code==='MCP_FORBIDDEN'?'FORBIDDEN':'UNAVAILABLE';
    console.error(JSON.stringify({status,endpoint,code:error.code,message:error.message},null,2));
    process.exitCode=status==='AUTH_REQUIRED'?2:1;
  }else{
    console.error(JSON.stringify({status:'FAILED',endpoint,code:'PROBE_FAILED',message:error?.message??'Unknown probe failure'},null,2));
    process.exitCode=1;
  }
}
