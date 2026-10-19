## 2024-05-18 - Missing Core Logic Coverage Discovered
**Learning:** `evaluateHorseAttachment` in `src/domains/horse/simulation/attachment.ts` has branching logic covering many attachment signals, but does not appear to be tested directly. It calculates the fundamental score mapping how tightly a stable holds onto a horse which scales up into market prices.
**Action:** Always verify if functions returning complex scored state representations have standalone tests rather than just being integrated inside higher-level orchestrator tests.
