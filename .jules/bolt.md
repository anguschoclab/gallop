## 2026-11-03 - Avoid for..of loops in JavaScript hot paths
**Learning:** Overusing `for..of` loops over arrays in per-tick simulation physics hot loops introduces significant function-call overhead via the iterator protocol. Testing confirmed that standard indexed loops (`for (let i = 0; i < arr.length; i++)`) run almost twice as fast.
**Action:** When working in high-frequency engine modules, always use standard indexed for loops. Do not sacrifice basic syntax choices that cost nothing in readability for 2x overhead in hot loops.
