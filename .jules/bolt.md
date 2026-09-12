## 2024-05-24 - Avoid Hidden Duplicate Context Allocation in High-Frequency Loops
**Learning:** The ~10Hz Track visualizer had hoisted `buildFieldContext` outside its own map loop but still passed `runners` to `captureRunnerMoods`, which internally called `buildFieldContext` *again*. This caused hidden duplicate O(N log N) work on every frame.
**Action:** When optimizing high-frequency render loops, carefully inspect the internal call trees of helper functions. Pass pre-computed contexts down as optional arguments to avoid hidden duplicate allocations.
