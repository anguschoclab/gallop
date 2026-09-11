# Audit: Narrative, History & Services (Subsystem G)

**Scope:** `src/services/narrative/`, `src/assets/narrative/`, `src/core/history/`, `src/core/inbox/`, `src/core/awards/`, `src/core/analytics/`

## Cross-cutting checks

| Pattern | Hits |
|---------|------|
| `as any` | 0 |
| `as unknown as` | 0 |
| `console.*` | 0 |
| TODO/FIXME | 0 |

## Files requiring action

### FIX: `src/services/narrative/commentaryGenerator.ts` (l.159-171, 211-219)
**Double-substitution bug:** Placeholders like `{recordTime}`, `{recordHolder}`, `{year}`, `{grade}`, `{straightLength}`, `{circumference}`, `{elevation}` are substituted TWICE. First pass (l.160) uses `toFixed(1)` for precision; second pass (l.212) uses `toString()`, wiping the decimal. Track-record times render as whole seconds instead of tenths.

### FIX: `src/services/narrative/rivalryGrudgeMatch.ts:148`
Grammar typo: `"during today is grudge match"` should be `"during today's grudge match"`.

### REFACTOR: `src/services/narrative/rivalryGrudgeMatch.ts` + `rivalryNewsGenerator.ts`
`generateStableIntroNews()` and `buildRivalryNews()` are duplicated across both files.

### REFACTOR: `src/core/awards/scoring.ts` + `invitations.ts`
`CONTINENT_TO_REGION` duplicated in both files (l.30-35 and l.18-23).

### REFACTOR: `src/core/awards/awardInboxMessages.ts:5-10`
Re-declares `REGION_DISPLAY_NAMES` (already in `types.ts`); the two maps are inconsistent for `europe` (`"Europe"` vs `"Europe & Middle East"`).

### REFACTOR: `src/core/awards/scoring.ts:177`
`isEligibleForCategory()` default branch returns `true` for unknown categories — could silently accumulate points for misspelled/future categories.

## Template counts (for PR verification)
- `src/assets/narrative/templates.ts`: START = 16 templates, FINISH = 20 templates. PR #384 adds +14 START, +10 FINISH → 30/30.
- `src/services/narrative/flavorStories.ts`: PR #390 content appears to already be present (track l.13-149, jockeys l.150-321).

## Files: KEEP
All other files in scope are clean. 38 files audited, 5 requiring action, 33 KEEP.
