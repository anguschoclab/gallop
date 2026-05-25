## 2025-05-15 - Unsafe Native Crypto UUID Generation

**Vulnerability:** Multiple files (`src/core/replays/replayTypes.ts`, `src/core/expenses/expenseTypes.ts`, etc.) were directly calling `crypto.randomUUID()`.
**Learning:** Native `crypto.randomUUID()` is only available in secure contexts (HTTPS or localhost). In non-secure contexts, this throws an undefined error and crashes the application, resulting in a denial-of-service/availability issue. Additionally, bypassing the centralized `generateUUID` wrapper prevents deterministic UUID generation needed for gameplay testing and replays.
**Prevention:** Always use the centralized `generateUUID()` function from `@/core/uuid` to ensure fallback mechanisms (using `crypto.getRandomValues`) correctly handle non-secure contexts and respect deterministic seeds.
