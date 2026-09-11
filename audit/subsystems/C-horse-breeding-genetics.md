# Audit: Horse, Breeding, Genetics, Health (Subsystem C)

**Scope:** `src/core/horse/` (34 files), `src/core/breeding/` (32 files), `src/core/genetics/` (14 files), `src/core/health/` (3 files)

## Cross-cutting checks

| Pattern         | Hits                                                         |
| --------------- | ------------------------------------------------------------ |
| `as any`        | 0                                                            |
| `as unknown as` | 0                                                            |
| `console.*`     | 0 (only in JSDoc @example block: `jockeyClubRules.ts:51-53`) |
| TODO/FIXME      | 0                                                            |

## Files requiring action

### FIX: `src/core/horse/foaling.ts`

1. **Type drift / missing `transmission`:** `FoalOutcome` type (l.36-38) requires `transmission: boolean` for live foals, but implementation (l.180) returns `{ kind: "live", foal: resolvedFoal }` with no `transmission` value.
2. **Stat modifier wipe-out:** Inbreeding/depression modifiers applied to `foal.stats.consistency` (l.158-172) are overwritten by `resolvePhenotype(foal)` (l.178) which recomputes `stats` from scratch. Fix: call `resolvePhenotype` before applying modifiers, or reapply after.
3. **Unbounded age risk:** `ageRisk = (dam.age - FOALING_AGE_RISK_THRESHOLD) * FOALING_AGE_RISK_MULTIPLIER` (l.76-78) has no upper clamp. Very old dams get guaranteed complication (`baseRate + ageRisk >= 1`).
4. `.ts` extension in import specifier (l.22) — non-standard.
5. Error message (l.71) reports "sire" when both parents lack genotype.

### FIX: `src/core/horse/horseFactory.ts`

`resolvePhenotype` (l.172-176) spreads `...horse` then overwrites `stats` from `resolveStats(...)` — discards any stat corrections made before the call. This is the root cause of the foaling modifier wipe-out. Also: redundant `as Horse` cast at l.318.

### REFACTOR: `src/core/types/branded.ts`

`Brand<T, _B> = T` (l.12) — brands are structural string aliases, providing no compile-time safety. `HorseId` is freely assignable to `StableId`. All 18 helper functions are unchecked casts / runtime no-ops. `OwnerKey = string` + `asOwnerKey` is redundant identity.

### KEEP with note: `src/core/horse/ownership.ts`

`ownershipFromStableId` (l.95-98) maps any truthy string to NPC ownership — if legacy `"__player__"` token is passed, it's misclassified as NPC. Add guard.

## Files: KEEP

83 files audited, 3 requiring action, 80 KEEP.
