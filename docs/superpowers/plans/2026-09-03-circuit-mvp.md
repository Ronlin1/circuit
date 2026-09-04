# CIRCUIT MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build CIRCUIT, a simulation-first runtime control plane that supervises Binance Agent OS financial actions, blocks policy violations and runtime drift, and produces a polished adversarial demo.

**Architecture:** A dependency-light Node.js 22 application uses immutable domain contracts, a deterministic policy engine, a sequence-aware runtime drift engine, and an execution gateway that is the only path to adapters. SQLite stores hash-linked Flight Recorder events, an HTTP/SSE control plane serves the Mission Control UI, and a Binance MCP adapter is isolated behind the same interface as the deterministic simulator.

**Tech Stack:** Node.js 22.16+, JavaScript ESM with JSDoc/type guards, built-in `node:test`, `node:sqlite`, built-in HTTP server, vanilla HTML/CSS/JS dashboard, Docker, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-03-circuit-design.md`

## Global Constraints

- Default runtime mode is `simulation`; live financial execution is never the default.
- Node.js version floor is 22.16.0.
- No external withdrawals, Margin, or Futures execution in CIRCUIT v1.
- An LLM may draft/interpret/explain; deterministic code retains veto authority.
- A compiled Financial Mandate must remain `DRAFT` until an explicit activation call.
- Every execution-capable action must pass `ActionIntent -> policy -> drift -> Flight Recorder -> execution gateway`.
- `PAUSED` and `EMERGENCY` states require explicit recovery.
- `.env`, bearer tokens, API keys, wallet secrets and auth cookies must never be committed or written into SQLite/logs.
- Every production behavior change follows RED → verify failure → GREEN → full tests → commit.
- Meaningful milestones are committed separately.

---

### Task 1: Project foundation and domain contracts

**Files:** `package.json`, `.gitignore`, `.env.example`, `src/domain/*`, `test/domain/mandate.test.js`.

**Interfaces:** immutable `FinancialMandate`, `ActionIntent`, and `EvidenceBundle` factories.

- [ ] **Step 1: Write failing domain tests** for safe defaults, normalization, invalid caps, and immutable activation.
- [ ] **Step 2: Run domain tests** and confirm failure.
- [ ] **Step 3: Implement minimal domain contracts** with safe defaults: Spot-only, no implicit leverage, normalized uppercase assets/symbols, positive caps, and deep freeze.
- [ ] **Step 4: Run domain tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: establish CIRCUIT domain contracts`.

### Task 2: Deterministic policy engine

**Files:** `src/policy/checks.js`, `src/policy/engine.js`, `test/policy/engine.test.js`.

**Interfaces:** `evaluatePolicy(mandate, intent, evidence, now)` -> `{ action, checks, approvedUsd, reasonCodes }`.

- [ ] **Step 1: Write failing policy tests** for inactive mandate, read-only mutation, product/asset restrictions, order cap, daily cap, concentration, drawdown, stale evidence, uncertain settlement, and safe allow.
- [ ] **Step 2: Run policy tests** and confirm failure.
- [ ] **Step 3: Implement one pure check per rule and precedence aggregator** with `PAUSE > BLOCK > REVIEW > RESIZE > ALLOW`.
- [ ] **Step 4: Run policy tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: add deterministic financial policy engine`.

### Task 3: Runtime drift engine and circuit state machine

**Files:** `src/runtime/runtime-store.js`, `src/runtime/drift.js`, `src/runtime/state-machine.js`, tests under `test/runtime/`.

**Interfaces:** `evaluateDrift(mandate, intent, evidence, recentEvents, now)` and `nextRuntimeState(current, signal)`.

- [ ] **Step 1: Write failing drift/state tests** for duplicate semantic intent, order burst, regime drift, sticky PAUSED/EMERGENCY, and explicit recovery.
- [ ] **Step 2: Run focused tests** and confirm failure.
- [ ] **Step 3: Implement in-memory runtime store, drift findings, and state transition table**.
- [ ] **Step 4: Run focused tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: detect runtime drift and trip circuit states`.

### Task 4: Tamper-evident flight recorder with SQLite

**Files:** `src/trace/*`, `src/persistence/sqlite.js`, `test/trace/flight-recorder.test.js`.

**Interfaces:** `canonicalJson`, `FlightRecorder.append/get/list`, `verifyTraceChain`.

- [ ] **Step 1: Write failing trace tests** for canonical JSON, linked hashes, tamper detection, and SQLite round-trip.
- [ ] **Step 2: Run trace tests** and confirm failure.
- [ ] **Step 3: Implement canonical serialization, hash chaining, and SQLite schema** for mandates, runtime state, trace events, and executions.
- [ ] **Step 4: Run trace tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: add tamper-evident flight recorder`.

### Task 5: Execution gateway and deterministic Binance simulator

**Files:** `src/adapters/mock-binance.js`, `src/execution/gateway.js`, `test/execution/gateway.test.js`.

**Interfaces:** adapter `getMarketEvidence(intent, scenarioContext)` / `execute(intent, approvedUsd)`, gateway `evaluate(intent, context)` / `executeEvaluated(traceId)`.

- [ ] **Step 1: Write failing integration tests** for allow→execute, block→never execute, pause→never execute, and execute-only-after-allow.
- [ ] **Step 2: Run gateway tests** and confirm failure.
- [ ] **Step 3: Implement `MockBinanceAdapter` and `ExecutionGateway`**. Gateway combines policy + drift decisions, updates runtime, records a trace, and stores only allowed executable intents.
- [ ] **Step 4: Run gateway tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: gate execution behind CIRCUIT decisions`.

### Task 6: Competition scenario engine

**Files:** `src/scenarios/catalog.js`, `src/scenarios/runner.js`, `test/scenarios/runner.test.js`.

**Interfaces:** `SCENARIOS`, `runScenario(id, services)`.

Scenario IDs: `safe-spot-buy`, `oversize-order`, `forbidden-futures`, `duplicate-retry-loop`, `frequency-breaker`, `stale-evidence`, `regime-drift`, `prompt-injection`.

- [ ] **Step 1: Write failing scenario tests** asserting expected terminal decision/reason code for all eight scenarios.
- [ ] **Step 2: Run scenario tests** and confirm failure.
- [ ] **Step 3: Implement deterministic fixtures and runner**. Prompt-injection text lives only in `rationale` and cannot alter typed policy inputs.
- [ ] **Step 4: Run scenario tests** and confirm all eight pass.
- [ ] **Step 5: Commit** `feat: add adversarial CIRCUIT demo scenarios`.

### Task 7: HTTP API and real-time event stream

**Files:** `src/app/services.js`, `src/mandate/compiler.js`, `src/server/*`, `src/index.js`, API/compiler tests.

**Interfaces:** routes from spec; SSE `GET /api/events` emits trace/runtime/scenario events.

- [ ] **Step 1: Write failing compiler/API tests** for natural-language parsing, health, current mandate, scenario run, traces, runtime state, and explicit recovery.
- [ ] **Step 2: Run API tests** and confirm failure.
- [ ] **Step 3: Implement deterministic mandate compilation plus built-in HTTP router and SSE hub** with body-size limits, JSON validation, safe error mapping, and no secret logging. Compiler returns DRAFT only.
- [ ] **Step 4: Run API tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: expose CIRCUIT control-plane API`.

### Task 8: Mission Control dashboard

**Files:** `public/*`, `test/ui/static-assets.test.js`.

**Required UI:** environment badge, runtime state, active mandate limits, runtime health, activity timeline, scenario launcher, trace inspector, intervention controls.

- [ ] **Step 1: Write failing static-asset test** for required hooks and scenario controls.
- [ ] **Step 2: Run UI test** and confirm failure.
- [ ] **Step 3: Build responsive mission-control UI** with semantic HTML, black/yellow/white branding, accessible buttons/dialog, live SSE, and trace drill-down.
- [ ] **Step 4: Run UI/static tests and local HTTP smoke**.
- [ ] **Step 5: Commit** `feat: build black yellow and white CIRCUIT mission control`.

### Task 9: Binance Agent OS MCP adapter

**Files:** `src/adapters/binance-mcp.js`, adapter tests, `.env.example`, `src/app/services.js`.

**Interfaces:** same adapter contract as simulator. Dual-era MCP client supporting current `2026-07-28` stateless routing plus safe fallback to `2025-11-25` handshake/session clients.

- [ ] **Step 1: Write failing fake-MCP tests** for modern tools/list, tools/call, auth redaction, legacy fallback, and capability mapping.
- [ ] **Step 2: Run adapter tests** and confirm failure.
- [ ] **Step 3: Implement Streamable HTTP JSON-RPC client** that fails closed on auth/tool ambiguity and never prints bearer tokens.
- [ ] **Step 4: Run adapter tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: add dual-stack Binance Agent OS MCP adapter`.

### Task 10: Security, documentation, CI, and release checks

**Files:** README, SECURITY, demo/threat docs, CI, secret scan tests/scripts, Docker packaging.

- [ ] **Step 1: Write failing secret-scan test** with synthetic high-risk patterns and safe fixtures.
- [ ] **Step 2: Implement secret scanner** without echoing matched values.
- [ ] **Step 3: Write docs** for setup, architecture, differentiation, simulation/live, eight-scenario demo, limitations, security, pitch.
- [ ] **Step 4: Add CI** for Node 22 and `npm run verify`.
- [ ] **Step 5: Run `npm run verify`** with zero failures.
- [ ] **Step 6: Commit** `docs: harden and package CIRCUIT for submission`.

### Task 11: MCP-native Supervisor surface

**Files:** `src/mcp/circuit-server.js`, `src/supervisor/briefing.js`, MCP/supervisor tests, HTTP/UI/docs modifications.

**Interfaces:** `POST /mcp/circuit`; modern `2026-07-28`; legacy compatibility `2025-11-25`; tools `circuit_status`, `circuit_evaluate_intent`, `circuit_trace_briefing`.

The MCP surface MUST NOT expose execution, mandate activation, or runtime recovery in v1.

- [ ] **Step 1: Write failing briefing tests** proving immutable verdicts and malicious rationale isolation.
- [ ] **Step 2: Write failing MCP tests** for discovery, tools, evaluation, briefing, unsupported tools, and absence of execution/recovery.
- [ ] **Step 3: Run focused tests** and confirm failure.
- [ ] **Step 4: Implement advisory briefing builder and dual-era MCP endpoint** with metadata, JSON-RPC errors, body limits, no secret output.
- [ ] **Step 5: Add Mission Control Agent Interface panel** showing MCP readiness and endpoint.
- [ ] **Step 6: Run full verification and local MCP smoke**.
- [ ] **Step 7: Commit** `feat: expose CIRCUIT as an MCP-native supervisor`.

### Task 12: Final adversarial verification and competition demo state

**Files:** only files needed to fix findings.

- [ ] **Step 1: Run `npm run verify`**.
- [ ] **Step 2: Launch server and exercise all eight scenarios through HTTP**.
- [ ] **Step 3: Exercise modern MCP discovery plus all CIRCUIT MCP tools**.
- [ ] **Step 4: Verify trace chain** after scenario execution.
- [ ] **Step 5: Verify secret scan and clean git status**.
- [ ] **Step 6: Review commit history** for meaningful milestone commits.
- [ ] **Step 7: Commit only if fixes required**.
