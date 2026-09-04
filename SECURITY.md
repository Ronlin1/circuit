# CIRCUIT Security Policy

CIRCUIT supervises financial actions, so safety boundaries are part of the product rather than optional configuration.

## Supported mode

The competition build defaults to `SIMULATION`. Live Binance MCP access is opt-in, requires Binance authorization, and remains fail-closed until required capabilities are explicitly mapped.

## Never commit

- Binance authorization or bearer material
- exchange API keys/secrets
- OAuth artifacts or cookies
- wallet private keys or seed phrases
- `.env` files containing live secrets

Run `npm run secret:scan` before every push.

## Live execution constraints

CIRCUIT v1 supports only an explicitly configured Spot execution adapter. It does not intentionally expose external withdrawals, Margin, or Futures through the execution gateway.

A worker agent must not receive raw credentials. The execution gateway is the only component allowed to invoke an execution-capable adapter.

## Reporting a vulnerability

For the hackathon development phase, report vulnerabilities privately to the repository owner. Do not publish working exploits against a live Binance account or expose authentication material in an issue.

## Non-guarantees

CIRCUIT is experimental hackathon software. It does not guarantee financial safety, exchange availability, protocol compatibility, profit, loss prevention, or regulatory compliance.
