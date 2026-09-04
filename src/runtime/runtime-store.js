export class RuntimeStore {
  #states = new Map();
  #intents = new Map();

  getState(agentId) { return this.#states.get(agentId) ?? 'HEALTHY'; }
  setState(agentId, state) { this.#states.set(agentId, state); return state; }
  recordIntent(intent) {
    const list = this.#intents.get(intent.agentId) ?? [];
    list.push(intent);
    this.#intents.set(intent.agentId, list.slice(-200));
  }
  recentIntents(agentId) { return [...(this.#intents.get(agentId) ?? [])]; }
  clear(agentId) { this.#states.delete(agentId); this.#intents.delete(agentId); }
}
