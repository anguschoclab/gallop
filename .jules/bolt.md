## 2025-02-20 - Eliminate Hidden Object Allocations in Hot Loops
**Learning:** Creating Map objects (`new Map()`) inside deeply nested loops that process hundreds of snapshots per race heavily bottlenecked performance by stressing the garbage collector and causing constant object allocations.
**Action:** When performing aggregate operations on arrays of objects (like race snapshots containing horses), iterate over the raw arrays directly to locate elements rather than defensively reconstructing maps or intermediate data structures inside the iteration loop.
