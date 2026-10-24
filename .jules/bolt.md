## 2024-10-24 - Optimized detectBlocking to reduce O(n) lookups
**Learning:** During race simulation, both `detectBlocking` and `applyBlockingEffect` were redundantly iterating over `sortedField` to find the same blocking horse ahead. Since this happens for every runner on every simulation tick, reducing this iteration is a critical performance win.
**Action:** Caching `blockingHorseVelocity` during the initial `detectBlocking` pass allows `applyBlockingEffect` to avoid a second redundant O(n) loop over `sortedField`.
