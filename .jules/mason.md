## 2024-05-24 - Layering violation fix in NpcCareerTrackerPanel

**Learning:** UI components must not import directly from `@/core` to avoid coupling UI logic with core business logic. The `no-restricted-syntax` ESLint rule correctly enforces this. Running global `lint --fix` can cause unwanted churn like adding empty JSDoc tags to unrelated files.
**Action:** When a UI component needs data derived from core logic, route the import through a service, hook, or state slice (e.g., `src/services/npc/npcFacade.ts`). Avoid global fix commands and target specific files or fix issues manually to prevent unrelated changes.
