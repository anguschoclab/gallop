# Audit 06 — Wiring & Disconnected Systems

**Generated:** 2026-09-03

## Store slices

**Verdict: ✅ ALL COMPOSED.** All 20+ slices are composed into the root store in `src/game/store/index.ts` via `createXxxSlice(set, get, enqueueIntent)` calls. The "NOT COMPOSED" flags from a filename-based grep were false alarms — slices are composed by function name (e.g. `createAuctionSlice`), not filename. Action-helper files (`advanceDayActions.ts`, `breedingActions.ts`, `breedingBatchActions.ts`, `raceEntryActions.ts`, `syndicateActions.ts`) are all imported by their parent slices (1-3 importers each).

## Routes

**Verdict: ⚠️ routeTree.gen.ts IS STALE.**

- **Route files:** 62 (excluding `__root.tsx`)
- **routeTree.gen.ts entries:** 57 (with truncated/stale paths like `auction.` instead of `auction.$saleId`, `financial` instead of `financial-report`, `hall` instead of `hall-of-fame`)

The routeTree.gen.ts was generated from an older set of routes and is out of date. **Fix:** Run `bun run build` to regenerate it (Phase B). The build process auto-discovers route files and regenerates the tree.

Routes present as files but with stale/missing routeTree entries:

- `auction.$saleId`, `awards.$category`, `calendar.$regionId`, `ceremony.$invitationId`
- `debug.cash-pressure-tuning`, `financial-report`, `foal-development.$horseId`
- `hall-of-fame`, `horse-gallery`, `jockey.$jockeyId`, `new-game`
- `npc-stables.*` (4 files), `race-browser`, `race.$raceId`
- `regional-comparison`, `sire-leaderboards`, `sire-watch.*` (3 files)
- `stable.$horseId`, `staff.$staffId`, `syndicate.$syndicateId`

**Action:** Regenerate routeTree via `bun run build` in Phase B. After regeneration, verify all 62 routes appear in the tree.

## Hooks/services

**Verdict: TBD — needs full import-graph analysis (same as dead-code sweep).** The dead-code subagent (Phase A2) will identify any hooks/services with no import path to a route or test.

## Summary

| Area | Status | Action |
| ------ | -------- | -------- |
| Store slices | ✅ All composed | None |
| Routes | ⚠️ Stale routeTree | Regenerate via `bun run build` (Phase B) |
| Hooks/services | TBD | Depends on Phase A2 dead-code results |
