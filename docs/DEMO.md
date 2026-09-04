# CIRCUIT Competition Demo Runbook

Target: **2 minutes 30 seconds**. One story, no feature tour.

## 0:00–0:20 — Hook

Open Mission Control.

> “AI agents can now read markets and act through Binance Agent OS. But once an agent has permission, who watches the agent? CIRCUIT is the runtime control plane for agentic finance.”

Point to the active mandate: Spot only, BNB/USDT, `$10/order`, `$30/day`.

## 0:20–0:40 — Prove the happy path

Run **Safe Spot Buy**.

Show `ALLOW`, then the hash-linked trace.

> “CIRCUIT does not block automation. It allows actions that stay inside the user’s operating envelope.”

## 0:40–1:05 — Static-policy failure

Run **Oversize Order** and **Forbidden Futures**.

Show `ORDER_CAP_EXCEEDED` and `PRODUCT_NOT_ALLOWED`.

> “The model cannot negotiate with these rules. Deterministic code owns the veto.”

## 1:05–1:35 — The differentiator

Run **Duplicate Retry Loop** or **Frequency Breaker**.

Show `PAUSE` and runtime state change.

> “This is why CIRCUIT is not another pre-trade checker. Every `$10` order can be individually valid while the sequence is unsafe. CIRCUIT supervises behavior over time.”

Use **Explicit recovery** to restore the paused agent.

## 1:35–1:55 — Assumption drift

Run **Regime Drift**.

Show `REVIEW`.

> “The strategy was authorized under one operating regime. CIRCUIT notices when those assumptions no longer hold.”

## 1:55–2:15 — Attack the AI

Run **Prompt Injection**.

Open the trace inspector and show the malicious rationale plus the untouched `$10` mandate and final `BLOCK`.

> “Untrusted text can influence reasoning. It cannot rewrite financial authorization.”

## 2:15–2:30 — Agent-to-agent close

Point to **Agent Interface** and `/mcp/circuit`, then click **Verify chain**.

> “CIRCUIT is MCP-native too. Any compatible AI host can inspect state, submit proposals for deterministic evaluation, and ask for a trace briefing—but the agent-facing surface cannot move money or unpause itself. Binance Agent OS gives agents execution. CIRCUIT gives users runtime control.”

Close on: **Giving AI access to money should not mean trusting it forever—CIRCUIT makes that trust continuously verifiable.**
