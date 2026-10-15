# Audit: Time, Pipeline, Resolver, Calendar (Subsystem B)

**Scope:** `src/core/time/` (65 files), `src/core/calendar/` (5 files), `src/core/resolver/` (35 files)

## Cross-cutting checks

| Pattern         | Hits | Locations                                                   |
| --------------- | ---- | ----------------------------------------------------------- |
| `as any`        | 0    | —                                                           |
| `as unknown as` | 1    | `DiplomacyHandler.ts:23`                                    |
| `console.*`     | 1    | `resolver.ts:137` (`console.warn` for unknown impact types) |
| TODO/FIXME      | 0    | —                                                           |

## Files requiring action

### FIX: `src/core/time/phases/schedulerPhase.ts`

1. **Missing player-ownership guard** (l.113-117): Second loop only checks `!horse`, not `horse.ownership?.type !== "player"`. Can auto-enter NPC/unowned horses and assign `makePlayerOwned()`. First loop (l.43) has the guard.
2. **Unsafe `campaign.flags` spread** (l.156): `[...campaign.flags]` throws if flags is undefined/non-iterable. Fix: `[...(campaign.flags ?? [])]`.
3. Surface `as` cast at l.58 without validation.

### FIX: `src/core/resolver/handlers/HorseHandler.ts:204-221`

**CTA always attached to injury inbox messages** — `cta` and `secondaryCta` are always set, but tests expect them `undefined` for `minor` and `moderate` injuries. Should be conditional on `severity === "major" || severity === "career-ending"`.
**This is the root cause of 2 failing HorseHandlerInjury tests.**

### FIX: `src/core/calendar/dateFormatting.ts:58-65, 76-84`

**Off-by-one bugs:**

- `getMonthName(31)` returns `February` instead of `January` (strict `<` threshold)
- `formatDate(1)` returns `"Jan 2"` instead of `"Jan 1"` (over-adds 1)
- Fix: use `<=` threshold and remove `+ 1` from day calculation

### REFACTOR: `src/core/time/phases/index.ts:8`

Stale JSDoc references `./stateUpdate` which no longer exists.

### REFACTOR: `src/core/resolver/resolver.ts:137`

`console.warn` for unknown impact types — route through game logging.

### REFACTOR: `src/core/resolver/handlers/DiplomacyHandler.ts:23`

`as unknown as` cast to access `draft.npcAIManager` — add to GameState type.

## Registered phases (55 total)

All 55 phases are registered in `index.ts:72-150` with matching `PHASE_ORDER_*` constants in `pipelineConstants.ts:5-57`. No missing constants. Phase ordering is correct (sorted by value at runtime).

## Files: KEEP

105 files audited, 6 requiring action, 99 KEEP.

## V5 delta

- Resolver: `Object.hasOwn(IMPACT_HANDLERS, type)` landed in all 8 dict-dispatch handlers — canHandle/handle share one source of truth; drift hazard eliminated. Diplomacy/Inbox keep `type ===` (no dict, verified correct exclusion). New contract spec `handlerCanHandle.test.ts` (known-type acceptance + proto-prop rejection + no cross-claim).
- Phases: #521's dead-cast removal merged (8 files). BUG-V5-001: residual `(state as {rankingsHistory?...})` in `dailySnapshotPhase.ts:42` missed by the sweep — removed; field declared `systemsState.ts:79`.
- BUG-V5-002 disproved: `rankings-history` kebab route is NOT a violation to fix — kebab-case routes are the baselined convention (15+ instances); #545's rename would change the URL and create inconsistency. Baseline entry retained.
- K-audit check: pipeline phase count unchanged; no phase additions this round.
