## 2025-02-25 - Prevent Set Allocation in Hot Loop
**Learning:** Instantiating new objects (like `new Set()`) inside high-frequency game engine loops causes significant garbage collection overhead and slows down calculations, even if the sets are small. For small arrays like `rivalHorseIds`, a simple `.includes` check is much faster than converting to a Set first.
**Action:** In game engine hot loops, avoid allocating new Objects/Sets/Arrays per tick. Prefer reading from existing arrays or caching the computed sets beforehand.
