import { createHash } from 'node:crypto';
import { canonicalJson } from './canonical-json.js';

function hashEvent(eventWithoutCurrentHash, previousHash) {
  return createHash('sha256').update(canonicalJson(eventWithoutCurrentHash) + previousHash).digest('hex');
}

export class FlightRecorder {
  constructor(persistence) { this.persistence = persistence; }

  append(event) {
    if (!event?.traceId) throw new TypeError('traceId is required');
    if (!event?.timestamp) throw new TypeError('timestamp is required');
    const previousHash = this.persistence.lastTrace()?.currentHash ?? 'GENESIS';
    const eventWithoutCurrentHash = { ...structuredClone(event), previousHash };
    delete eventWithoutCurrentHash.currentHash;
    const currentHash = hashEvent(eventWithoutCurrentHash, previousHash);
    const stored = { ...eventWithoutCurrentHash, currentHash };
    this.persistence.insertTrace(stored);
    return structuredClone(stored);
  }

  list() { return structuredClone(this.persistence.listTraces()); }
  get(traceId) { const event = this.persistence.getTrace(traceId); return event ? structuredClone(event) : null; }
}

export function verifyTraceChain(events) {
  let previousHash = 'GENESIS';
  for (const original of events) {
    const event = structuredClone(original);
    const currentHash = event.currentHash;
    delete event.currentHash;
    if (event.previousHash !== previousHash) return { valid: false, brokenAt: event.traceId, reason: 'PREVIOUS_HASH_MISMATCH' };
    const expected = hashEvent(event, previousHash);
    if (currentHash !== expected) return { valid: false, brokenAt: event.traceId, reason: 'CURRENT_HASH_MISMATCH' };
    previousHash = currentHash;
  }
  return { valid: true, brokenAt: null };
}
