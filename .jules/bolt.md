## 2024-11-20 - Array spreading and chaining in frequent loops
**Learning:** In highly frequent loops (like race condition derivations every tick), chaining `.filter().reduce()` and spreading arrays like `[...moving].sort()` creates significant garbage collection overhead and repeated iteration overhead.
**Action:** Replace functional array chains with single-pass `for` loops that accumulate required states simultaneously, and sort locally created arrays in-place before returning them to eliminate intermediate allocations.
