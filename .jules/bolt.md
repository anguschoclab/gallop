## 2025-05-15 - Unrolling inner loop and Math inlining
**Learning:** Hot loops inside the physics simulation (like factor ledger recording every tick for every horse) incur noticeable overhead when using `for..of` over keys and `Math.min/max/abs`. Manually unrolling property access and inlining the math avoids allocations and speeds up execution significantly.
**Action:** For frequently called data-collection methods in simulations, explicitly dispatch rather than loop when the key set is fixed and small.
