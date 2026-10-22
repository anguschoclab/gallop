## 2024-10-22 - Finding untested file in core logic
**Learning:** `src/domains/market/simulation/syndicateInvestorActions.ts` is completely untested. This module handles investor generation and state derivation for syndication, which involves RNG, state shaping (`InvestorRecord`, `ShareTransaction`), and monetary values (`price`, `shares`).
**Action:** Use this as a target for adding an isolated, high-value unit test, capturing its behavior since changes could silently break syndication logic.
