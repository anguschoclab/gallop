## 2025-05-15 - Replace Set with Array.includes in tacticalAI hot path
**Learning:** In performance-critical hot loops (like the race simulation which fires hundreds of thousands of times), allocating a `new Set()` inside the loop for very small arrays (e.g. 0-3 rivals) adds measurable overhead and GC pressure.
**Action:** For small constant-sized arrays inside hot loops, `Array.includes()` is typically faster and completely avoids heap allocations.
