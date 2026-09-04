# CIRCUIT Product Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a multi-page, judge-ready CIRCUIT site with a discoverable Mission Control dashboard, Simulation Lab, live-agent onboarding, shared GitHub branding, health-driven live state, and Netlify/local routing parity.

**Architecture:** Keep the existing deterministic CIRCUIT runtime and Netlify Function unchanged except for static-route parity. Build a dependency-free static multi-page frontend under `public/` with shared CSS and lightweight page scripts. Use the canonical SVG mark for both navbar branding and favicon, and preserve the existing API/MCP contracts.

**Tech Stack:** Node.js >=22.16, vanilla HTML/CSS/JavaScript, Node built-in test runner, Netlify Functions, existing CIRCUIT HTTP/MCP core.

**Spec:** `docs/superpowers/specs/2026-09-05-circuit-product-experience-design.md`

## Global Constraints

- No new runtime npm dependencies.
- Preserve black `#070707`, yellow `#f0b90b`, white `#f8f8f8` brand system.
- Public deployment remains simulation-first; do not enable live trading.
- CIRCUIT MCP remains advisory/evaluation-only with no execution/recovery/activation tool.
- All animation must respect `prefers-reduced-motion`.
- Every meaningful implementation slice must end green and be committed.

---

### Task 1: Multi-page shell, canonical branding, and static route parity

**Files:**
- Create: `public/assets/circuit-mark.svg`
- Create: `public/mission-control/index.html`
- Create: `public/simulation/index.html`
- Create: `public/how-it-works/index.html`
- Create: `public/live-agents/index.html`
- Create: `public/about/index.html`
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `src/server/http.js`
- Test: `test/ui/static-assets.test.js`
- Test: `test/server/api.test.js`

**Interfaces:**
- Consumes: existing static server `createHttpServer(services)` and canonical mark at `docs/assets/circuit-mark.svg`.
- Produces: six routable pages and directory-index behavior for local HTTP serving.

- [ ] **Step 1: Write failing tests** asserting all pages exist, include shared nav/favicons, use the canonical logo, and local HTTP returns 200 for `/mission-control/`, `/simulation/`, `/how-it-works/`, `/live-agents/`, and `/about/`.
- [ ] **Step 2: Run focused tests** with `node --test test/ui/static-assets.test.js test/server/api.test.js` and confirm failures are missing pages/routes.
- [ ] **Step 3: Implement the shared page shell and directory-index mapping** without changing API/MCP routing.
- [ ] **Step 4: Run focused tests** and confirm green.
- [ ] **Step 5: Commit** as `feat: add CIRCUIT multi-page product shell`.

### Task 2: Animated control loop and health-driven LIVE DEMO state

**Files:**
- Create: `public/shared.js`
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: all page HTML files
- Test: `test/ui/static-assets.test.js`

**Interfaces:**
- Consumes: `GET /api/health` JSON envelope.
- Produces: shared navigation state, mobile menu behavior, health-aware LIVE DEMO badge, and four-label orbit visual.

- [ ] **Step 1: Write failing tests** for `INTENT`, `POLICY`, `DRIFT`, `EXECUTION` orbit hooks, `LIVE DEMO` indicator, health fetch, and reduced-motion CSS.
- [ ] **Step 2: Run `node --test test/ui/static-assets.test.js`** and verify RED.
- [ ] **Step 3: Implement `shared.js` and CSS animations** with `LIVE` only after health succeeds and `DEGRADED` on failure.
- [ ] **Step 4: Run focused UI tests** and confirm green.
- [ ] **Step 5: Commit** as `feat: animate CIRCUIT control loop and live status`.

### Task 3: Mission Control extraction and dashboard reliability

**Files:**
- Modify: `public/mission-control/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `test/ui/static-assets.test.js`

**Interfaces:**
- Consumes: `/api/health`, `/api/mandates/current`, `/api/traces`, runtime recovery and trace APIs.
- Produces: dedicated Mission Control dashboard retaining all existing semantic IDs and behavior.

- [ ] **Step 1: Write failing tests** that Mission Control—not Home—contains `environment-badge`, `runtime-state`, `mandate-card`, `runtime-health`, `activity-timeline`, `trace-inspector`, MCP endpoint, and explicit recovery control.
- [ ] **Step 2: Run focused UI tests** and verify RED.
- [ ] **Step 3: Move the existing dashboard markup to Mission Control and harden `app.js` boot/status handling** without changing backend behavior.
- [ ] **Step 4: Run focused UI tests** and confirm green.
- [ ] **Step 5: Commit** as `feat: make Mission Control a dedicated dashboard`.

### Task 4: Dedicated Simulation Lab

**Files:**
- Create: `public/simulation.js`
- Modify: `public/simulation/index.html`
- Modify: `public/styles.css`
- Test: `test/ui/static-assets.test.js`

**Interfaces:**
- Consumes: `POST /api/scenarios/:id/run`.
- Produces: an eight-scenario lab showing expected vs actual deterministic verdict and trace summary.

- [ ] **Step 1: Write failing tests** asserting all eight scenario IDs, their expected verdict labels, and simulation script binding are present.
- [ ] **Step 2: Run focused UI tests** and verify RED.
- [ ] **Step 3: Implement scenario execution/rendering** using safe DOM escaping and no execution controls.
- [ ] **Step 4: Run focused UI tests** and confirm green.
- [ ] **Step 5: Commit** as `feat: add dedicated adversarial simulation lab`.

### Task 5: How It Works, Live Agents, About, and production-readiness messaging

**Files:**
- Modify: `public/how-it-works/index.html`
- Modify: `public/live-agents/index.html`
- Modify: `public/about/index.html`
- Modify: `public/styles.css`
- Test: `test/ui/static-assets.test.js`

**Interfaces:**
- Consumes: existing MCP endpoint/tool names and documented architecture.
- Produces: explanatory pages with honest public-demo/live-production boundary.

- [ ] **Step 1: Write failing tests** for architecture stages, exact safe MCP tools, public demo simulation disclaimer, production hardening checklist, and origin-story copy.
- [ ] **Step 2: Run focused UI tests** and verify RED.
- [ ] **Step 3: Implement the three content pages** with no claims that the public site executes live funds.
- [ ] **Step 4: Run focused UI tests** and confirm green.
- [ ] **Step 5: Commit** as `docs: add CIRCUIT product story and live-agent guide`.

### Task 6: Full release verification and deployment packaging

**Files:**
- Modify only if verification exposes a defect.
- Verify: all source, tests, Netlify files, and release artifact.

**Interfaces:**
- Consumes: complete product experience and current release workflow.
- Produces: a green GitHub branch/PR, merged `main`, and a Netlify-ready artifact.

- [ ] **Step 1: Run `npm run verify`** and require zero failures.
- [ ] **Step 2: Run local page smoke** for `/`, `/mission-control/`, `/simulation/`, `/how-it-works/`, `/live-agents/`, `/about/`, `/api/health`, and `/mcp/circuit`.
- [ ] **Step 3: Verify exported Git-less artifact** with the same `npm run verify` gate.
- [ ] **Step 4: Publish the complete commit chain to one feature branch ref update**, open PR, and require GitHub CI green.
- [ ] **Step 5: Merge to `main` only after green CI**, generate a fresh release artifact, redeploy the exact green source to the existing Netlify site, and validate live UI/API/MCP endpoints.
