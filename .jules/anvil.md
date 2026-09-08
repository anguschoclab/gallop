## 2024-05-15 - Fix hidden runtime bug in NPC insurance intents
**Learning:** Explicit `any` casts in `generateNpcInsuranceIntents` hid the fact that we were checking `currentGrade` and `racing` on a `Horse` object, which do not exist.
**Action:** Instead of casting away type errors, verify the interface and check actual properties like `raceHistory` and `stats`.
