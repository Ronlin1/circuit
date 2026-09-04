import { randomUUID } from 'node:crypto';
import { DEFAULT_MANDATE, PRODUCTS } from './constants.js';

const ABNORMAL_MARKET_POLICIES = Object.freeze(['REVIEW', 'PAUSE']);
const upperUnique = (items) => [...new Set((items ?? []).map((value) => String(value).trim().toUpperCase()).filter(Boolean))];
const positive = (value, name) => {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${name} must be a positive number`);
  return value;
};
const percent = (value, name) => {
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new TypeError(`${name} must be between 0 and 100`);
  return value;
};
const enumValue = (value, allowed, name) => {
  const normalized = String(value).trim().toUpperCase();
  if (!allowed.includes(normalized)) throw new TypeError(`${name} must be one of: ${allowed.join(', ')}`);
  return normalized;
};
const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
};

export function createDraftMandate(input = {}) {
  if (!String(input.name ?? '').trim()) throw new TypeError('name is required');
  const allowedProducts = upperUnique(input.allowedProducts ?? DEFAULT_MANDATE.allowedProducts);
  if (!allowedProducts.length || allowedProducts.some((product) => !PRODUCTS.includes(product))) throw new TypeError('allowedProducts contains an unsupported product');
  const allowedAssets = upperUnique(input.allowedAssets);
  if (!allowedAssets.length) throw new TypeError('allowedAssets must contain at least one asset');
  const maxOrderUsd = positive(Number(input.maxOrderUsd), 'maxOrderUsd');
  const maxDailySpendUsd = positive(Number(input.maxDailySpendUsd), 'maxDailySpendUsd');
  if (maxDailySpendUsd < maxOrderUsd) throw new TypeError('maxDailySpendUsd must be greater than or equal to maxOrderUsd');

  const orders = input.maxOrdersPerWindow ?? DEFAULT_MANDATE.maxOrdersPerWindow;
  if (!Number.isInteger(orders.count) || orders.count < 1 || !Number.isFinite(orders.windowSeconds) || orders.windowSeconds <= 0) {
    throw new TypeError('maxOrdersPerWindow is invalid');
  }

  const now = input.createdAt ?? new Date().toISOString();
  return {
    id: input.id ?? randomUUID(),
    version: Number.isInteger(input.version) && input.version > 0 ? input.version : 1,
    name: String(input.name).trim(),
    status: 'DRAFT',
    allowedProducts,
    allowedAssets,
    maxOrderUsd,
    maxDailySpendUsd,
    maxAssetConcentrationPct: percent(Number(input.maxAssetConcentrationPct ?? DEFAULT_MANDATE.maxAssetConcentrationPct), 'maxAssetConcentrationPct'),
    maxDailyDrawdownPct: percent(Number(input.maxDailyDrawdownPct ?? DEFAULT_MANDATE.maxDailyDrawdownPct), 'maxDailyDrawdownPct'),
    maxOrdersPerWindow: { count: orders.count, windowSeconds: orders.windowSeconds },
    maxEvidenceAgeMs: positive(Number(input.maxEvidenceAgeMs ?? DEFAULT_MANDATE.maxEvidenceAgeMs), 'maxEvidenceAgeMs'),
    duplicateIntentWindowMs: positive(Number(input.duplicateIntentWindowMs ?? DEFAULT_MANDATE.duplicateIntentWindowMs), 'duplicateIntentWindowMs'),
    abnormalMarketPolicy: enumValue(input.abnormalMarketPolicy ?? DEFAULT_MANDATE.abnormalMarketPolicy, ABNORMAL_MARKET_POLICIES, 'abnormalMarketPolicy'),
    uncertainSettlementPolicy: 'PAUSE',
    createdAt: now
  };
}

export function activateMandate(mandate, activatedAt = new Date().toISOString()) {
  if (!mandate || mandate.status !== 'DRAFT') throw new TypeError('Only a DRAFT mandate can be activated');
  return deepFreeze({ ...mandate, status: 'ACTIVE', activatedAt });
}

export function freezeMandate(mandate) {
  return deepFreeze(structuredClone(mandate));
}
