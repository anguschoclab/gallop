## 2025-02-28 - Typed Jockey Progression
**Learning:** `Jockey.traitProgression` maps used open string types (`Record<string, number>`) causing type weaknesses and relying on `as any` casting in the UI (`jockey.$jockeyId.tsx`).
**Action:** Replaced `Record<string, number>` with `Partial<Record<JockeyTrait, number>>` to make the dictionary type-safe and removed `any` casts from UI logic, surfacing stricter trait contract guarantees.
