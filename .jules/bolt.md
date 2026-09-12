## 2026-09-11 - Prevent duplicate context allocations in render loop
**Learning:** Even if a function like `buildFieldContext` is hoisted out of a loop, calling it twice per frame (once directly in the component, once hidden inside a helper like `captureRunnerMoods`) still causes massive GC pressure and O(N log N) sorting overhead.
**Action:** Always inspect the call tree of helper functions invoked in the render loop to ensure they aren't recalculating data that is already available or calculated adjacently. Pass pre-computed contexts down.
