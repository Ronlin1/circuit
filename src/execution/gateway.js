import { randomUUID } from 'node:crypto';
import { evaluatePolicy } from '../policy/engine.js';
import { detectRuntimeDrift } from '../runtime/drift.js';
import { transitionRuntime } from '../runtime/state-machine.js';

const PRIORITY = { ALLOW:0, RESIZE:1, REVIEW:2, BLOCK:3, PAUSE:4 };
function combine(policy, drift, runtimeState) {
  const reasons = [...policy.reasonCodes, ...drift.reasonCodes];
  let action = PRIORITY[policy.action] >= PRIORITY[drift.action] ? policy.action : drift.action;
  if (['PAUSED','EMERGENCY'].includes(runtimeState)) {
    action = 'PAUSE';
    reasons.push('RUNTIME_NOT_EXECUTABLE');
  }
  return { action, reasonCodes:[...new Set(reasons)], approvedUsd: action === 'ALLOW' || action === 'RESIZE' ? (policy.approvedUsd ?? undefined) : undefined };
}

export class ExecutionGateway {
  #pending = new Map();
  constructor({ adapter, runtimeStore, recorder }) {
    this.adapter = adapter;
    this.runtimeStore = runtimeStore;
    this.recorder = recorder;
  }

  runtimeState(agentId) { return this.runtimeStore.getState(agentId); }
  pause(agentId) { return this.runtimeStore.setState(agentId, 'PAUSED'); }
  recover(agentId) { return this.runtimeStore.setState(agentId, transitionRuntime(this.runtimeStore.getState(agentId), {type:'RECOVER'})); }

  async evaluate(intent, { mandate, now = new Date().toISOString(), scenarioContext = {} }) {
    const evidence = await this.adapter.getMarketEvidence(intent, scenarioContext);
    const currentRuntime = this.runtimeStore.getState(intent.agentId);
    const policy = evaluatePolicy({ mandate, intent, evidence, now });
    const drift = detectRuntimeDrift({ mandate, intent, evidence, recentIntents: this.runtimeStore.recentIntents(intent.agentId) });
    const final = combine(policy, drift, currentRuntime);

    let nextRuntime = currentRuntime;
    if (final.action === 'PAUSE') nextRuntime = transitionRuntime(currentRuntime, {type:'PAUSE'});
    else if (final.action === 'REVIEW') nextRuntime = transitionRuntime(currentRuntime, {type:'REVIEW'});
    else if (final.action === 'ALLOW') nextRuntime = transitionRuntime(currentRuntime, {type:'NORMAL'});
    this.runtimeStore.setState(intent.agentId, nextRuntime);
    this.runtimeStore.recordIntent(intent);

    const traceId = randomUUID();
    const trace = this.recorder.append({
      traceId,
      agentId:intent.agentId,
      mandateId:mandate.id,
      mandateVersion:mandate.version,
      intent,
      evidence,
      policyChecks:policy.checks,
      driftFindings:drift.findings,
      decision:final.action,
      reasonCodes:final.reasonCodes,
      runtimeBefore:currentRuntime,
      runtimeAfter:nextRuntime,
      mode:this.adapter.mode ?? 'UNKNOWN',
      timestamp:now
    });
    if (['ALLOW','RESIZE'].includes(final.action) && Number.isFinite(final.approvedUsd)) this.#pending.set(traceId, {intent,approvedUsd:final.approvedUsd});
    return trace;
  }

  async executeEvaluated(traceId) {
    const pending = this.#pending.get(traceId);
    if (!pending) throw new Error(`Trace ${traceId} is not executable`);
    this.#pending.delete(traceId);
    return this.adapter.execute(pending.intent, pending.approvedUsd);
  }
}
