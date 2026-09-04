# CIRCUIT — Runtime Control Plane for Agentic Finance

**Status:** Approved for implementation  
**Date:** 2026-09-03  
**Hackathon:** Binance Agent OS Mini Hackathon — Track A  
**Product:** CIRCUIT — Continuous Intent & Runtime Control for User-authorized Intelligent Transactions

## 1. Product thesis

Binance Agent OS gives AI agents the ability to read markets and, with user-granted permissions, perform financial actions. CIRCUIT adds a missing runtime control layer: it continuously verifies that an autonomous financial agent remains aligned with the user's approved mandate, behavioral envelope, data freshness requirements, and operating assumptions.

CIRCUIT is not a trading-signal bot and does not attempt to maximize speculative returns. It is a supervisory control plane that evaluates proposed actions before execution, monitors sequences of actions over time, explains interventions, and records an auditable flight log.

**Positioning:** “Binance Agent OS gives AI agents execution. CIRCUIT gives users runtime control.”

## 2. Why this problem matters

A single action can be individually valid while the sequence is unsafe. Examples:

- Five individually permitted $10 buys can violate a $30 daily budget.
- Repeated retries can duplicate a transaction after stale/asynchronous state.
- A strategy approved for Spot can drift into Futures or Margin.
- A strategy deployed in normal volatility can continue operating after the market regime changes.
- A read-only research request can mutate into an execution call.
- An LLM can hallucinate that a user policy may be overridden.
- External content can contain prompt injection that should never change financial permissions.

Binance already provides account isolation, permissions, and emergency controls. CIRCUIT complements those primitives with intent-aware and sequence-aware runtime governance.

## 3. Current Binance surface area

The v1 implementation targets the official Binance Agent OS MCP endpoint:

`https://agent.binance.com/mcp/agentic`

Agent OS currently emphasizes MCP-based market data and trading capabilities. The architecture keeps wallet/x402/on-chain adapters behind the same execution-gateway interface so they can be added without changing the policy engine.

Reference sources used for the design:

- https://www.binance.com/en/blog/ecosystem/5991233187660196794
- https://www.binance.com/es/support/faq/detail/7a6e676e36fb455d96478932cb12d9f3
- https://github.com/binance/binance-skills-hub
- https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/preflight.md
- https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/security.md

## 4. Competition MVP

The MVP contains seven capabilities only:

1. **Mandate Compiler** — converts natural-language user intent into a typed `FinancialMandate` draft and requires explicit activation.
2. **Intent Gateway** — every worker-agent proposal becomes a structured `ActionIntent`; no execution adapter is called directly.
3. **Deterministic Policy Engine** — hard policy rules have veto authority and are never overridden by an LLM.
4. **Runtime Drift Engine** — detects duplicate intent, frequency anomalies, daily-budget drift, product/asset mismatch, stale evidence, and market-regime drift.
5. **Circuit Breaker** — produces `ALLOW`, `REVIEW`, `RESIZE`, `BLOCK`, or `PAUSE`, with explicit reason codes.
6. **Flight Recorder** — persists mandate version, proposal, evidence, policy checks, decision, execution result, and a tamper-evident trace hash.
7. **Mission Control UI** — shows agent health, mandate, activity timeline, policy evaluation, runtime health, and incident explanations.

## 5. Non-goals for hackathon v1

- No autonomous profit-maximizing strategy.
- No leverage or Futures execution.
- No Margin execution.
- No external withdrawals.
- No multi-chain DeFi execution in the initial safe path.
- No custom token or blockchain.
- No mobile app.
- No ML price predictor.
- No claim of guaranteed safety or guaranteed trading performance.

## 6. Safety model

### 6.1 Fail closed

If CIRCUIT cannot verify a hard requirement, the action does not execute.

Examples:

- missing mandate → `BLOCK`
- stale required market evidence → `BLOCK`
- unsupported product → `BLOCK`
- ambiguous mutation after read-only user intent → `REVIEW`
- duplicate semantic intent with uncertain prior settlement → `PAUSE`

### 6.2 Deterministic veto

The policy engine operates on typed data. The LLM may compile a draft mandate and explain decisions, but it cannot modify an active mandate or override deterministic policy results.

### 6.3 Explicit activation

A compiled mandate is a draft until activated. The demo can activate through the UI, but production semantics require an explicit user action.

### 6.4 Execution isolation

All execution-capable adapters implement a common interface and are called only by the execution gateway after a permitted decision. The worker agent never receives raw credentials and never calls Binance directly through application code.

## 7. Core domain model

### 7.1 `FinancialMandate`

```ts
export type Product = "SPOT" | "CONVERT" | "MARGIN" | "USD_M_FUTURES" | "COIN_M_FUTURES";

export interface FinancialMandate {
  id: string;
  version: number;
  name: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "REVOKED";
  allowedProducts: Product[];
  allowedAssets: string[];
  maxOrderUsd: number;
  maxDailySpendUsd: number;
  maxAssetConcentrationPct: number;
  maxDailyDrawdownPct: number;
  maxOrdersPerWindow: { count: number; windowSeconds: number };
  maxEvidenceAgeMs: number;
  duplicateIntentWindowMs: number;
  abnormalMarketPolicy: "REVIEW" | "PAUSE";
  uncertainSettlementPolicy: "PAUSE";
  createdAt: string;
  activatedAt?: string;
}
```

### 7.2 `ActionIntent`

```ts
export interface ActionIntent {
  id: string;
  agentId: string;
  semanticIntentId: string;
  userIntentMode: "READ_ONLY" | "TRANSACT";
  action: "BUY" | "SELL" | "CONVERT" | "TRANSFER";
  product: Product;
  symbol: string;
  asset: string;
  quoteAsset: string;
  requestedUsd: number;
  quantity?: number;
  rationale: string;
  createdAt: string;
}
```

### 7.3 `EvidenceBundle`

```ts
export interface EvidenceBundle {
  observedAt: string;
  ticker?: { symbol: string; price: number; observedAt: string };
  book?: { symbol: string; spreadBps: number; observedAt: string };
  volatility?: { symbol: string; score: number; baseline: number; observedAt: string };
  account?: { dailySpendUsd: number; assetConcentrationPct: number; dailyDrawdownPct: number; observedAt: string };
  priorSettlement?: { semanticIntentId: string; state: "NONE" | "SUBMITTED" | "CONFIRMED" | "FAILED" | "UNKNOWN"; observedAt: string };
}
```

### 7.4 `PolicyDecision`

```ts
export type DecisionAction = "ALLOW" | "REVIEW" | "RESIZE" | "BLOCK" | "PAUSE";

export interface PolicyCheck {
  code: string;
  passed: boolean;
  severity: "INFO" | "WARN" | "HARD";
  message: string;
}

export interface PolicyDecision {
  action: DecisionAction;
  checks: PolicyCheck[];
  approvedUsd?: number;
  reasonCodes: string[];
}
```

## 8. Policy rules and reason codes

Hard rules:

- `MANDATE_NOT_ACTIVE`
- `READ_ONLY_MUTATION`
- `PRODUCT_NOT_ALLOWED`
- `ASSET_NOT_ALLOWED`
- `ORDER_CAP_EXCEEDED`
- `DAILY_BUDGET_EXCEEDED`
- `CONCENTRATION_LIMIT_EXCEEDED`
- `DRAWDOWN_LIMIT_EXCEEDED`
- `EVIDENCE_STALE`
- `UNCERTAIN_PRIOR_SETTLEMENT`

Runtime rules:

- `DUPLICATE_SEMANTIC_INTENT`
- `ORDER_FREQUENCY_ANOMALY`
- `ABNORMAL_MARKET_REGIME`

Decision precedence:

`PAUSE > BLOCK > REVIEW > RESIZE > ALLOW`

A hard veto cannot be downgraded by later checks.

## 9. Runtime state machine

Agent runtime states:

- `HEALTHY`
- `WATCH`
- `DEGRADED`
- `PAUSED`
- `EMERGENCY`

Transitions:

- successful normal evaluation keeps `HEALTHY`
- warning/anomaly below pause threshold → `WATCH`
- repeated warnings or explicit review condition → `DEGRADED`
- duplicate/uncertain settlement, frequency breaker, or hard runtime pause → `PAUSED`
- explicit emergency/revocation event → `EMERGENCY`

Only explicit user recovery moves `PAUSED` or `EMERGENCY` back toward an executable state.

## 10. Flight recorder

Every evaluated intent produces an immutable append-only event record containing:

- trace ID
- agent ID
- mandate ID/version
- original action intent
- evidence snapshot
- policy checks
- final decision
- execution request/response when applicable
- previous trace hash
- current trace hash
- timestamp

Hash formula for v1:

`SHA-256(canonicalJson(eventWithoutCurrentHash) + previousHash)`

The goal is tamper-evidence for the demo, not blockchain immutability.

## 11. Execution adapters

```ts
export interface ExecutionAdapter {
  getMarketEvidence(intent: ActionIntent): Promise<EvidenceBundle>;
  execute(intent: ActionIntent, approvedUsd: number): Promise<ExecutionResult>;
}
```

Implementations:

- `MockBinanceAdapter` — deterministic scenario testing and demo fallback.
- `BinanceMcpAdapter` — real MCP integration once an authenticated session is available.

The mock and real adapters must return the same domain objects. The demo must make it visually explicit whether an event is `SIMULATED` or `LIVE`.

## 12. API surface

Hackathon server endpoints:

- `POST /api/mandates/compile`
- `POST /api/mandates/:id/activate`
- `GET /api/mandates/:id`
- `POST /api/intents/evaluate`
- `POST /api/intents/:id/execute`
- `GET /api/traces`
- `GET /api/traces/:id`
- `GET /api/runtime/:agentId`
- `POST /api/runtime/:agentId/recover`
- `GET /api/scenarios`
- `POST /api/scenarios/:id/run`
- `GET /api/health`
- `GET /api/events` (SSE)

Every mutation returns the CIRCUIT decision and reason codes.

## 13. Mission Control UI

Primary screens/panels:

1. **Header** — CIRCUIT mark, environment badge `SIMULATION`/`LIVE`, runtime state.
2. **Mandate** — allowed products/assets and hard caps.
3. **Runtime Health** — intent alignment, budget consumption, behavior score/state, regime, evidence freshness.
4. **Activity Timeline** — proposed → evaluated → allowed/blocked → executed.
5. **Incident Drawer** — rule triggered, evidence, explanation, safe next action.
6. **Adversarial Lab** — one-click scenario runner for the eight competition cases.
7. **Agent Interface** — MCP endpoint and available safe tools.

Visual direction: operational mission-control interface with black as the primary canvas, Binance-inspired warm yellow for control accents, and high-contrast white typography. Status colors are semantic and secondary.

## 14. Demo scenarios

### S1 — Safe Spot buy

A $10 BNB/USDT Spot buy passes all checks and becomes explicitly executable.

### S2 — Oversize order

A $100 buy under a $10 cap returns `BLOCK / ORDER_CAP_EXCEEDED`.

### S3 — Forbidden Futures

A USD-M Futures proposal under a Spot-only mandate returns `BLOCK / PRODUCT_NOT_ALLOWED`.

### S4 — Duplicate retry loop

A semantic retry while prior settlement is `SUBMITTED` returns `PAUSE / UNCERTAIN_PRIOR_SETTLEMENT` and `DUPLICATE_SEMANTIC_INTENT`.

### S5 — Order-frequency breaker

The fourth valid order inside a three-order/60-second envelope returns `PAUSE / ORDER_FREQUENCY_ANOMALY`.

### S6 — Stale evidence

Evidence older than `maxEvidenceAgeMs` returns `BLOCK / EVIDENCE_STALE`.

### S7 — Regime drift

Volatility score crossing the configured multiple returns `REVIEW / ABNORMAL_MARKET_REGIME` (or `PAUSE` when configured).

### S8 — Prompt injection cannot change policy

Rationale contains instructions to ignore the mandate and increase limits. The typed request is still evaluated against the activated mandate and is blocked when outside the cap.

## 15. Persistence

Hackathon v1 uses SQLite for deterministic local deployment and zero-infrastructure replay.

Tables:

- `mandates`
- `agent_runtime`
- `trace_events`
- `execution_records`

No secrets are stored in SQLite.

## 16. Observability

Structured JSON logs for server-side events:

- `mandate.activated`
- `intent.received`
- `policy.evaluated`
- `runtime.transition`
- `execution.submitted`
- `execution.result`
- `circuit.paused`

Logs must never contain credentials, authorization headers, cookies, or raw wallet secrets.

## 17. Test strategy

TDD is mandatory for production behavior.

Unit tests:

- mandate validation and immutability
- policy rule precedence
- evidence freshness
- duplicate semantic intent
- order-frequency window
- regime drift
- state-machine transitions
- canonical trace hashing
- prompt-injection isolation

Integration tests:

- allow → execute adapter invoked exactly once
- block → adapter never invoked
- pause → adapter never invoked and runtime becomes `PAUSED`
- explicit recovery required before later execution
- full eight-scenario matrix
- MCP adapter against a local fake MCP server

Release verification:

- all tests pass
- `npm run verify`
- eight scenarios match expected terminal decisions
- trace chain verifies
- secret scan clean
- Docker starts and health check succeeds

## 18. Security constraints

- `.env` is ignored.
- No Binance authorization material in repository or screenshots.
- Live mode visibly labelled and opt-in.
- Simulation mode is the default.
- Execution adapter can be disabled globally.
- HTTP request bodies are size-limited.
- User-provided strings are rendered as text in the UI, not raw HTML.
- Worker-agent rationale is treated as untrusted data.

## 19. Definition of done for hackathon submission

CIRCUIT v1 is submission-ready when:

- mission-control UI runs locally and in deployed demo;
- all eight scenarios are one-click reproducible;
- at least one safe action flows through the execution gateway using simulation, with optional tiny live Spot demo only when explicitly authorized;
- a blocked action demonstrably never calls the execution adapter;
- runtime PAUSE demonstrably requires explicit recovery;
- Flight Recorder chain verifies;
- README clearly explains problem, architecture, differentiation, Agent OS usage, setup, security, and limitations;
- repository has a clean secret scan;
- CI is green;
- demo video can follow the scripted 2m30s flow.

## 20. Post-hackathon extensions

- Agentic Wallet adapter
- x402 spend policies
- multi-agent fleet view
- policy-as-code SDK
- durable remote audit storage
- configurable anomaly models
- enterprise approvals and RBAC
- signed/attested traces
- multi-account supervisory control
