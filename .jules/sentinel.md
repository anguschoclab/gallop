## 2025-05-15 - Unsafe Native Crypto UUID Generation

**Vulnerability:** Multiple files (`src/core/replays/replayTypes.ts`, `src/core/expenses/expenseTypes.ts`, etc.) were directly calling `crypto.randomUUID()`.
**Learning:** Native `crypto.randomUUID()` is only available in secure contexts (HTTPS or localhost). In non-secure contexts, this throws an undefined error and crashes the application, resulting in a denial-of-service/availability issue. Additionally, bypassing the centralized `generateUUID` wrapper prevents deterministic UUID generation needed for gameplay testing and replays.
**Prevention:** Always use the centralized `generateUUID()` function from `@/core/uuid` to ensure fallback mechanisms (using `crypto.getRandomValues`) correctly handle non-secure contexts and respect deterministic seeds.

## 2025-05-16 - Math.random() Usage in Game RNG Seeds

**Vulnerability:** The seed generation function `makeWizardRng` in `src/components/NewGameWizard/steps/helpers.tsx` used `Math.random()` to generate a unique string.
**Learning:** While `Math.random()` might seem sufficient for casual uniqueness, it is highly predictable and unsuitable for tasks expecting cryptographic entropy. Replacing it with `generateUUID()` (which falls back to `crypto.getRandomValues`) ensures proper security and determinism constraints are respected across the application's core gameplay initialization.
**Prevention:** Avoid `Math.random()` for anything that requires collision resistance or unpredictability, even for offline seeding logic. Use the project's standard `generateUUID` to enforce proper entropy.

## 2025-05-17 - Missing Content Security Policy

**Vulnerability:** The application was missing a Content-Security-Policy (CSP) header/meta tag.
**Learning:** Without a CSP, the application lacked a defense-in-depth layer against Cross-Site Scripting (XSS) and potential data exfiltration. By defining a strict CSP in `src/routes/__root.tsx` (using `http-equiv="Content-Security-Policy"`), the browser is instructed to only load and execute resources from approved origins (e.g., `'self'`, specific font and image domains), effectively neutralizing unauthorized external scripts or malicious asset injections.
**Prevention:** Always include a `Content-Security-Policy` to enforce resource restrictions. For React/TanStack Router applications, this can be efficiently managed via the root component's `<meta>` tags.
