🧪 Add tests for Banister fitness/fatigue health model

🎯 **What:** The Banister health model functions (`calculateImpulse`, `decayValue`, `calculatePeakingIndex`, `getPeakingBeyerMultiplier`) in `src/core/health/banister.ts` lacked test coverage, which left critical game fitness and fatigue logic untested.
📊 **Coverage:** The new test file `src/tests/core/health/banister.test.ts` covers the full suite of math functions from the Banister model, testing happy paths and boundary conditions (like 0 intensity, extreme peaking index thresholds, and tau decay values).
✨ **Result:** Test coverage for the health model logic has improved significantly. Future refactors or adjustments to training intensity and form calculations can be done confidently without inadvertently breaking the core mechanics.
