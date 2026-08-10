## 2024-03-24 - Claiming Mechanics Need Coverage
**Learning:** The claiming race mechanics in `src/core/market/claiming.ts` are completely untested, lacking a corresponding test file in `src/tests/core/market`.
**Action:** Always ensure core transaction logic, like claiming horses which affects ownership and funds, is well-tested to prevent edge-case exploitation or silent failures in future refactoring.
