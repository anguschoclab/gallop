## 2024-05-20 - Training Intents
**Learning:** `generateNpcTrainingIntents` relies heavily on internal budget and AI logic but has no dedicated unit tests in `src/tests/core/npc/intents/` (there are tests for `trainingAI.ts` but not the orchestrating intent generation).
**Action:** Add tests for `generateNpcTrainingIntents` to verify it correctly honors `distressLevel`, budget limits, and pregnancy constraints.
