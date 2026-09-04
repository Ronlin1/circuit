# ⚡ CIRCUIT Architecture

> **Runtime control infrastructure for autonomous financial agents.**

CIRCUIT sits between an AI agent and financial execution. The AI may reason, propose and explain. The deterministic CIRCUIT core decides whether the proposal is allowed to become executable.

## 1. System architecture

```mermaid
flowchart LR
    U[👤 User] --> M[📜 Financial Mandate]
    U --> W[🤖 Worker Agent]
    W --> I[ActionIntent]
    H[🧠 MCP-compatible AI Host] -->|MCP| C
    M --> C
    I --> C

    subgraph C[CIRCUIT Runtime Control Plane]
      G[Intent Gateway]
      P[Deterministic Policy Engine]
      D[Runtime Drift Engine]
      S[Circuit State Machine]
      F[Flight Recorder]
      G --> P --> D --> S --> F
    end

    F -->|ALLOW only| E[🔐 Execution Gateway]
    E --> SIM[🧪 Binance Simulator]
    E -->|explicit live mapping| B[🟡 Binance Agent OS MCP]

    classDef yellow fill:#f0b90b,color:#070707,stroke:#f0b90b,stroke-width:2px;
    classDef dark fill:#111,color:#fff,stroke:#444,stroke-width:1px;
    classDef safe fill:#151515,color:#fff,stroke:#f0b90b,stroke-width:2px;
    class U,M,W,H,I,E,SIM,B dark;
    class C,G,P,D,S,F safe;
```

## 2. Decision pipeline

```mermaid
flowchart TD
    A[Agent proposes action] --> B{Typed intent valid?}
    B -- No --> X[BLOCK]
    B -- Yes --> C{Mandate active?}
    C -- No --> X
    C -- Yes --> D[Policy checks]
    D --> E[Runtime drift checks]
    E --> F{Decision precedence}
    F -->|PAUSE| P[PAUSE + sticky runtime state]
    F -->|BLOCK| X
    F -->|REVIEW| R[Human review required]
    F -->|RESIZE| Z[Approved amount reduced]
    F -->|ALLOW| L[Record executable trace]
    L --> Q{Explicit execution call?}
    Q -- No --> N[No financial action]
    Q -- Yes --> Y[Execution adapter]

    classDef yellow fill:#f0b90b,color:#070707,stroke:#f0b90b;
    classDef red fill:#341212,color:#fff,stroke:#ff5d5d;
    classDef dark fill:#111,color:#fff,stroke:#444;
    class L,Y yellow;
    class X,P red;
    class A,B,C,D,E,F,R,Z,Q,N dark;
```

Decision precedence is immutable:

`PAUSE > BLOCK > REVIEW > RESIZE > ALLOW`

Model-generated text cannot downgrade a stronger verdict.

## 3. Runtime state machine

```mermaid
stateDiagram-v2
    [*] --> HEALTHY
    HEALTHY --> WATCH: warning
    HEALTHY --> DEGRADED: review condition
    WATCH --> DEGRADED: review condition
    WATCH --> HEALTHY: clear evidence
    DEGRADED --> PAUSED: runtime breaker
    HEALTHY --> PAUSED: hard runtime breaker
    WATCH --> PAUSED: hard runtime breaker
    PAUSED --> PAUSED: implicit activity
    PAUSED --> HEALTHY: explicit recovery
    PAUSED --> EMERGENCY: escalation
    EMERGENCY --> EMERGENCY: implicit activity
    EMERGENCY --> HEALTHY: explicit recovery
```

`PAUSED` and `EMERGENCY` are sticky. An agent cannot recover itself through the MCP supervisor surface.

## 4. Trust boundaries

```mermaid
flowchart LR
    A[Untrusted prompts / market text / tool output] --> B[AI reasoning boundary]
    B --> C[Typed ActionIntent]
    C --> D[Trusted deterministic core]
    D --> E[Hash-linked decision trace]
    E -->|ALLOW only| F[External execution boundary]
    F --> G[Binance Agent OS / simulator]

    classDef untrusted fill:#2a1515,color:#fff,stroke:#ff5d5d;
    classDef trusted fill:#161307,color:#fff,stroke:#f0b90b,stroke-width:2px;
    classDef external fill:#111,color:#fff,stroke:#777;
    class A,B untrusted;
    class C,D,E trusted;
    class F,G external;
```

## 5. MCP composition

CIRCUIT exposes only advisory/supervisory MCP tools in v1:

- `circuit_status`
- `circuit_evaluate_intent`
- `circuit_trace_briefing`

It intentionally does **not** expose:

- financial execution;
- mandate activation;
- runtime recovery.

This means a connected AI host can inspect, propose, evaluate and explain without gaining a path to bypass the human-controlled execution boundary.

## 6. Persistence and audit

Every evaluated action produces a trace containing:

1. user/agent intent;
2. mandate version;
3. normalized evidence;
4. policy checks;
5. runtime drift findings;
6. final verdict;
7. runtime state transition;
8. previous trace hash;
9. current SHA-256 trace hash.

The Flight Recorder is **tamper-evident**, not a blockchain ledger.

## 7. Deployment model

```mermaid
flowchart TB
    subgraph Local_or_Docker[Local / Docker]
      A[Node.js 22 server] --> B[(SQLite circuit.db)]
    end

    subgraph Hosted_Demo[Vercel hosted demo]
      C[Node.js runtime] --> D[(/tmp/circuit.db)]
      C --> E[Simulation mode]
    end

    subgraph Live_OptIn[Explicit live mode]
      F[CIRCUIT] --> G[Authenticated Binance MCP]
      G --> H[Explicitly mapped Spot tools only]
    end
```

The hosted demo defaults to **SIMULATION**. Live Binance execution remains opt-in and fails closed until an authenticated session and explicit tool mappings are supplied.

## 8. Repository modules

| Module | Responsibility |
|---|---|
| `src/domain/` | Immutable typed financial contracts |
| `src/policy/` | Deterministic financial veto rules |
| `src/runtime/` | Drift detection and circuit state |
| `src/execution/` | Evaluation/execution isolation |
| `src/adapters/` | Simulator and Binance MCP bridge |
| `src/trace/` | Hash-linked Flight Recorder |
| `src/mcp/` | MCP-native supervisor interface |
| `src/server/` | HTTP/SSE control plane |
| `src/scenarios/` | Reproducible adversarial demonstrations |
| `public/` | Black/yellow/white Mission Control |

See also [`THREAT_MODEL.md`](THREAT_MODEL.md), [`DEMO.md`](DEMO.md), and the full design spec in [`superpowers/specs/2026-09-03-circuit-design.md`](superpowers/specs/2026-09-03-circuit-design.md).
