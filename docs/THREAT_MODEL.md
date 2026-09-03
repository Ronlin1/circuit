# CIRCUIT Threat Model

## Protected assets

1. User-authorized Agentic sub-account funds.
2. The integrity of the active Financial Mandate.
3. Execution authorization state.
4. MCP authorization material.
5. Flight Recorder integrity.
6. User confidence that blocked actions did not reach an execution adapter.

## Trust boundaries

```text
Untrusted user/market/tool text
        │
        ▼
Worker / Supervisor AI  ────── untrusted reasoning boundary
        │ typed ActionIntent
        ▼
CIRCUIT deterministic core ─── trusted policy boundary
        │ executable trace only
        ▼
Execution adapter ───────────── external service boundary
        │
        ▼
Binance Agent OS / simulator
```

## Threats and controls

### T1 — Prompt injection rewrites permissions

**Threat:** Tool output or rationale says “ignore previous restrictions”.

**Control:** Active mandates are typed/frozen. Rationale is audit data only. Policy checks consume structured fields, never instructions embedded in rationale.

### T2 — Oversized or forbidden action

**Threat:** Model proposes size/product outside mandate.

**Control:** Deterministic hard checks return `BLOCK` before an executable trace exists.

### T3 — Duplicate transaction after stale state

**Threat:** Agent retries while a previous semantic intent is `SUBMITTED`/`UNKNOWN`.

**Control:** `UNCERTAIN_PRIOR_SETTLEMENT` and duplicate semantic-intent detection return `PAUSE`.

### T4 — Safe actions form an unsafe sequence

**Threat:** Several individually valid orders exceed behavior frequency or daily budget.

**Control:** Runtime store evaluates the sequence; frequency anomalies pause the agent and account evidence enforces cumulative budget.

### T5 — Strategy assumptions become stale

**Threat:** Volatility regime diverges from the approved baseline.

**Control:** Runtime drift returns `REVIEW` or `PAUSE` per mandate.

### T6 — Stale evidence

**Threat:** Agent acts on old or unverifiable market/account data.

**Control:** Evidence older than `maxEvidenceAgeMs` returns `BLOCK`.

### T7 — Credential disclosure

**Threat:** Tokens appear in logs, DB, source, or error messages.

**Control:** No secret persistence, fail-closed MCP errors with redacted messages, `.env` ignored, repository secret scanner in CI.

### T8 — MCP protocol/tool ambiguity

**Threat:** CIRCUIT guesses a tool name or misroutes an execution call.

**Control:** Tool discovery plus explicit capability mappings. Missing/ambiguous mappings return `MCP_CAPABILITY_MAPPING_REQUIRED` or `MCP_TOOL_NOT_DISCOVERED`.

### T9 — Trace alteration

**Threat:** A decision record is edited after an incident.

**Control:** Append-only SQLite path plus SHA-256 previous-hash chaining and `verifyTraceChain`.

## Residual risk

CIRCUIT cannot prove an external exchange executed exactly as intended, prevent compromise outside its process, guarantee data-source correctness, or replace Binance account-level controls. Live deployment should use the smallest possible Agentic sub-account funding and permissions.
