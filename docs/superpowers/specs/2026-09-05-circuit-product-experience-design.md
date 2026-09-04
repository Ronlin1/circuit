# CIRCUIT Product Experience & Hosted Demo Design

**Date:** 2026-09-05  
**Status:** Approved  
**Owner:** Ronald Atuhaire

## Goal

Turn CIRCUIT's verified control-plane demo into a clear, judge-ready product website without changing the deterministic financial safety core. The hosted experience must make Mission Control discoverable, provide a dedicated simulation workflow, explain the architecture and story, document live-agent integration honestly, and use one consistent CIRCUIT visual identity across GitHub and the deployed site.

## Product information architecture

The public site is a static multi-page experience served by Netlify CDN, with CIRCUIT's existing Netlify Function continuing to own `/api/*` and `/mcp/circuit`.

Primary pages:

1. **Home** (`/`) — judge-facing product thesis, proof points, animated CIRCUIT control loop, prominent Mission Control and Simulation CTAs.
2. **Mission Control** (`/mission-control/`) — full operational dashboard: mandate, runtime health, MCP interface, Flight Recorder, circuit breaker, and live API state.
3. **Simulation Lab** (`/simulation/`) — the eight deterministic adversarial scenarios with expected and actual verdicts, concise explanations, and trace details.
4. **How CIRCUIT Works** (`/how-it-works/`) — the control loop, mandate/policy/drift/decision/recorder architecture, and fail-closed principles.
5. **Live Agents** (`/live-agents/`) — MCP integration instructions, safe production boundary, explicit statement that live financial execution is not enabled by the public demo, and production-readiness requirements.
6. **About** (`/about/`) — the origin story: built for the Binance Agent OS Mini Hackathon around the question of how user intent remains enforceable after an autonomous agent is authorized.

## Navigation and discoverability

Every page uses the same sticky navbar with:

- CIRCUIT mark and name;
- Home;
- Mission Control;
- Simulation;
- How it Works;
- Live Agents;
- About;
- a high-visibility **LIVE DEMO** status badge.

The active page is visually indicated. Mobile navigation collapses into a native button-controlled menu. The Home page has explicit CTA buttons to Mission Control and Simulation so the dashboard cannot be mistaken as missing.

## Brand system

The existing GitHub mark at `docs/assets/circuit-mark.svg` is the canonical logo. A byte-identical public copy is served from `public/assets/circuit-mark.svg` and referenced as:

- navbar logo;
- browser SVG favicon;
- social/product mark where appropriate.

Core palette remains:

- background `#070707`;
- accent `#f0b90b`;
- primary text `#f8f8f8`.

## Motion language

The hero control-loop visual keeps CIRCUIT at the center while four labels continuously orbit around it:

- INTENT;
- POLICY;
- DRIFT;
- EXECUTION.

The labels remain upright while their orbital arms rotate. Motion is CSS-only, bounded, and disabled/reduced under `prefers-reduced-motion`.

The LIVE DEMO badge uses a restrained yellow pulse/blink only when `/api/health` responds successfully. If health fails, it becomes `DEGRADED` and stops pulsing. This represents HTTP availability, not an SSE stream, because the Netlify serverless transport intentionally advertises `realtime: false`.

## Mission Control behavior

Mission Control preserves all existing verified functionality:

- current Financial Mandate;
- runtime state and health;
- MCP supervisor endpoint and safe tool names;
- Flight Recorder trace timeline;
- explicit recovery control;
- trace-chain verification.

The page boots through `/api/health`, `/api/mandates/current`, and `/api/traces`. EventSource is opened only when the backend advertises realtime support.

## Simulation Lab behavior

Simulation Lab exposes all eight deterministic scenarios:

- safe Spot buy → ALLOW;
- oversize order → BLOCK;
- forbidden Futures → BLOCK;
- duplicate retry loop → PAUSE;
- frequency breaker → PAUSE;
- stale evidence → BLOCK;
- regime drift → REVIEW;
- prompt injection → BLOCK.

Each scenario shows its expected outcome before execution and its actual verdict after execution. The UI must not imply profit prediction or trading performance.

## Live-agent page and production honesty

The public hosted demo remains simulation-first. The Live Agents page explains:

- MCP endpoint: `/mcp/circuit`;
- exposed tools: `circuit_status`, `circuit_evaluate_intent`, `circuit_trace_briefing`;
- no MCP execution/recovery/mandate-activation tool is exposed;
- live Binance Agent OS execution requires authenticated capability discovery/mapping and a hardened deployment boundary.

The page includes a production-readiness section covering authentication/authorization, durable state, rate limiting, observability, secrets, live capability validation, incident recovery, and deployment controls.

## Routing and hosting

Netlify serves `public/` as static assets and `netlify/functions/circuit.mts` handles `/api/*` and `/mcp/circuit`. The local Node server gains directory-index support so `/mission-control/`, `/simulation/`, etc. behave like Netlify during local tests.

No new runtime npm dependencies are introduced.

## Security invariants

This redesign must not:

- expose an execution tool through CIRCUIT MCP;
- enable live trading in the public deployment;
- weaken deterministic policy vetoes;
- store credentials in source or frontend assets;
- infer safety from UI state alone.

The public site is an explanatory and simulation surface over the existing deterministic core.

## Testing and release gates

The release must include regression tests proving:

- all six pages exist and are statically routable;
- every page includes the shared navbar and favicon/logo;
- Mission Control retains its semantic hooks;
- Simulation includes all eight scenarios and expected verdicts;
- the four control-loop labels have orbit semantics;
- the LIVE DEMO indicator has health-driven state and reduced-motion support;
- local static routing supports directory indexes;
- no execution control appears in the MCP-facing UI documentation;
- the full `npm run verify` gate passes;
- the exported Git-less release artifact passes the same verification gate.

## Production-readiness assessment

For real-money production, CIRCUIT is not yet production-ready. The current release is a strong hackathon-grade supervised simulation/control-plane demo. The principal gaps are authentication/authorization at the public control plane, durable multi-instance persistence, rate limiting, production observability, audited live Binance tool mappings, deployment controls, and incident/recovery operations.
