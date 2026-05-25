## 2025-05-15 - Unsafe Native Crypto UUID Generation

**Vulnerability:** Multiple files (`src/core/replays/replayTypes.ts`, `src/core/expenses/expenseTypes.ts`, etc.) were directly calling `crypto.randomUUID()`.
**Learning:** Native `crypto.randomUUID()` is only available in secure contexts (HTTPS or localhost). In non-secure contexts, this throws an undefined error and crashes the application, resulting in a denial-of-service/availability issue. Additionally, bypassing the centralized `generateUUID` wrapper prevents deterministic UUID generation needed for gameplay testing and replays.
**Prevention:** Always use the centralized `generateUUID()` function from `@/core/uuid` to ensure fallback mechanisms (using `crypto.getRandomValues`) correctly handle non-secure contexts and respect deterministic seeds.

## 2025-05-16 - Math.random() Usage in Game RNG Seeds

**Vulnerability:** The seed generation function `makeWizardRng` in `src/components/NewGameWizard/steps/helpers.tsx` used `Math.random()` to generate a unique string.
**Learning:** While `Math.random()` might seem sufficient for casual uniqueness, it is highly predictable and unsuitable for tasks expecting cryptographic entropy. Replacing it with `generateUUID()` (which falls back to `crypto.getRandomValues`) ensures proper security and determinism constraints are respected across the application's core gameplay initialization.
**Prevention:** Avoid `Math.random()` for anything that requires collision resistance or unpredictability, even for offline seeding logic. Use the project's standard `generateUUID` to enforce proper entropy.
