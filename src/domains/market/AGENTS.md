# Market domain

- **Exchange market index**: `src/domains/market/simulation/marketIndex.ts` derives a recency-weighted price/fair-value index from trades (stamped with `fairValue` in `runExchangeSettlementDay`); `generateNpcBook` quotes at fair value × a damped, ±15%-capped multiplier and adds per-stable 30-day net-outflow pressure (≤0.3) to rival stances. Why: prices track trading without a runaway feedback loop.
