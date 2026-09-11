# Audit: Race Engine & AI (Subsystem A)

**Scope:** `src/core/race/` (80 files) and `src/core/ai/` (57 files)

## Cross-cutting checks

| Pattern | Hits | Notes |
|---------|------|-------|
| `as any` | 0 | Clean |
| `as unknown as` | 6 | `headToHead.ts:35`, `syndicationTuning.ts:93,164`, `strategicCoordinator.ts:133`, `breedingSelection.ts:53,141` |
| `console.*` | 1 | `validateTieBreakFields.ts:55` — `console.error` in core logic |
| TODO/FIXME | 0 | Clean |

## Files requiring action

### FIX: `src/core/race/engine/jockeyEffects.ts` (l.113-121)
`applyBlockingEffect` uses `Array.find()` without early break on sorted field. PR #395 fixes this with for-loop + break. **Verdict: FIX** (take PR #395's hunk).

### FIX: `src/core/race/runnerConditionDerivation.ts` (l.73-85, 92-102)
`nearestRival` does full O(N) scan; `isBlocked` uses `.some()` without leveraging sorted order. PR #391 fixes this with early-break. **Verdict: FIX** (take PR #391).

### FIX: `src/core/race/engine/simulation.ts` (l.237, 324-335)
Per-tick `sortedField` sort + per-runner `applyBlockingEffect` = O(N²) blocking scan per tick. `rankMap` freshly allocated each tick. **Verdict: FIX** (Phase 4 optimization).

### REFACTOR: `src/core/race/headToHead.ts:35`
Synthetic `Race` cast with `as unknown as Race` — partial object only has `distance`, `raceClass`, `graded`. Downstream code expecting other fields will break.

### REFACTOR: `src/core/ai/breedingSelection.ts:53,141`
Two `as unknown as` casts for `Horse` and `stable.syndicateShares`.

### REFACTOR: `src/core/ai/strategicCoordinator.ts:133`
`state as unknown as { pregnancies?: unknown[] }` — accessing undeclared state property.

### REFACTOR: `src/core/ai/syndicationTuning.ts:93,164,170`
Heavy JSON `as unknown as` casting for tuning config.

### KEEP with note: `src/core/race/engine/validateTieBreakFields.ts:55`
`console.error` before throw — remove or route to logger.

### KEEP with note: `src/core/race/engine/tacticalAI.ts:38`
`progress = runner.position / (pace.leaderPos || 1)` — can exceed 1.0 at race start. Verify intent.

## All other files: KEEP
137 files audited, 7 requiring action, 130 KEEP.
