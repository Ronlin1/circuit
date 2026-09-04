export async function discoverBinanceCapabilities(adapter){
  if(!adapter||typeof adapter.listTools!=='function') throw new TypeError('adapter.listTools is required');
  const tools=await adapter.listTools();
  if(!Array.isArray(tools)) throw new TypeError('Binance MCP capability discovery expected a tool array');
  return Object.freeze({
    connected:true,
    toolCount:tools.length,
    tools:tools.map(tool=>Object.freeze({
      name:String(tool?.name??''),
      description:String(tool?.description??''),
      inputKeys:Object.keys(tool?.inputSchema?.properties??{}).sort()
    }))
  });
}
