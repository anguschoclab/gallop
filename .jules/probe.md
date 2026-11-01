
## 2026-11-01 - Market Simulation Pure Functions
**Learning:** Market simulation files like `marketRefresh.ts`, `claimingImpacts.ts`, `priceAlertMessages.ts`, and `syndicateInvestorActions.ts` contained core logic (price alerts formatting, aging boundaries, claiming log impact generation) that was untested. Testing these purely functional files yields high value with very minimal setup.
**Action:** Continue prioritizing pure utility and simulation functions that deal with data transitions, string formatting, and number crunching, as they act as a reliable anchor against regressions during refactors.
