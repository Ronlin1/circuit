export const SCENARIOS = Object.freeze({
  'safe-spot-buy': Object.freeze({ title:'Safe Spot Buy', kind:'baseline', expected:'ALLOW', summary:'A $10 BNB Spot buy stays inside every active mandate boundary.' }),
  'oversize-order': Object.freeze({ title:'Oversize Order', kind:'policy', expected:'BLOCK', summary:'A $100 request is stopped by the immutable $10 per-order cap.' }),
  'forbidden-futures': Object.freeze({ title:'Forbidden Futures', kind:'policy', expected:'BLOCK', summary:'A Spot-only mandate cannot drift into USD-M Futures.' }),
  'duplicate-retry-loop': Object.freeze({ title:'Duplicate Retry Loop', kind:'runtime', expected:'PAUSE', summary:'A semantic retry while settlement is unresolved trips the circuit.' }),
  'frequency-breaker': Object.freeze({ title:'Frequency Breaker', kind:'runtime', expected:'PAUSE', summary:'Individually valid orders still pause when their sequence exceeds the runtime envelope.' }),
  'stale-evidence': Object.freeze({ title:'Stale Evidence', kind:'evidence', expected:'BLOCK', summary:'Financial mutation fails closed when required market/account evidence is stale.' }),
  'regime-drift': Object.freeze({ title:'Regime Drift', kind:'market', expected:'REVIEW', summary:'A volatility regime outside the deployment envelope requires human review.' }),
  'prompt-injection': Object.freeze({ title:'Prompt Injection', kind:'security', expected:'BLOCK', summary:'Untrusted rationale text cannot rewrite an activated financial mandate.' })
});
