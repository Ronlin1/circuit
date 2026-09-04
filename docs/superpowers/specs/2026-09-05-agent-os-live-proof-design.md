# CIRCUIT Agent OS Live Proof Design

## Goal
Build an explicit CIRCUIT Supervisor Agent that uses Binance Agent OS as a real external capability layer while preserving CIRCUIT as the deterministic execution boundary.

## Track A fit
Binance Track A asks builders to create an AI agent using Agent OS. CIRCUIT already implements an MCP-native supervisory control plane and a Binance Agent OS MCP adapter. This phase adds an explicit agent orchestration layer and a reproducible real-Agent-OS demo path.

## Safety invariant
The planner never receives the Binance execution adapter. It can only produce a typed proposal. CIRCUIT evaluates that proposal against the active Financial Mandate and runtime state. BLOCK, REVIEW, and PAUSE terminate the run. ALLOW/RESIZE may proceed only after an explicit human approval callback. Only then may CIRCUIT's existing execution gateway invoke the configured Binance adapter.

## Components
1. `CircuitSupervisorAgent` — orchestration kernel. Consumes a goal, a planner, CIRCUIT services, and an approval gate. Produces a run record with proposal, trace, approval state, and optional execution.
2. `createStructuredPlanner` — small adapter that validates planner output as a CIRCUIT ActionIntent; it does not own execution.
3. `discoverBinanceCapabilities` — safe Agent OS capability probe that lists advertised MCP tools and returns a sanitized report. It never prints bearer credentials or calls write tools.
4. `scripts/agent-os-probe.js` — local probe command for a networked machine. Unauthenticated or expired sessions fail safely with explicit status.
5. `agent/CIRCUIT_SUPERVISOR.md` — model-host instructions for the live demo: use Binance Agent OS for read-only market context, construct one typed proposal, call CIRCUIT, and never perform a Binance write during the proof run.
6. `agent/codex-config.example.toml` — example remote MCP registration for Binance Agent OS and deployed CIRCUIT. Authentication remains owned by the supported host's OAuth flow.
7. `scripts/run-supervisor-demo.js` — deterministic local demonstration of the same orchestration boundary so judges/developers can reproduce ALLOW/BLOCK behavior without credentials.

## Real demo sequence
1. Authenticate Binance Agent OS in a supported AI host.
2. Ask the Supervisor Agent for current BNB/USDT market context through Binance Agent OS.
3. Ask it to propose a $100 Spot BNB buy under CIRCUIT's $10 order cap.
4. CIRCUIT returns BLOCK / ORDER_CAP_EXCEEDED. No Binance write is called.
5. Ask it to propose an $8 Spot BNB buy.
6. CIRCUIT returns ALLOW.
7. Stop at explicit human approval for the read-only proof. A tiny Spot write can be tested separately only if the user deliberately authorizes it.

## Non-goals
- No Futures or leverage.
- No autonomous unattended trading.
- No extraction or logging of OAuth/bearer credentials.
- No invented Binance MCP tool names or argument schemas.
- No bypass path from planner to Binance execution.
