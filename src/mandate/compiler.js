import { createDraftMandate } from '../domain/mandate.js';

const KNOWN_ASSETS = ['BNB','BTC','ETH','USDT','USDC','SOL','XRP','ADA','DOGE'];
const money = (text, patterns, fallback) => {
  for (const pattern of patterns) {
    const match=text.match(pattern);
    if(match) return Number(match[1]);
  }
  return fallback;
};

export function compileMandate(text) {
  const source=String(text??'').trim();
  if(!source) throw new TypeError('Mandate text is required');
  const assetSection=source.match(/assets?\s*:\s*([^.;\n]+)/i)?.[1];
  let allowedAssets=[];
  if(assetSection) allowedAssets=assetSection.split(/[,\s]+/).map(v=>v.trim().toUpperCase()).filter(v=>/^[A-Z0-9]{2,12}$/.test(v));
  else allowedAssets=KNOWN_ASSETS.filter(asset=>new RegExp(`\\b${asset}\\b`,'i').test(source));
  if(!allowedAssets.includes('USDT')) allowedAssets.push('USDT');
  if(!allowedAssets.length) allowedAssets=['BNB','USDT'];

  const allowedProducts=['SPOT'];
  if(/\bconvert\b/i.test(source)) allowedProducts.push('CONVERT');
  if(/\bmargin\s+(?:allowed|enabled|permitted)\b/i.test(source)) allowedProducts.push('MARGIN');
  if(/\b(?:usd[- ]?m\s+)?futures\s+(?:allowed|enabled|permitted)\b/i.test(source)) allowedProducts.push('USD_M_FUTURES');

  const maxOrderUsd=money(source,[/max(?:imum)?\s*\$?([\d.]+)\s*(?:per|\/)?\s*order/i,/\$([\d.]+)\s*per\s*order/i],10);
  const maxDailySpendUsd=money(source,[/max(?:imum)?\s*\$?([\d.]+)\s*(?:per|\/)?\s*day/i,/\$([\d.]+)\s*per\s*day/i],Math.max(30,maxOrderUsd));
  const concentration=money(source,[/(?:max(?:imum)?\s*)?concentration\s*(?:of\s*)?([\d.]+)%/i],25);
  const drawdown=money(source,[/(?:max(?:imum)?\s*)?drawdown\s*(?:of\s*)?([\d.]+)%/i],2);
  const orders=source.match(/(?:no\s+more\s+than\s+)?(\d+)\s*orders?\s*(?:per|\/)\s*(\d+)\s*seconds?/i);
  const firstSentence=source.split(/[.!?]/)[0].trim();

  return createDraftMandate({
    name:firstSentence.slice(0,80) || 'Compiled CIRCUIT Mandate',
    allowedProducts:[...new Set(allowedProducts)],
    allowedAssets:[...new Set(allowedAssets)],
    maxOrderUsd,
    maxDailySpendUsd,
    maxAssetConcentrationPct:concentration,
    maxDailyDrawdownPct:drawdown,
    maxOrdersPerWindow:orders?{count:Number(orders[1]),windowSeconds:Number(orders[2])}:undefined
  });
}
