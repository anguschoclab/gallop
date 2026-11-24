# PR Verdicts — Consolidation 2026-11-B (cycle 2)

Scope: 5 open PRs (#662–#666) + 29 closed-unmerged PRs (#633–#661) intent-recovery audit.

Between cycles the gpt-engineer pipeline committed most PR intents **directly to `main`**
(verified in-tree) and closed the PRs on 2026-11-10. Landed intents need no port; dropped
ones are the real recovery scope.

## Open PRs

| PR | Intent | Verdict | Notes |
| --- | --- | --- | --- |
| 662 | `auctionValuation.test.ts` (102 lines) | PORT → relocate to `src/tests/core/auction/` | Re-gen of dropped #644; file was placed inside `src/domains` — tests live in `src/tests` |
| 663 | `market.ts` phase — typed `Extract` filter replaces 3 `as` casts | PORT | Clean typeguard narrowing |
| 664 | Float64Array `recordTick` + shared `TEMP_FACTORS` buffer in stepRunner | PORT | Eliminates per-tick Record alloc; adds NaN-skip (hardening). No conflict with cycle-1 recordTick rewrite. Sync fill→consume = re-entrancy safe |
| 665 | EmptyState → `StaffTeamList` + regenerated linux baselines | PORT incl. PNGs | The 4 `*-chromium-linux.png` files were regenerated baselines, not junk — they fix 4/5 e2e CI failures on main (drifted since `1f64e171`) |
| 666 | DisabledTooltipWrapper → `PortraitRandomizeButton` + PersonProfileHero test | PORT | Replaces title attr with tooltip for denied state |

## Closed-unmerged #633–#661 — landed/dropped audit

| PR | Intent | State |
| --- | --- | --- |
| 633 | syndicateActions tests (core/breeding path) | LANDED as `tests/domains/breeding/simulation/syndicateActions.test.ts` |
| 634 | regen darwin visual baselines | N/A — snapshots only |
| 635 | indexed loops draftingAI/lateralMovement/raceSession | LANDED (0 `for..of` remain; `sortedField` buffer exists) |
| 636 | EmptyState RaceWinsTable | LANDED (3 refs, `domains/portfolio/ui`) |
| 637 | timeWindow analytics tests | LANDED |
| 638 | draftingAI+tacticalAI loop opt | LANDED (`len`-indexed loops present) |
| 639 | Early Fade insight + tests | LANDED (`detectEarlyFade` + test) |
| 640 | EmptyState AuctionHouseDesk | LANDED (4 refs — merged with cycle-1 tooltip port) |
| 641 | syndicateActions tests (domains path) | LANDED (same file as 633's landing) |
| 642 | G1 spotlight news enrichment | LANDED (commit `9fbf304b`) |
| 643 | EmptyState RaceFeed | LANDED (2 refs) |
| 644 | auctionValuation test | **DROPPED** → recovered via open #662 |
| 645 | real-horse insight enrichment | LANDED (`9fbf304b`) |
| 646 | noopener RealHorsesPanel | LANDED (+ `ReviewStepNoopener.test.tsx`) |
| 647 | defer profile allocation sim.ts | LANDED (`let profile` lazy pattern present) |
| 648 | chromosomes tests | LANDED |
| 649 | Iron Horse insight + tests | LANDED (`detectIronHorse` + test) |
| 650 | BaseHandler `T => void` constraint tighten | LANDED (verified in `BaseHandler.ts:19` — already `=> void`) |
| 651 | EmptyState StableRosterWidget | **REJECT** — diff was 100% stale carry (26 files, no widget); intent reimplemented fresh (EmptyState + House icon) |
| 652 | sim profile defer (dup) | LANDED |
| 653 | herald flavor news | LANDED (`9fbf304b`) |
| 654 | expertInsightTemplates expansion | LANDED (`9fbf304b`) |
| 655 | reverse-tabnabbing RealHorsesPanel | LANDED (noopener present) |
| 656 | early-speed insight | Detector+registry LANDED; **test file dropped → PORT to `src/tests/core/horse/`** |
| 657 | (dup of 651/652 file set) | LANDED |
| 658 | strategicCoordinator cast removal | LANDED (no `as unknown` remains) + tests exist |
| 659 | (dup herald set) | LANDED |
| 660 | weather-flavor newsGenerator | LANDED (34 weather refs) |
| 661 | horse stats tests | LANDED (`tests/domains/horse/simulation/stats.test.ts`) |

Recovery scope: 2 dropped intents (644→via 662, 656-test) + 1 intent-only reimplement (651) + 5 open PRs = 8 discrete changes. #650 verified already-landed during implementation.

## Orphaned branches (PRs closed, branches alive — delete in Phase 7)

`bolt-optimize-drafting-ai-*`, `groom-roster-empty-state-*`, `herald-flavor-news-variety-*`,
`probe/analytics-time-window-test-*`, `tipster/early-speed-insight-*` (6 incl. strays found).
