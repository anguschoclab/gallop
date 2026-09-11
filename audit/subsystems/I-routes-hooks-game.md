# Audit: Routes, Hooks, Game, Workers (Subsystem I)

**Scope:** `src/routes/` (67 files), `src/hooks/` (81 files), `src/game/` (47 files), `src/workers/` (3 files), `src/router.tsx`

## Cross-cutting checks

| Pattern                  | routes | hooks | game | workers |
| ------------------------ | ------ | ----- | ---- | ------- |
| `as any`/`as unknown as` | 0      | 6     | 4    | 0       |
| `console.*`              | 1      | 8     | 12   | 0       |
| TODO/FIXME               | 0      | 0     | 0    | 0       |

## Key findings

### FIX: `src/hooks/shared/useSaveSlots.ts:54-70`

`handleLoad` sets `isLoading(true)` but only calls `setIsLoading(false)` in the `catch` block. **On successful load, loading state remains `true` forever.**

### REFACTOR: `src/game/store/slices/campaignSlice.ts:132-154`

`dismissCampaignFlag` removes flag by `filter` AND enqueues `campaign_flag_dismissal` intent. If pipeline processes the intent, the index is already stale — may remove wrong flag or no-op. `CampaignFlag.dismissed` field is effectively dead (removal, not soft-delete).

### REFACTOR: `src/hooks/shared/use*State.ts` (5 files)

`useCoreState`, `useMarketState`, `useRacingState`, `useBreedingState`, `useSystemsState` claim "shallow comparison" in headers but use plain `useGame` for arrays/objects. Multi-value return objects are not memoized.

### REFACTOR: 4 `useNavigate` casts

`useTabParam.ts:12`, `useRacePhase.ts:32`, `useNpcStablesFilters.ts:38`, `useRegionalComparisonParams.ts:58` all use `useNavigate() as unknown as GenericNavigateFn` to bypass TanStack typed search generics.

### REFACTOR: `src/hooks/horse/useHorseDetail.ts:144`

`localHorseMap: new Map(Object.entries(horses))` — fresh Map every render.

### REFACTOR: `src/hooks/dashboard/useDashboardData.ts:46-68`

`upcoming`, `urgentMessages`, `topRivals`, `activeAuctions` re-created every render as fresh arrays.

### REFACTOR: `src/game/store/storage.ts:162,241`

`state as unknown as GameState` and `state as GameState & { storeVersion?: number }` — add `storeVersion` to type instead of casting.

### REFACTOR: `src/routes/__root.tsx:149`

`useEffect` dependency array includes `saveExists` as object reference (never changes) instead of `saveExists.value`.

### REFACTOR: `src/workers/engine.worker.ts`

Year-boundary `winAndYouInQualified` cleanup duplicated in `advanceDayActions.ts:99-113`.

## Zustand selector audit

**No infinite re-render candidates found.** Codebase consistently uses `useGameWithShallow`/`useShallow` for objects/arrays and `EMPTY_*` constants for fallbacks. The few `?? {}` literals are inside `useGameWithShallow` (stabilized by `useShallow`).

## Pipeline phase verification

- `routeTree.gen.ts`: correctly gitignored (`.gitignore:52`), not tracked ✓
- All 55 phases registered in `index.ts:72-150` ✓
- `STAGE_RANGES` max = 202, matches highest phase `PHASE_ORDER_EVENT_TRIGGERS = 202` ✓
- Gap 165-190 has no phases — safe ✓
- **Recommendation:** add test asserting every phase order falls inside a `STAGE_RANGES` entry.

## Files: KEEP

198 files audited, 10 requiring action, 188 KEEP.
