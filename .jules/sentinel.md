## 2025-05-15 - Unsafe Native Crypto UUID Generation

**Vulnerability:** Multiple files (`src/core/replays/replayTypes.ts`, `src/core/expenses/expenseTypes.ts`, etc.) were directly calling `crypto.randomUUID()`.
**Learning:** Native `crypto.randomUUID()` is only available in secure contexts (HTTPS or localhost). In non-secure contexts, this throws an undefined error and crashes the application, resulting in a denial-of-service/availability issue. Additionally, bypassing the centralized `generateUUID` wrapper prevents deterministic UUID generation needed for gameplay testing and replays.
**Prevention:** Always use the centralized `generateUUID()` function from `@/core/uuid` to ensure fallback mechanisms (using `crypto.getRandomValues`) correctly handle non-secure contexts and respect deterministic seeds.

## 2025-05-16 - Math.random() Usage in Game RNG Seeds

**Vulnerability:** The seed generation function `makeWizardRng` in `src/components/NewGameWizard/steps/helpers.tsx` used `Math.random()` to generate a unique string.
**Learning:** While `Math.random()` might seem sufficient for casual uniqueness, it is highly predictable and unsuitable for tasks expecting cryptographic entropy. Replacing it with `generateUUID()` (which falls back to `crypto.getRandomValues`) ensures proper security and determinism constraints are respected across the application's core gameplay initialization.
**Prevention:** Avoid `Math.random()` for anything that requires collision resistance or unpredictability, even for offline seeding logic. Use the project's standard `generateUUID` to enforce proper entropy.

## 2025-05-17 - eval() Usage in tablesort.js

**Vulnerability:** The dynamic sorting logic in `src/assets/tablesort.js` previously used `eval()` to execute sorting rules based on className strings, creating a Cross-Site Scripting (XSS) vulnerability.
**Learning:** Using `eval()` to parse and execute code from DOM attributes (like `className`) allows an attacker to inject arbitrary JavaScript if they can control or manipulate those attributes. The fix replaced `eval()` with a safe array of sorting rules resolved iteratively without executing strings as code.
**Prevention:** Never use `eval()`, `new Function()`, `setTimeout(string)`, or `setInterval(string)` to parse or execute logic derived from DOM attributes, user input, or URL parameters. Instead, resolve references to existing functions safely, for example by referencing specific known functions (e.g., `window[functionName]`) with strict validation, or by mapping predefined strings to function objects.

## 2026-06-03 - setInterval(string) Vulnerability

**Vulnerability:** In `src/assets/horseRaceScript.js`, `setInterval()` was called with a string argument (`"TimerCallback()"`), acting as an implied eval.
**Learning:** Passing a string to `setTimeout` or `setInterval` causes the JS engine to evaluate the string as code. This is an unsafe practice equivalent to `eval()`, posing a security risk (XSS) if any part of the string ever incorporates user input, and it violates modern Content Security Policies (CSP) like `unsafe-eval`.
**Prevention:** Never pass strings to `setInterval` or `setTimeout`. Always pass direct function references or anonymous functions instead.

## 2025-05-18 - Math.random() in Fallback RNG

**Vulnerability:** The `nondeterministicRng` function in `src/core/common/rng.ts`, which generates fallback seeds for deterministic RNGs across the application, was using `Math.random()`. Several core files like `src/core/market/claiming.ts` and `src/core/breeding/bruceLowe.ts` also fell back to ad-hoc `Math.random()` mock objects when no seeded RNG was provided.
**Learning:** While `Math.random()` is acceptable for pure visual logic, it lacks cryptographic entropy and is highly predictable. Using it to generate critical seed material undermines the determinism guarantees and creates vulnerabilities where the sequence of values can be anticipated or manipulated, risking potential exploits in offline simulation components.
**Prevention:** Avoid `Math.random()` completely for seed generation and simulation fallbacks. Rely on `crypto.getRandomValues()` (via a centralized implementation like `nondeterministicRng()`) when generating random material to ensure secure, cryptographically sound entropy.
