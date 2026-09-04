import { normalizeEvidence } from '../domain/evidence.js';

const MODERN_PROTOCOL='2026-07-28';
const LEGACY_PROTOCOL='2025-11-25';

export class McpClientError extends Error {
  constructor(code,message,{status,cause}={}){super(message,{cause});this.name='McpClientError';this.code=code;if(status)this.status=status;}
}

function parseRpcText(text,contentType=''){
  if(!text.trim()) return null;
  if(contentType.includes('text/event-stream')){
    const messages=text.split(/\r?\n\r?\n/).flatMap(block=>block.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trim())).filter(Boolean);
    if(!messages.length) return null;
    return JSON.parse(messages.at(-1));
  }
  return JSON.parse(text);
}
function extractData(result){
  if(result?.structuredContent && typeof result.structuredContent==='object') return result.structuredContent;
  if(Array.isArray(result?.content)){
    for(const item of result.content){
      if(item?.type==='text'&&typeof item.text==='string'){
        try{return JSON.parse(item.text);}catch{return {text:item.text};}
      }
    }
  }
  return result;
}
function numeric(data,keys){
  for(const key of keys){
    const value=data?.[key]; if(Number.isFinite(Number(value))) return Number(value);
    if(data?.data && Number.isFinite(Number(data.data[key]))) return Number(data.data[key]);
  }
  return undefined;
}

export class BinanceMcpAdapter {
  #id=0; #protocolMode='auto'; #sessionId=null; #initialized=false;
  constructor({url='https://agent.binance.com/mcp/agentic',bearerToken,toolNames={},clientName='circuit',clientVersion='0.1.0'}={}){
    this.url=url;this.bearerToken=bearerToken;this.toolNames={...toolNames};this.clientInfo={name:clientName,version:clientVersion};this.mode='LIVE';this.executions=[];
  }
  #nextId(){return ++this.#id;}
  #baseHeaders(){const headers={'content-type':'application/json','accept':'application/json, text/event-stream'};if(this.bearerToken)headers.authorization=`Bearer ${this.bearerToken}`;return headers;}
  async #post(body,headers={}){
    let response;
    try{response=await fetch(this.url,{method:'POST',headers:{...this.#baseHeaders(),...headers},body:JSON.stringify(body),redirect:'manual'});}catch(error){throw new McpClientError('MCP_NETWORK_ERROR','Unable to reach the configured Binance MCP endpoint.',{cause:error});}
    if(response.status===401) throw new McpClientError('MCP_AUTH_REQUIRED','Binance MCP authorization is required or has expired.',{status:401});
    if(response.status===403) throw new McpClientError('MCP_FORBIDDEN','The authorized Binance MCP session does not grant this capability.',{status:403});
    const text=await response.text();
    let rpc=null;try{rpc=parseRpcText(text,response.headers.get('content-type')??'');}catch(error){throw new McpClientError('MCP_INVALID_RESPONSE','Binance MCP returned a response CIRCUIT could not safely parse.',{status:response.status,cause:error});}
    return {response,rpc};
  }
  #modernMeta(){return {'io.modelcontextprotocol/clientInfo':this.clientInfo};}
  async #modernRequest(method,params={}){
    const id=this.#nextId();
    const merged={...params,_meta:{...(params?._meta??{}),...this.#modernMeta()}};
    const headers={'MCP-Protocol-Version':MODERN_PROTOCOL,'Mcp-Method':method};
    if(params?.name)headers['Mcp-Name']=params.name;
    const {response,rpc}=await this.#post({jsonrpc:'2.0',id,method,params:merged},headers);
    if(!response.ok||rpc?.error){
      const code=rpc?.error?.code;
      if(response.status===400&&[-32600,-32601,-32602].includes(code)) throw new McpClientError('MCP_MODERN_UNSUPPORTED','MCP server rejected the 2026 stateless envelope.',{status:response.status});
      throw new McpClientError('MCP_RPC_ERROR',`Binance MCP rejected ${method}.`,{status:response.status});
    }
    if(!rpc||rpc.id!==id) throw new McpClientError('MCP_INVALID_RESPONSE','Binance MCP response did not match the request id.');
    return rpc.result;
  }
  async #ensureLegacy(){
    if(this.#initialized)return;
    const id=this.#nextId();
    const {response,rpc}=await this.#post({jsonrpc:'2.0',id,method:'initialize',params:{protocolVersion:LEGACY_PROTOCOL,capabilities:{},clientInfo:this.clientInfo}});
    if(!response.ok||rpc?.error||!rpc?.result) throw new McpClientError('MCP_INITIALIZE_FAILED','Binance MCP legacy initialization failed.',{status:response.status});
    this.#sessionId=response.headers.get('mcp-session-id');
    const notifyHeaders={};if(this.#sessionId)notifyHeaders['Mcp-Session-Id']=this.#sessionId;
    const notify=await this.#post({jsonrpc:'2.0',method:'notifications/initialized',params:{}},notifyHeaders);
    if(![200,202,204].includes(notify.response.status)) throw new McpClientError('MCP_INITIALIZE_FAILED','Binance MCP did not accept initialized notification.',{status:notify.response.status});
    this.#initialized=true;
  }
  async #legacyRequest(method,params={}){
    await this.#ensureLegacy();
    const id=this.#nextId();const headers={};if(this.#sessionId)headers['Mcp-Session-Id']=this.#sessionId;
    const {response,rpc}=await this.#post({jsonrpc:'2.0',id,method,params},headers);
    if(!response.ok||rpc?.error) throw new McpClientError('MCP_RPC_ERROR',`Binance MCP rejected ${method}.`,{status:response.status});
    if(!rpc||rpc.id!==id) throw new McpClientError('MCP_INVALID_RESPONSE','Binance MCP response did not match the request id.');
    return rpc.result;
  }
  async #request(method,params={}){
    if(this.#protocolMode==='legacy')return this.#legacyRequest(method,params);
    try{const result=await this.#modernRequest(method,params);this.#protocolMode='modern';return result;}catch(error){
      if(this.#protocolMode==='auto'&&error?.code==='MCP_MODERN_UNSUPPORTED'){this.#protocolMode='legacy';return this.#legacyRequest(method,params);}throw error;
    }
  }
  async listTools(){const result=await this.#request('tools/list',{});if(!Array.isArray(result?.tools))throw new McpClientError('MCP_INVALID_RESPONSE','Binance MCP tools/list did not return a tool array.');return result.tools;}
  async callTool(name,args={}){if(!name)throw new TypeError('MCP tool name is required');return this.#request('tools/call',{name,arguments:args});}
  async #requireTool(capability){
    const mapped=this.toolNames[capability];if(!mapped)throw new McpClientError('MCP_CAPABILITY_MAPPING_REQUIRED',`CIRCUIT requires an explicit ${capability} tool mapping before this financial path can run.`);
    const tools=await this.listTools();if(!tools.some(tool=>tool.name===mapped))throw new McpClientError('MCP_TOOL_NOT_DISCOVERED',`Configured ${capability} tool is not advertised by the connected MCP server.`);return mapped;
  }
  async getMarketEvidence(intent){
    const tickerTool=await this.#requireTool('ticker');
    const bookTool=await this.#requireTool('orderBook');
    const accountTool=await this.#requireTool('account');
    const [tickerResult,bookResult,accountResult]=await Promise.all([this.callTool(tickerTool,{symbol:intent.symbol}),this.callTool(bookTool,{symbol:intent.symbol}),this.callTool(accountTool,{})]);
    const ticker=extractData(tickerResult),book=extractData(bookResult),account=extractData(accountResult);const now=new Date().toISOString();
    const price=numeric(ticker,['price','lastPrice','markPrice']);
    let spreadBps=numeric(book,['spreadBps']);
    if(spreadBps===undefined&&Array.isArray(book?.bids)&&Array.isArray(book?.asks)){
      const bid=Number(book.bids[0]?.[0]??book.bids[0]?.price),ask=Number(book.asks[0]?.[0]??book.asks[0]?.price);if(bid>0&&ask>=bid)spreadBps=((ask-bid)/((ask+bid)/2))*10_000;
    }
    const dailySpendUsd=numeric(account,['dailySpendUsd']),assetConcentrationPct=numeric(account,['assetConcentrationPct']),dailyDrawdownPct=numeric(account,['dailyDrawdownPct']);
    if(![price,spreadBps,dailySpendUsd,assetConcentrationPct,dailyDrawdownPct].every(Number.isFinite)) throw new McpClientError('MCP_EVIDENCE_UNSUPPORTED','Connected MCP tools do not expose the normalized evidence required for safe CIRCUIT execution.');
    return normalizeEvidence({observedAt:now,ticker:{symbol:intent.symbol,price,observedAt:now},book:{symbol:intent.symbol,spreadBps,observedAt:now},account:{dailySpendUsd,assetConcentrationPct,dailyDrawdownPct,observedAt:now},priorSettlement:{semanticIntentId:intent.semanticIntentId,state:'NONE',observedAt:now}});
  }
  async execute(intent,approvedUsd){
    if(intent.product!=='SPOT')throw new McpClientError('MCP_UNSUPPORTED_EXECUTION','CIRCUIT v1 live execution is restricted to Spot.');
    const tool=await this.#requireTool('spotOrder');
    const result=await this.callTool(tool,{symbol:intent.symbol,side:intent.action,type:'MARKET',quoteOrderQty:approvedUsd});
    const execution=Object.freeze({executionId:`live-${this.executions.length+1}`,mode:'LIVE',status:'SUBMITTED',tool,result:extractData(result),executedAt:new Date().toISOString()});this.executions.push(execution);return execution;
  }
}
