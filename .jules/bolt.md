## 2024-05-24 - Array.prototype.find in hot loop
**Learning:** Using `Array.prototype.find()` with complex arrow functions in high-frequency simulation ticks (e.g., `applyBlockingEffect` running at 10Hz per runner) incurs unnecessary callback overhead and misses optimization opportunities when the array is already sorted.
**Action:** When searching sorted arrays in critical loops, use a standard `for` loop to eliminate callback allocation and leverage early `break` conditions to prevent full array traversal.
