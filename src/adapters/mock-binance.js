import { normalizeEvidence } from '../domain/evidence.js';

export class MockBinanceAdapter {
  constructor(options = {}) {
    this.options = { now: new Date().toISOString(), priorSettlementState: 'NONE', ...options };
    this.executions = [];
    this.mode = 'SIMULATION';
  }

  async getMarketEvidence(intent, context = {}) {
    const observedAt = context.observedAt ?? this.options.now;
    return normalizeEvidence({
      observedAt,
      ticker: { symbol: intent.symbol, price: context.price ?? 700, observedAt: context.tickerObservedAt ?? observedAt },
      book: { symbol: intent.symbol, spreadBps: context.spreadBps ?? 4, observedAt: context.bookObservedAt ?? observedAt },
      volatility: { symbol: intent.symbol, score: context.volatilityScore ?? 1, baseline: context.volatilityBaseline ?? 1, observedAt: context.volatilityObservedAt ?? observedAt },
      account: { dailySpendUsd: context.dailySpendUsd ?? 0, assetConcentrationPct: context.assetConcentrationPct ?? 10, dailyDrawdownPct: context.dailyDrawdownPct ?? 0.2, observedAt: context.accountObservedAt ?? observedAt },
      priorSettlement: { semanticIntentId: intent.semanticIntentId, state: context.priorSettlementState ?? this.options.priorSettlementState, observedAt: context.settlementObservedAt ?? observedAt }
    });
  }

  async execute(intent, approvedUsd) {
    const result = Object.freeze({
      executionId: `sim-${this.executions.length + 1}`,
      mode: 'SIMULATED',
      status: 'SIMULATED_FILLED',
      symbol: intent.symbol,
      action: intent.action,
      approvedUsd,
      executedAt: this.options.now
    });
    this.executions.push(result);
    return result;
  }
}
