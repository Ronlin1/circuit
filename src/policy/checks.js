const check = (code, passed, severity, message) => ({ code, passed, severity, message });

export function policyChecks({ mandate, intent, evidence, now = new Date().toISOString() }) {
  const checks = [];
  checks.push(check('MANDATE_NOT_ACTIVE', mandate?.status === 'ACTIVE', 'HARD', mandate?.status === 'ACTIVE' ? 'Mandate is active.' : 'An active mandate is required.'));
  checks.push(check('READ_ONLY_MUTATION', intent.userIntentMode !== 'READ_ONLY', 'HARD', intent.userIntentMode !== 'READ_ONLY' ? 'Transactional intent is authorized.' : 'Read-only intent cannot mutate financial state.'));
  checks.push(check('PRODUCT_NOT_ALLOWED', Boolean(mandate?.allowedProducts?.includes(intent.product)), 'HARD', mandate?.allowedProducts?.includes(intent.product) ? `${intent.product} is allowed.` : `${intent.product} is outside the mandate.`));
  checks.push(check('ASSET_NOT_ALLOWED', Boolean(mandate?.allowedAssets?.includes(intent.asset) && mandate?.allowedAssets?.includes(intent.quoteAsset)), 'HARD', mandate?.allowedAssets?.includes(intent.asset) && mandate?.allowedAssets?.includes(intent.quoteAsset) ? `${intent.asset}/${intent.quoteAsset} is allowed.` : 'Asset pair is outside the mandate.'));
  checks.push(check('ORDER_CAP_EXCEEDED', Number.isFinite(mandate?.maxOrderUsd) && intent.requestedUsd <= mandate.maxOrderUsd, 'HARD', Number.isFinite(mandate?.maxOrderUsd) && intent.requestedUsd <= mandate.maxOrderUsd ? 'Order is within per-action cap.' : 'Requested order exceeds per-action cap.'));

  const account = evidence?.account;
  const dailySpendPassed = Boolean(account && Number.isFinite(account.dailySpendUsd) && Number.isFinite(mandate?.maxDailySpendUsd) && account.dailySpendUsd + intent.requestedUsd <= mandate.maxDailySpendUsd);
  checks.push(check('DAILY_BUDGET_EXCEEDED', dailySpendPassed, 'HARD', dailySpendPassed ? 'Daily budget remains within mandate.' : 'Action would exceed daily budget.'));

  const concentrationPassed = Boolean(account && Number.isFinite(account.assetConcentrationPct) && Number.isFinite(mandate?.maxAssetConcentrationPct) && account.assetConcentrationPct <= mandate.maxAssetConcentrationPct);
  checks.push(check('CONCENTRATION_LIMIT_EXCEEDED', concentrationPassed, 'HARD', concentrationPassed ? 'Asset concentration is within limit.' : 'Asset concentration exceeds mandate.'));

  const drawdownPassed = Boolean(account && Number.isFinite(account.dailyDrawdownPct) && Number.isFinite(mandate?.maxDailyDrawdownPct) && account.dailyDrawdownPct <= mandate.maxDailyDrawdownPct);
  checks.push(check('DRAWDOWN_LIMIT_EXCEEDED', drawdownPassed, 'HARD', drawdownPassed ? 'Daily drawdown is within limit.' : 'Daily drawdown exceeds mandate.'));

  const observedMs = Date.parse(evidence?.observedAt ?? '');
  const nowMs = Date.parse(now);
  const evidenceFresh = Number.isFinite(observedMs) && Number.isFinite(nowMs) && observedMs <= nowMs && nowMs - observedMs <= (mandate?.maxEvidenceAgeMs ?? 0);
  checks.push(check('EVIDENCE_STALE', evidenceFresh, 'HARD', evidenceFresh ? 'Required evidence is fresh.' : 'Required evidence is stale or unverifiable.'));

  const settlement = evidence?.priorSettlement?.state ?? 'NONE';
  const settlementCertain = !['SUBMITTED', 'UNKNOWN'].includes(settlement);
  checks.push(check('UNCERTAIN_PRIOR_SETTLEMENT', settlementCertain, 'HARD', settlementCertain ? 'No uncertain prior settlement exists.' : `Prior settlement is ${settlement}; automatic retry is unsafe.`));
  return checks;
}
