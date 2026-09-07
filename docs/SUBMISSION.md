# 🏁 CIRCUIT — Hackathon Submission Package

## Track

**Binance Agent OS Mini Hackathon — Track A**

CIRCUIT is an explicit AI-agent supervision layer and deterministic runtime control plane for agentic finance.

> **Binance Agent OS gives AI agents execution. CIRCUIT gives users runtime control.**

## One-sentence pitch

CIRCUIT continuously verifies an AI agent’s intended financial action against a user-activated Financial Mandate, fresh market evidence, and sequence-aware runtime controls before the action can cross an execution boundary.

## Judge links

- **Live demo:** https://circuit-agent-os.netlify.app/
- **Agent OS Proof:** https://circuit-agent-os.netlify.app/proof/
- **Judge Mode:** https://circuit-agent-os.netlify.app/simulation/#judge-mode
- **Mission Control:** https://circuit-agent-os.netlify.app/mission-control/
- **GitHub:** https://github.com/Ronlin1/circuit

## 60-second judge flow

1. Open **Agent OS Proof**.
2. See real Binance Agent OS BNB/USDT market evidence enter CIRCUIT’s trace.
3. See `$100 BNB → BLOCK` because it exceeds the `$10` order cap and `$30` daily budget.
4. See `$8 BNB → ALLOW`, still behind a later human approval/execution boundary.
5. Confirm **0 Binance writes**.
6. Open **Judge Mode** and run all eight deterministic scenarios.
7. Inspect Mission Control / Flight Recorder if deeper evidence is needed.

## Verified Agent OS proof facts

| Intent | Binance market price | CIRCUIT evidence price | Evidence age | Decision | Reasons | Binance writes |
|---|---:|---:|---:|:---:|---|---:|
| `$100 BNB` | `745.63 USDT` | `745.63 USDT` | `0.684 s` | `BLOCK` | `ORDER_CAP_EXCEEDED`, `DAILY_BUDGET_EXCEEDED` | `0` |
| `$8 BNB` | `745.50 USDT` | `745.50 USDT` | `0.645 s` | `ALLOW` | none | `0` |

Canonical traces:

```text
5fba99e4-8280-45d2-bdaa-61da16f219a3  $100 BLOCK
777aeb09-5106-447b-8329-c25a1cfa298c  $8 ALLOW
```

The real Binance Agent OS calls used read-only market tools discovered from the MCP surface:

```text
spot.ticker24hr
spot.depth
```

The live market evidence entered CIRCUIT through `scenarioContext` and matched the returned Flight Recorder evidence exactly. Evidence age was below one second in both runs and `EVIDENCE_STALE` was absent.

## Claim boundary

### Safe to claim

- CIRCUIT was tested end-to-end with the real Binance Agent OS MCP.
- Real BNB/USDT ticker and depth evidence entered CIRCUIT’s deterministic evaluation path.
- A `$100` hypothetical Spot BUY was blocked by the active financial mandate.
- A separate `$8` hypothetical Spot BUY was allowed.
- Both decisions were recorded as CIRCUIT traces.
- Zero Binance write/trading/mutation tools were called in the proof.

### Do not overclaim

- Do not say a live trade was executed.
- Do not claim live Binance balances, concentration, drawdown, daily spend, volatility, or settlement state were used in the proof.
- Those account/runtime-state values remain CIRCUIT **simulation/default** assumptions and are **not live Binance account data**.
- Do not claim production readiness for unattended real-money operation.
- Do not claim guaranteed financial safety or trading returns.

## Suggested short project description

**CIRCUIT (Continuous Intent & Runtime Control for User-authorized Intelligent Transactions)** is a runtime control plane for agentic finance. It turns user intent into an immutable Financial Mandate, evaluates agent proposals against deterministic policy and fresh evidence, detects unsafe behavioral drift over time, and records every verdict in a tamper-evident Flight Recorder. In a real Binance Agent OS MCP proof, CIRCUIT consumed live BNB/USDT market evidence, blocked a `$100` proposal under a `$10` order cap, allowed a separate `$8` proposal, and made zero Binance writes.

## Draft X post

> Built **CIRCUIT** for the Binance Agent OS Mini Hackathon — a runtime control plane for agentic finance.
>
> Real Binance Agent OS market evidence → CIRCUIT:
> `$100 BNB` → **BLOCK**
> `$8 BNB` → **ALLOW**
> `0` Binance writes in the safety proof.
>
> Agent OS gives agents execution. CIRCUIT gives users runtime control.
>
> Demo: https://circuit-agent-os.netlify.app/
> Proof: https://circuit-agent-os.netlify.app/proof/
> GitHub: https://github.com/Ronlin1/circuit
>
> [Add final video link + required hackathon tags/mentions before posting.]

## Final submission checklist

- [x] Live demo deployed
- [x] Agent OS Proof page deployed
- [x] Judge Mode implemented
- [x] Real Agent OS read-only proof captured
- [x] Canonical trace IDs preserved
- [ ] Run final secret scan immediately before public visibility
- [ ] Make the GitHub public repository accessible to judges
- [ ] Record/upload final submission video
- [ ] Add final video link and required tags to the X post
- [ ] Publish the X post / quote-repost
- [ ] Complete the official submission survey
- [ ] Save screenshots/receipts of the X post and survey

## Final verification

Before public visibility and again before submission:

```bash
npm run verify
```

This includes the repository secret scan, deterministic scenario verification, syntax checks, tests, Flight Recorder checks, and HTTP/MCP smoke flow.
