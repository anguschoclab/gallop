# Audit 03 — Duplicates & Divergent Logic

**Generated:** 2026-09-03
**Method:** (1) `grep` for duplicate export names across all non-test src. (2) Cross-reference orphans with known canonical files. (3) Manual review of files noted in prior audit.

## Summary

- **Duplicate export names across all non-test src:** **0** — no two files export the same function/const/class name.
- **Confirmed duplicate file:** 1 (`src/core/analytics/regionalConstants.ts` is a stale duplicate of `src/constants/regionalConstants.ts`)
- **Duplicate component basenames:** **0** — prior audit's `BidInput`/`MaxBidInput` already consolidated.

## Confirmed duplicate

### `src/core/analytics/regionalConstants.ts` vs `src/constants/regionalConstants.ts`

| File | Status | Importers |
| ------ | -------- | ----------- |
| `src/constants/regionalConstants.ts` | **Canonical** — actively imported by `regionalTrends.ts`, `EntityDetailPanel.tsx`, `RegionDrilldownDrawer.tsx`, `regionalMetrics.ts`, + tests | 6+ |
| `src/core/analytics/regionalConstants.ts` | **Stale duplicate** — zero importers | 0 |

**Action:** Delete `src/core/analytics/regionalConstants.ts`. The canonical version at `src/constants/regionalConstants.ts` is the one all code imports.

## No other duplicates found

- No duplicate function/const/class export names across the entire codebase
- No duplicate component basenames
- No duplicate bidding components (prior audit's concern already resolved)

## Prior audit items — status

| Prior audit claim | Status |
| ------------------- | -------- |
| `BidInput.tsx` AND `sub/BidInputPanel.tsx` duplicate | ❌ RESOLVED — only `sub/BidInputPanel.tsx` exists |
| `MaxBidInput.tsx` AND `sub/MaxBidPanel.tsx` duplicate | ❌ RESOLVED — only `sub/MaxBidPanel.tsx` exists |
| `breedingImpacts.ts` dedup target for mason branch | Needs verification — check if both files still exist |
