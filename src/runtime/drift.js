const PRECEDENCE = { ALLOW: 0, REVIEW: 1, PAUSE: 2 };

export function detectRuntimeDrift({ mandate, intent, evidence, recentIntents = [] }) {
  const findings = [];
  const currentMs = Date.parse(intent.createdAt);

  const duplicate = recentIntents.some((prior) =>
    prior.semanticIntentId === intent.semanticIntentId &&
    Number.isFinite(Date.parse(prior.createdAt)) &&
    currentMs - Date.parse(prior.createdAt) >= 0 &&
    currentMs - Date.parse(prior.createdAt) <= mandate.duplicateIntentWindowMs
  );
  const uncertain = ['SUBMITTED', 'UNKNOWN'].includes(evidence?.priorSettlement?.state);
  if (duplicate && uncertain) findings.push({ code: 'DUPLICATE_SEMANTIC_INTENT', action: 'PAUSE', message: 'Repeated semantic intent arrived while earlier settlement is unresolved.' });

  const windowMs = mandate.maxOrdersPerWindow.windowSeconds * 1000;
  const inWindow = recentIntents.filter((prior) => {
    const priorMs = Date.parse(prior.createdAt);
    return Number.isFinite(priorMs) && currentMs - priorMs >= 0 && currentMs - priorMs <= windowMs;
  });
  if (inWindow.length + 1 > mandate.maxOrdersPerWindow.count) {
    findings.push({ code: 'ORDER_FREQUENCY_ANOMALY', action: 'PAUSE', message: 'Order frequency exceeded the approved runtime envelope.' });
  }

  const volatility = evidence?.volatility;
  if (volatility && Number.isFinite(volatility.score) && Number.isFinite(volatility.baseline) && volatility.baseline > 0 && volatility.score >= volatility.baseline * 2.5) {
    findings.push({ code: 'ABNORMAL_MARKET_REGIME', action: mandate.abnormalMarketPolicy, message: 'Observed volatility materially exceeds the approved baseline regime.' });
  }

  let action = 'ALLOW';
  for (const finding of findings) if (PRECEDENCE[finding.action] > PRECEDENCE[action]) action = finding.action;
  return Object.freeze({ action, reasonCodes: findings.map((entry) => entry.code), findings });
}
