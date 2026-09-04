# CIRCUIT Agent OS Live Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit, testable CIRCUIT Supervisor Agent and a safe real-Binance-Agent-OS proof workflow.

**Architecture:** The AI planner can only return a typed financial proposal. CIRCUIT's existing gateway owns evidence collection, deterministic policy/drift evaluation, trace creation, and execution eligibility. The Binance write path remains inaccessible until CIRCUIT returns ALLOW/RESIZE and a separate human approval gate returns true.

**Tech Stack:** Node.js 22+, native test runner, existing CIRCUIT MCP/Agent OS adapter, zero new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-05-agent-os-live-proof-design.md`

## Global Constraints
- Do not invent Binance MCP tool names or schemas.
- Never print or persist Binance OAuth/bearer credentials.
- Live execution remains Spot-only and explicitly human-approved.
- Public/demo defaults remain simulation-first.
- Planner never receives the execution adapter or gateway execute method.

---

### Task 1: Supervisor Agent kernel
**Files:**
- Create: `src/agent/supervisor-agent.js`
- Test: `test/agent/supervisor-agent.test.js`

**Interfaces:**
- Consumes: `{ planner, services, approvalGate }`.
- Produces: `CircuitSupervisorAgent.run({ goal, execute }) -> { status, proposal, trace, approved, execution? }`.

- [ ] Write failing tests proving BLOCK never executes, ALLOW requires approval, rejected approval never executes, and approved ALLOW executes exactly once.
- [ ] Run focused tests and confirm RED.
- [ ] Implement the minimal kernel.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit.

### Task 2: Safe Agent OS capability discovery
**Files:**
- Create: `src/agent/binance-discovery.js`
- Create: `scripts/agent-os-probe.js`
- Test: `test/agent/binance-discovery.test.js`

**Interfaces:**
- Consumes: an object implementing `listTools()`.
- Produces: sanitized `{ connected, toolCount, tools:[{name,description,inputKeys}] }`.

- [ ] Write failing tests that capability discovery is read-only and sanitized.
- [ ] Run focused tests and confirm RED.
- [ ] Implement discovery and CLI error mapping.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit.

### Task 3: Reproducible local Supervisor demo
**Files:**
- Create: `scripts/run-supervisor-demo.js`
- Test: `test/agent/demo-script.test.js`

**Interfaces:**
- Produces deterministic $100 BLOCK and $8 ALLOW-without-execution proof using simulation services.

- [ ] Write failing contract test for expected demo output markers.
- [ ] Run focused test and confirm RED.
- [ ] Implement script.
- [ ] Run focused test and confirm GREEN.
- [ ] Commit.

### Task 4: Supported-host live demo profile
**Files:**
- Create: `agent/CIRCUIT_SUPERVISOR.md`
- Create: `agent/codex-config.example.toml`
- Create: `docs/AGENT_OS_LIVE_DEMO.md`
- Test: `test/agent/live-demo-docs.test.js`

**Interfaces:**
- Registers official Binance endpoint `https://agent.binance.com/mcp/agentic` and CIRCUIT endpoint `https://circuit-agent-os.netlify.app/mcp/circuit`.
- Demo profile must explicitly prohibit Binance write calls during the proof run.

- [ ] Write failing docs-contract test.
- [ ] Run focused test and confirm RED.
- [ ] Add host config and exact demo runbook.
- [ ] Run focused test and confirm GREEN.
- [ ] Commit.

### Task 5: Release verification and publication
**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `.github/workflows/ci.yml` only if artifact inclusion requires it.

- [ ] Add safe scripts `agent:demo` and `agent:probe`.
- [ ] Run `npm run verify`.
- [ ] Run `npm run agent:demo`.
- [ ] Confirm exported release artifact still verifies without Git metadata.
- [ ] Publish feature branch, open PR, inspect CI/review, merge only when green.
