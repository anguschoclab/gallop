## 2025-02-25 - Mocking Rng in Vitest
**Learning:** When mocking the `Rng` utility (e.g., `mockRng.pick`) in Vitest, explicitly typing the array parameter in the mock implementation as `readonly any[]` (or `readonly T[]`) is required to satisfy TypeScript's strict readonly array constraints. Failing to do so causes assignment type errors during compilation.
**Action:** Always use `readonly any[]` when mocking `Rng.pick` to ensure type safety.
