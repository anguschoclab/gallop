## 2025-02-27 - Intent Exhaustiveness
**Learning:** The Intent system has many different intent types but the cost estimator `estimateIntentCost` in `npcActionRegistry.ts` relied on a default fallback of 0. This masks potential runtime bugs when new intent types are added that should have a cost.
**Action:** Applied a strict exhaustiveness check to `estimateIntentCost` using `const _exhaustiveCheck: never = intent;` in the default case, forcing future intent additions to be explicitly categorized and preventing silent failures in NPC action budgeting.
