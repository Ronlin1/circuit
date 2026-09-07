const PRIMARY='https://data-api.binance.vision/api/v3/ticker/24hr';
const FALLBACK='https://api.binance.com/api/v3/ticker/24hr';

function allowedSymbol(value){
  const symbol=String(value??'BNBUSDT').trim().toUpperCase();
  if(symbol!=='BNBUSDT') throw new TypeError('live market demo supports BNBUSDT only');
  return symbol;
}

async function readTicker(base,symbol){
  const url=new URL(base);
  url.searchParams.set('symbol',symbol);
  const response=await fetch(url,{method:'GET',headers:{accept:'application/json'}});
  if(!response.ok) throw new Error('BINANCE_MARKET_HTTP_ERROR');
  return response.json();
}

function marketError(cause){
  return Object.assign(new Error('BINANCE_MARKET_UNAVAILABLE'),{statusCode:502,cause});
}

export async function fetchBinancePublicMarket(value='BNBUSDT'){
  const symbol=allowedSymbol(value);
  let data;
  try{
    data=await readTicker(PRIMARY,symbol);
  }catch(primaryError){
    try{data=await readTicker(FALLBACK,symbol)}catch(fallbackError){throw marketError(fallbackError??primaryError)}
  }
  const price=Number(data?.lastPrice);
  const bidPrice=Number(data?.bidPrice);
  const askPrice=Number(data?.askPrice);
  const closeTime=Number(data?.closeTime);
  if(!Number.isFinite(price)||price<=0||!Number.isFinite(bidPrice)||bidPrice<=0||!Number.isFinite(askPrice)||askPrice<bidPrice) throw marketError();
  const spreadBps=((askPrice-bidPrice)/((askPrice+bidPrice)/2))*10_000;
  if(!Number.isFinite(spreadBps)||spreadBps<0) throw marketError();
  const observedAt=new Date().toISOString();
  const tickerObservedAt=Number.isFinite(closeTime)?new Date(closeTime).toISOString():observedAt;
  return Object.freeze({symbol,price,bidPrice,askPrice,spreadBps,tickerObservedAt,observedAt,source:'BINANCE_SPOT_PUBLIC_REST',readOnly:true});
}
