## 2024-05-24 - Pure Function Structural Verification
**Learning:** Pure functions generating structured domain objects (like `createDefaultFoalDevelopmentArc`) are extremely safe and fast to test without mocks, but often lack direct coverage if developers assume they are implicitly tested by action reducers.
**Action:** Always write isolated unit tests for factory functions to verify hardcoded constants and offsets, preventing silent regressions before they propagate to the store logic.
