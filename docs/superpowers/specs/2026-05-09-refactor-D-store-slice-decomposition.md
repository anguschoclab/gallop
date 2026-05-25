# Refactor D — Store Slice Decomposition

**Date:** 2026-05-09
**Order:** 4 of 5 (do after A, B, C — A3 must be done first to move formatCurrency out of components)
**Risk:** Medium-High — large files, many importers, Redux slice boundaries change
**Scope:** Break three overloaded store slices into focused domain slices, and eliminate a 70-line duplicated `set({})` block.

---

## Why this fourth

After A (utilities consolidated), B (data extracted), and C (god files split), the store slices are the last major source of mixed responsibility. Touching the store is highest risk because every component and route is a consumer. Doing it after A–C means the slices being split are already smaller (A3 moved `formatCurrency` out; A6 moved ownership guards out).

---

## D1 — `coreSlice.ts`: eliminate duplicated `set({})` block

### Problem

`src/game/store/slices/coreSlice.ts` has two near-identical 38-line `set({...finalState...})` blocks:

- **Lines 224–262**: Worker success path — `set({ horses: result.state.horses, ... })` spreading 28 keys.
- **Lines 330–368**: Synchronous fallback path — identical 28 keys spread from `updatedContext.state`.

Any new persisted state field must be added in both places. They have already begun to drift (log construction logic is subtly different between the two paths). This is not a slice boundary issue — it is a pure refactor within the existing file.

### Fix

Extract a helper function (not exported — internal to the file):

```ts
function applyDayResult(
  set: (partial: Partial<StoreType>) => void,
  finalState: GameState,
  newLogs: LogEntry[],
): void {
  set({
    horses: finalState.horses,
    races: finalState.races,
    pregnancies: finalState.pregnancies,
    // ... all 28 keys ...
    log: [...newLogs, ...get().log].slice(0, 50),
    pendingIntents: [],
  });
}
```

Both the worker path and synchronous fallback call `applyDayResult(set, finalState, logs)`. The two branches differ only in how they obtain `finalState` (from `result.state` vs `updatedContext.state`) — the `set` call is identical.

### Acceptance criteria

- The `set({` pattern inside `advanceDay` appears exactly **once** (inside `applyDayResult`).
- `wc -l src/game/store/slices/coreSlice.ts` decreases by approximately 35–40 lines.
- All day-advancement tests pass.
- Worker and synchronous paths produce identical state after advancing a day (add a test if one doesn't exist).

---

## D2 — `marketSlice.ts`: split four trading systems

### Problem

`src/game/store/slices/marketSlice.ts` is 459 lines containing four independent trading systems:

| Lines   | System                           | Description                                       |
| ------- | -------------------------------- | ------------------------------------------------- |
| 83–99   | Open market purchase             | Buy horse directly from the NPC market listing    |
| 102–142 | Scouting                         | Hire a scout to evaluate a horse                  |
| 144–232 | Auction consignment + resolution | Consign to sale, resolve hammer prices            |
| 285–436 | Private sale + claiming          | Propose sale, respond, file claiming race entries |

These four systems have no shared state or logic. They happen to all involve "buying or selling horses" but the mechanics are completely independent.

### Fix

Split into four slices:

**`src/game/store/slices/marketSlice.ts`** (keep, trimmed)

- Retains only: open market `buyFromMarket`, `refreshMarketListings`, market state
- ≤100 lines

**`src/game/store/slices/scoutingSlice.ts`** (new)

- `scoutHorse`, `dismissScoutReport`, scout report state
- Imports `ScoutReport` type, scouting cost constants

**`src/game/store/slices/auctionSlice.ts`** (new)

- `consignToAuction`, `withdrawConsignment`, `resolveAuction`
- Auction state (`auctionLots`, `activeSaleId`, etc.)

**`src/game/store/slices/privateSaleSlice.ts`** (new)

- `proposeSale`, `acceptSale`, `declineSale`, `fileClaim`, `withdrawClaim`
- Private sale state, claiming race entries

### Store type assembly

Add the new slices to the `StoreType` intersection in `src/game/store/index.ts`. Each slice's state and actions merge cleanly because they manage distinct state keys.

### Shared types

Any types currently defined inline in `marketSlice.ts` (e.g., `MarketSlice`, `AuctionSlice`) should be extracted to their corresponding state files in `src/game/state/` if they don't already exist.

### Acceptance criteria

- `wc -l src/game/store/slices/marketSlice.ts` ≤ 100 (open market only).
- Each new slice file ≤ 150 lines.
- All market, scouting, auction, and claiming UI flows work end-to-end in the browser.
- No TypeScript errors.

---

## D3 — `systemsSlice.ts`: split four domain areas

### Problem

`src/game/store/slices/systemsSlice.ts` (~400+ lines) mixes four independent domains:

| Domain                 | Actions                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Jockey management      | `hireJockey`, `fireJockey`, `assignJockey`, `rerollJockeySkill`                              |
| Facility management    | `upgradeFacility`, `downgradeFacility`                                                       |
| Horse management       | `retireToStud`, `setStudFee`, `updateStudFee`, `geldHorse`, `renameHorse`, `retireToPasture` |
| Campaign/settings/misc | `setCampaign`, `setSettings`, `updateBreedingProgram`, leaderboard setters, `enqueueIntent`  |

The `enqueueIntent` function is shared infrastructure that should live on `CoreSlice`, not `SystemsSlice`.

### Fix

Split into four slices:

**`src/game/store/slices/jockeySlice.ts`** (new)

- `hireJockey`, `fireJockey`, `assignJockey`, `rerollJockeySkill`, `setJockeySilk`
- Jockey state from `jockeyState.ts`

**`src/game/store/slices/facilitySlice.ts`** (new)

- `upgradeFacility`, `downgradeFacility`
- Facility state from `facilityState.ts`
- The facility cost formula `5000 * 1.5^(level-1)` must be extracted to `src/core/facilities/index.ts` as a named function (it is currently inlined)

**`src/game/store/slices/horseManagementSlice.ts`** (new)

- `retireToStud`, `setStudFee`, `updateStudFee`, `geldHorse`, `renameHorse`, `retireToPasture`
- No new top-level state keys — these actions mutate the existing `horses` array (adding/removing `stud` field on individual horse records)

**`systemsSlice.ts`** (keep, greatly trimmed)

- Campaign/settings/leaderboard/misc setters only
- `enqueueIntent` moved to `coreSlice.ts`
- ≤100 lines

### `enqueueIntent` migration

`enqueueIntent` is currently defined in `systemsSlice.ts` but is fundamentally core game infrastructure — it feeds the intent pipeline that `advanceDay` processes. Move it to `coreSlice.ts`. Update all files that call `get().enqueueIntent` or `useGame(s => s.enqueueIntent)`.

### Acceptance criteria

- `wc -l src/game/store/slices/systemsSlice.ts` ≤ 100.
- `grep -n "enqueueIntent" src/game/store/slices/systemsSlice.ts` returns zero results.
- Each new slice file ≤ 150 lines.
- All jockey, facility, horse management, and campaign UI flows work end-to-end.
- No TypeScript errors.

---

## D4 — Facility cost formula extracted from slice

### Problem (sub-item of D3)

`systemsSlice.ts` inlines the facility upgrade cost formula `5000 * 1.5^(level-1)` without exporting it. Any component that needs to **display** the cost of an upgrade must either duplicate this formula or not show it.

### Fix

Add to `src/core/facilities/index.ts` (or create if not present):

```ts
export function facilityUpgradeCost(currentLevel: FacilityLevel): number;
export function facilityMaxLevel(): FacilityLevel;
```

Use in `facilitySlice.ts` and in any UI component that needs to display upgrade costs.

### Acceptance criteria

- `grep -rn "5000.*1.5\|1.5.*5000" src` returns zero results outside of `src/core/facilities/`.

---

## Implementation notes

- **D1 first** — it is low risk, contained within one file, and reduces coreSlice complexity before D3 moves `enqueueIntent` there.
- **D2 and D3 in parallel** — they touch different files and have no dependency on each other. Two engineers can work simultaneously.
- **D4 as part of D3** — do it in the same PR as `facilitySlice.ts` creation.
- The store `index.ts` assembly will need updating after each split. The intersection type `StoreType` must include all slice types.
- Write integration tests (or extend existing ones) to verify the browser end-to-end flows for at least one action from each new slice.
- Use `grep -rn "from.*slices/marketSlice\|from.*slices/systemsSlice"` before starting to find all files that import from the slices being split — those imports will need updating.
