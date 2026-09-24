## 2024-05-24 - Test coverage for Grinding condition in runnerConditionDerivation

**Learning:** Testing ratio-based logic in simulated race loops requires careful tracing of velocity inputs vs peak velocities because the derivation strictly guards these boundaries (e.g. Grinding only occurs if progress > 0.7 and field ratio >= 0.99 and fade ratio < 1.02).

**Action:** When adding or tuning runner conditions in the future, create isolated mock field scenarios to verify exactly which condition flags trigger without coupling to full race simulations.
