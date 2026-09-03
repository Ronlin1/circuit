import { SETTLEMENT_STATES } from './constants.js';

const normalizeObserved = (value, fallback) => value ?? fallback;
export function normalizeEvidence(input = {}) {
  if (!input.observedAt) throw new TypeError('evidence observedAt is required');
  const out = { observedAt: input.observedAt };
  if (input.ticker) out.ticker = { ...input.ticker, symbol: String(input.ticker.symbol).toUpperCase(), observedAt: normalizeObserved(input.ticker.observedAt, input.observedAt) };
  if (input.book) out.book = { ...input.book, symbol: String(input.book.symbol).toUpperCase(), observedAt: normalizeObserved(input.book.observedAt, input.observedAt) };
  if (input.volatility) out.volatility = { ...input.volatility, symbol: String(input.volatility.symbol).toUpperCase(), observedAt: normalizeObserved(input.volatility.observedAt, input.observedAt) };
  if (input.account) out.account = { ...input.account, observedAt: normalizeObserved(input.account.observedAt, input.observedAt) };
  if (input.priorSettlement) {
    const state = String(input.priorSettlement.state ?? '').toUpperCase();
    if (!SETTLEMENT_STATES.includes(state)) throw new TypeError('prior settlement state is invalid');
    out.priorSettlement = { ...input.priorSettlement, state, observedAt: normalizeObserved(input.priorSettlement.observedAt, input.observedAt) };
  }
  return Object.freeze(out);
}
