## 2026-10-31 - [Global State Test Isolation in genotypeCache]
**Learning:** The genotypeCache.ts module uses a module-level Map to store caching state, which introduces a global state that persists across test executions. This breaks test isolation if not carefully managed.
**Action:** Always ensure modules with module-level state expose a reset function (like clearAllCaches) and explicitly call it in a beforeEach block in test suites that interact with them.
