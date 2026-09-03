import { policyChecks } from './checks.js';

const PRECEDENCE = Object.freeze({ ALLOW: 0, RESIZE: 1, REVIEW: 2, BLOCK: 3, PAUSE: 4 });

export function evaluatePolicy({ mandate, intent, evidence, now }) {
  const checks = policyChecks({ mandate, intent, evidence, now });
  const failed = checks.filter((entry) => !entry.passed);
  const reasonCodes = failed.map((entry) => entry.code);
  let action = 'ALLOW';

  if (reasonCodes.includes('UNCERTAIN_PRIOR_SETTLEMENT')) action = 'PAUSE';
  else if (failed.some((entry) => entry.severity === 'HARD')) action = 'BLOCK';

  const decision = { action, checks, reasonCodes };
  if (PRECEDENCE[action] <= PRECEDENCE.RESIZE) decision.approvedUsd = intent.requestedUsd;
  return Object.freeze(decision);
}
