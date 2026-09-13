## 2024-05-30 - Removed explicit any in TrackPrestigeSection
**Learning:** Explicit `any` in generic arguments for `reduce` or `Map` bypass type checking for derived UI states.
**Action:** Always import and use explicit domain types (like `StrategyPrestigeTier`) when seeding maps or accumulators.
