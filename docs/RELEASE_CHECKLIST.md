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
- [x] Agent OS Proof page with recorded real Binance market evidence
- [x] Judge Mode for the full eight-scenario matrix
- [x] Judge Mode target summary: 8 / 8 expected controls

## Safety
- [x] No live Binance credentials in repository
- [x] Secret scanner in CI
- [x] Prompt-injection text treated as untrusted data
- [x] Unknown Binance tool mappings fail closed
- [x] Agent-facing MCP cannot execute, activate mandates, or recover runtime
- [x] Live execution limited to explicit Spot mapping
- [x] Trace-chain integrity verification
- [x] Real Agent OS proof performed with read-only market tools and 0 Binance writes
- [x] Live market evidence is labeled separately from simulation/default account-state assumptions

## Judge experience
- [x] Black / yellow / white Mission Control
- [x] Agent OS Proof linked from Home and primary navigation
- [x] One-click Judge Mode
- [x] Architecture diagrams
- [x] Threat model
- [x] One-command verification
- [x] Hosted Netlify demo
- [x] 60-second judge path documented in README
- [x] Canonical live-proof trace IDs preserved in README and submission package

## Final public-repository gate
- [ ] Run the final secret scan immediately before changing visibility
- [ ] Confirm `.env`, OAuth material, bearer tokens, API keys, screenshots with secrets, and local databases are absent
- [ ] Confirm all public claims match the recorded proof and do not imply a live executed trade
- [ ] Make the GitHub public repository visible to judges
- [ ] Open the repository in a logged-out/private browser and verify README/assets render

## Final submission deliverables
- [ ] Record and publish the final submission video
- [ ] Confirm the video shows Agent OS Proof, $100 BLOCK, $8 ALLOW, and Judge Mode
- [ ] Publish the required X post / quote-repost with submission links
- [ ] Complete the official submission survey
- [ ] Confirm the public GitHub repository link works without authentication
- [ ] Preserve screenshots/receipts of the X post and survey submission

## Final technical gate

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
GET  /proof/
GET  /simulation/#judge-mode
```

The competition build remains **simulation-first**. The verified Agent OS proof uses real Binance read-only market evidence; no trading credential is embedded in the deployment and no Binance write is required for the proof.
