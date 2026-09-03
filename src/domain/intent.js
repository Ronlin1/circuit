import { randomUUID } from 'node:crypto';
import { PRODUCTS } from './constants.js';

const upper = (value, name) => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized) throw new TypeError(`${name} is required`);
  return normalized;
};

export function createActionIntent(input = {}) {
  if (!String(input.agentId ?? '').trim()) throw new TypeError('agentId is required');
  if (!String(input.semanticIntentId ?? '').trim()) throw new TypeError('semanticIntentId is required');
  if (!['READ_ONLY', 'TRANSACT'].includes(input.userIntentMode)) throw new TypeError('userIntentMode is invalid');
  if (!['BUY', 'SELL', 'CONVERT', 'TRANSFER'].includes(input.action)) throw new TypeError('action is invalid');
  const product = upper(input.product, 'product');
  if (!PRODUCTS.includes(product)) throw new TypeError('product is unsupported');
  const requestedUsd = Number(input.requestedUsd);
  if (!Number.isFinite(requestedUsd) || requestedUsd <= 0) throw new TypeError('requestedUsd must be positive');
  return Object.freeze({
    id: input.id ?? randomUUID(),
    agentId: String(input.agentId).trim(),
    semanticIntentId: String(input.semanticIntentId).trim(),
    userIntentMode: input.userIntentMode,
    action: input.action,
    product,
    symbol: upper(input.symbol, 'symbol'),
    asset: upper(input.asset, 'asset'),
    quoteAsset: upper(input.quoteAsset, 'quoteAsset'),
    requestedUsd,
    ...(input.quantity == null ? {} : { quantity: Number(input.quantity) }),
    rationale: String(input.rationale ?? ''),
    createdAt: input.createdAt ?? new Date().toISOString()
  });
}
