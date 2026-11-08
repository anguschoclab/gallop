# Megaplan Code Ledger

Per-file review ledger. Verdicts: `clean` / `fixed:<id>` / `noted:<smell>` / `generated` / `data` / `asset`.
Findings with BUG IDs were fixed in Phase 4; SMELLs are documented only.

## src/shared — COMPLETE (see review-notes.md)

Verdict summary: `Brand<T,_B>=T` structural (documented; Anvil PRs are style-only); `fixed:BUG-1` dead `generateUUIDWithValidation` w/ CJS `require` deleted; uuidRegistry retained (self-tested infra).

## src/platform

| Area                                                                          | Status                                                                                                     |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| engine/{client,engine,protocol,transports,workerPool}.ts                      | clean (APPROVED — exemplary)                                                                               |
| game/store/{engineSync,engineClient,postCommit,stateVersion,persistedKeys}.ts | clean w/ notes                                                                                             |
| time/{checksum,executor,advancePlan,scheduler,pipeline,advance,calendar}.ts   | clean                                                                                                      |
| persistence/{npcCompression,storage/*}                                        | `fixed:BUG-2` npcCompression now persists/restores energy/fitness/fatigue/form/peakingIndex/recoveryPoints |
| time/phases/* (~25 reviewed)                                                  | `fixed:BUG-3` hallOfFame year off-by-one; `fixed` jockeyPhase `+90`→JOCKEY_CONTRACT_DAYS; smells noted     |

## src/domains — see review-notes.md rollup

| Port                                                           | Status                               |
| -------------------------------------------------------------- | ------------------------------------ |
| resolver handlers (Diplomacy/Inbox dict routing)               | ported (PR #568)                     |
| rankings branded-ID cast removal                               | ported (PR #563)                     |
| getDynamicProfile spread removal                               | ported (PR #557)                     |
| TransactionArchive topLot O(N)                                 | ported (PR #570)                     |
| AuctionHouseDesk sale confirmation                             | ported (PR #556)                     |
| PrivateTrialDialog DisabledTooltipWrapper                      | ported (PR #559)                     |
| aria-labels (AuctionSalePage, DebtBanner, TransactionLedger)   | ported (PRs #567, #572)              |
| narrative template expansions (context/lead-surge/atmosphere)  | ported (PRs #553, #560, #565)        |
| insight detectors (distance-change; tiered earnings-per-start) | ported+merged (PRs #551, #566, #569) |

## src/routes, src/tests, scripts/, configs — see review-notes.md rollup

| Area                                     | Status                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| routes/                                  | clean (generated routeTree gitignored)                                            |
| tests/ architecture + layering           | clean, zero violations                                                            |
| scripts/ (fingerprint, bench, typecheck) | clean                                                                             |
| .github/workflows/ci.yml                 | `fixed` e2e fixture generation step added; linux baselines committed (PR #566-CI) |
