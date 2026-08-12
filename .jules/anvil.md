## 2026-08-12 - Typing RaceFeed component
**Learning:** Relying on `any` for component props (like `horses` and `fileClaim`) bypassed TypeScript's checking, risking silent breakage if the data model or callback signature changed.
**Action:** Replaced `any` with explicit domain types (`Horse[]` and a strict function signature) and relied on implicit inference for iterators.
