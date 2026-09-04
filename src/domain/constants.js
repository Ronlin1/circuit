export const PRODUCTS = Object.freeze(['SPOT', 'CONVERT', 'MARGIN', 'USD_M_FUTURES', 'COIN_M_FUTURES']);
export const DECISIONS = Object.freeze(['ALLOW', 'REVIEW', 'RESIZE', 'BLOCK', 'PAUSE']);
export const RUNTIME_STATES = Object.freeze(['HEALTHY', 'WATCH', 'DEGRADED', 'PAUSED', 'EMERGENCY']);
export const SETTLEMENT_STATES = Object.freeze(['NONE', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'UNKNOWN']);
export const DEFAULT_MANDATE = Object.freeze({
  allowedProducts: Object.freeze(['SPOT']),
  maxAssetConcentrationPct: 25,
  maxDailyDrawdownPct: 2,
  maxOrdersPerWindow: Object.freeze({ count: 3, windowSeconds: 60 }),
  maxEvidenceAgeMs: 15_000,
  duplicateIntentWindowMs: 60_000,
  abnormalMarketPolicy: 'REVIEW',
  uncertainSettlementPolicy: 'PAUSE'
});
