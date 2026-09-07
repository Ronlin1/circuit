import { createDraftMandate, activateMandate } from '../domain/mandate.js';
import { createSqlitePersistence } from '../persistence/sqlite.js';
import { FlightRecorder } from '../trace/flight-recorder.js';
import { RuntimeStore } from '../runtime/runtime-store.js';
import { MockBinanceAdapter } from '../adapters/mock-binance.js';
import { BinanceMcpAdapter } from '../adapters/binance-mcp.js';
import { ExecutionGateway } from '../execution/gateway.js';
import { SseHub } from '../server/sse.js';
import { fetchBinancePublicMarket } from '../market/binance-public.js';

export function createAppServices({dbPath=':memory:',mode='simulation',now,clock=()=>new Date().toISOString(),adapter:providedAdapter,mcpConfig={},realtime=true,marketDataProvider:providedMarketDataProvider}={}) {
  if(typeof clock!=='function') throw new TypeError('clock must be a function');
  const seedNow=now??clock();
  const currentTime=()=>now??clock();
  const persistence=createSqlitePersistence(dbPath);
  const recorder=new FlightRecorder(persistence);
  const runtimeStore=new RuntimeStore();
  const normalizedMode=String(mode).toLowerCase();
  const adapter=providedAdapter ?? (normalizedMode==='live' ? new BinanceMcpAdapter({url:mcpConfig.url??process.env.BINANCE_MCP_URL??'https://agent.binance.com/mcp/agentic',bearerToken:mcpConfig.bearerToken??process.env.BINANCE_MCP_BEARER_TOKEN,toolNames:mcpConfig.toolNames??{ticker:process.env.BINANCE_MCP_TICKER_TOOL,orderBook:process.env.BINANCE_MCP_ORDER_BOOK_TOOL,account:process.env.BINANCE_MCP_ACCOUNT_TOOL,spotOrder:process.env.BINANCE_MCP_SPOT_ORDER_TOOL}}) : new MockBinanceAdapter({now:seedNow}));
  const marketDataProvider=providedMarketDataProvider??fetchBinancePublicMarket;
  if(typeof marketDataProvider!=='function') throw new TypeError('marketDataProvider must be a function');
  const gateway=new ExecutionGateway({adapter,runtimeStore,recorder});
  const events=new SseHub();
  const mandates=new Map();
  const seed=activateMandate(createDraftMandate({id:'circuit-demo-v1',name:'CIRCUIT Conservative BNB',allowedProducts:['SPOT'],allowedAssets:['BNB','USDT'],maxOrderUsd:10,maxDailySpendUsd:30,maxAssetConcentrationPct:40,maxDailyDrawdownPct:2,maxOrdersPerWindow:{count:3,windowSeconds:60},maxEvidenceAgeMs:15_000,duplicateIntentWindowMs:60_000,abnormalMarketPolicy:'REVIEW',createdAt:seedNow}),seedNow);
  mandates.set(seed.id,seed);
  let currentMandateId=seed.id;

  return {
    mode:String(mode).toUpperCase(), realtime:Boolean(realtime), now:seedNow, currentTime, persistence, recorder, runtimeStore, adapter, gateway, events, mandates, marketDataProvider,
    getCurrentMandate(){return mandates.get(currentMandateId)??null;},
    getMandate(id){return mandates.get(id)??null;},
    storeMandate(mandate){mandates.set(mandate.id,mandate);return mandate;},
    activate(id,activatedAt=currentTime()){
      const draft=mandates.get(id); if(!draft) throw new Error('MANDATE_NOT_FOUND');
      const active=activateMandate(draft,activatedAt); mandates.set(id,active); currentMandateId=id; return active;
    },
    close(){events.close();persistence.close();}
  };
}
