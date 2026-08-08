## 2024-03-22 - Tactical AI Testing
**Learning:** The tactical AI in `calculateTacticalAdjustment` is a pure function that takes a runner, pace context, and field to calculate target velocity and lane. It cleanly encapsulates jockey pacing, traffic navigation, and instruction handling without mutating the runner state directly.
**Action:** Pure AI calculation functions like this are ideal targets for high-value tests. Always provide full mock contexts (e.g., pace and field) to fully exercise their branching logic.
