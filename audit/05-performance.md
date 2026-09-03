# Audit 05 — Performance Hotspots

**Generated:** 2026-09-03
**Method:** Subagent scan for nested `.find()`/`.filter()`/`.some()`/`.includes()` inside `.map()`/`.forEach()`/`.reduce()` in non-test src.

## HIGH severity (unbounded + render/hot path)

### 1. `src/components/market/HorseOrderBook.tsx:25-26` (render path)

- **Pattern:** `yardLabel()` calls `npcStables.find(st => st.id === sellerId)` inside `book.asks.map()` and `book.bids.map()` (lines 79, 131)
- **Fix:** Pre-build `Map<string, Stable>` from `npcStables` with `useMemo`, use `.get()` in `yardLabel()`

### 2. `src/components/routes/SyndicatePage.tsx:277-287` (render path)

- **Pattern:** `syndicateTransactions.map(tx => ...)` calls `npcStables.find()` twice per transaction (buyer + seller)
- **Fix:** Pre-build `Map<string, Stable>` from `npcStables`, use `.get()` for both lookups

### 3. `src/routes/auction.index.tsx:110-117` (render path, useMemo)

- **Pattern:** `Object.values(horses).filter(...).map(h => findEligibleSale(h))` where `findEligibleSale` does `activeUpcoming.find(sale => isLotEligible(horse, sale.kind))`
- **Fix:** Pre-group `activeUpcoming` by `kind` into `Map<string, Sale[]>`, iterate only matching sales

### 4. `src/hooks/dashboard/useDashboardData.ts:72-95` (hook/render)

- **Pattern:** Triple-nested: `ownedHorses.forEach(horse => horse.raceHistory.filter(...).forEach(raceResult => race.entries.some(e => ...)))`
- **Fix:** Pre-index recent race entries by stableId into `Map<string, RaceEntry[]>` once, then iterate ownedHorses against the index

### 5. `src/hooks/stable/useNpcStableDetail.ts:70-90` (hook/render, useMemo)

- **Pattern:** Same triple-nested pattern as #4 for single stable detail
- **Fix:** Same — pre-index race entries by stableId

## MEDIUM severity (bounded or less frequent)

### 6. `src/components/market/ExchangePanel.tsx:227,279` (render path)

- **Pattern:** `myListings.map(a => books.find(b => b.horseId === a.horseId))` and `npcListings.slice(0,15).map(...)`
- **Fix:** Pre-build `Map<string, OrderBook>` from `books` keyed by `horseId`

### 7. `src/components/stable/StableCompareDrawer.tsx:37` (render path)

- **Pattern:** `ids.map(id => allStables.find(s => s.id === id))` — bounded to MAX_COMPARE=4
- **Fix:** Pre-build `Map<string, Stable>` (low priority — N≤4)

### 8. `src/routes/npc-stables.compare.tsx:95` (render path)

- **Pattern:** `compare.ids.map(id => majorStables.find(s => s.id === id))` — bounded to MAX_COMPARE=4
- **Fix:** Pre-build `Map<string, Stable>` (low priority — N≤4)

### 9. `src/routes/auction.index.tsx:75-77` (render path, useMemo)

- **Pattern:** `SALE_TRIGGERS.map(t => activeUpcoming.find(a => a.kind === t.kind))` — 8 triggers
- **Fix:** Pre-build `Map<string, Sale>` by kind (low priority — N=8)

### 10. `src/core/race/impacts/raceHistory.ts:91-95` (race result hot path)

- **Pattern:** `tcRaces.map(tcRace => horse.raceHistory.find(rh => ...))` — ~3 triple-crown legs
- **Fix:** Pre-build `Map<string, RaceHistoryEntry>` by raceId (low priority — N≈3)

### 11. `src/game/store/slices/scoutingSlice.ts:172-174` (store action, day advance)

- **Pattern:** `scoutingAssignments.map(a => candidates.filter(c => !already.has(c.row.id)))` — re-filters all candidates per assignment
- **Fix:** Compute the filtered candidate pool once before the `.map()`

## Also flagged (outer is .filter, not .map)

### `src/components/market/ExchangePanel.tsx:71-80` (render path, useMemo)

- **Pattern:** `horseList.filter(h => ... && !exchange.asks.some(a => a.horseId === h.id && a.sellerId === "player"))`
- **Fix:** Pre-build `Set<string>` of player ask horseIds, use `.has()` in filter

## Test-first plan

For each HIGH severity fix:

1. Run existing test for the component/hook (green baseline)
2. Write a perf test asserting the operation completes in <50ms for N=1000 horses/stables (will be slow/failing on O(N²) code)
3. Implement the Map/Set fix
4. Verify perf test passes + existing test still green

For MEDIUM severity: existing tests are sufficient (bounded N makes perf test unnecessary).
