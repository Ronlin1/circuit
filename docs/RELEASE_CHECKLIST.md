# ✅ CIRCUIT Hackathon Release Checklist

## Product
- [x] Deterministic policy veto
- [x] Immutable activated Financial Mandate
- [x] Runtime drift detection
- [x] Sticky PAUSED/EMERGENCY states
- [x] Explicit recovery
- [x] Explicit execution after evaluation
- [x] Hash-linked Flight Recorder
- [x] Eight reproducible adversarial scenarios
- [x] MCP-native supervisor surface
- [x] Binance Agent OS MCP adapter
- [x] Simulation-first deployment

## Safety
- [x] No live Binance credentials in repository
- [x] Secret scanner in CI
- [x] Prompt-injection text treated as untrusted data
- [x] Unknown Binance tool mappings fail closed
- [x] Agent-facing MCP cannot execute, activate mandates, or recover runtime
- [x] Live execution limited to explicit Spot mapping
- [x] Trace-chain integrity verification

## Judge experience
- [x] Black / yellow / white Mission Control
- [x] 2m30s demo runbook
- [x] Architecture diagrams
- [x] Threat model
- [x] One-command verification
- [x] Docker packaging
- [x] Hosted demo deployment target

## Final submission gate

Run:

```bash
npm run verify
```

Then verify the hosted deployment:

```text
GET  /api/health
GET  /api/scenarios
POST /api/scenarios/oversize-order/run
POST /mcp/circuit   tools/list
```

The competition build must remain in `SIMULATION` unless a live Agentic sub-account is intentionally authorized for the demo.
