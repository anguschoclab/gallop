# PR Verdicts — Consolidation 2026-11 Wave 2

Scope: 29 open PRs (#633–#661), swept 2026-11-10. Same rules as wave 1:
stale-carry never merged, `.jules*`/`bun.lockb`/linux-snapshot/doc-copies
always stripped, payload extracted by hunk not by merge.

All ports landed directly on `main` in seven atomic commits:

| Commit | Contents |
| --- | --- |
| `522d0113` | Insight detectors: Early Speed, Early Fade, Iron Horse (RED-first) |
| `8a181aab` | Coverage tests: syndicateActions (merged), timeWindow, chromosomes, auctionValuation, stats |
| `9fbf304b` | Narrative templates: G1 spotlight, follow-up, weather flavor, expert insights |
| `e6111c35` | EmptyState standardization: RaceFeed, RaceWinsTable, AuctionHouseDesk |
| `06984183` | Perf: deferred getDynamicProfile + indexed hot loops (checksum-identical) |
| `521b41ea` | BaseHandler tighten, pregnancies cast removal, noopener + prettier |
| `ef5804ca` | Darwin visual baselines |

## Verdicts

| PR | Intent | Verdict | Notes |
| --- | --- | --- | --- |
| 633 | `syndicateActions` tests | PORTED | Merged with 641; extra buyout-price cases kept |
| 634 | darwin visual baselines | PORTED | 3 PNG refreshes post-UI changes |
| 635 | indexed loops + linux snapshots | PORTED(partial) | Code landed; snapshots dropped |
| 636 | `RaceWinsTable` EmptyState | PORTED | Both empty branches |
| 637 | `timeWindow` tests | PORTED | |
| 638 | hot-loop opts draftingAI/tacticalAI | PORTED(partial) | tacticalAI only; draftingAI overlap went to 635's simpler form; snapshots dropped |
| 639 | `detectEarlyFade` + tests + bun.lockb | PORTED | lockb dropped |
| 640 | `AuctionHouseDesk` EmptyStates | PORTED | All three lists |
| 641 | `syndicateActions` tests | PORTED | Merged with 633 |
| 642 | G1 spotlight templates | PORTED | +20 headlines, +20 bodies |
| 643 | `RaceFeed` EmptyState | PORTED | |
| 644 | auction valuation tests (co-located) | PORTED | Re-homed to `src/tests/domains/auction/simulation/` |
| 645 | follow-up spotlight + stale carry | PORTED(partial) | Payload hunk extracted; rest was stale base |
| 646 | noopener + prettier | PORTED | Identical to 655 |
| 647 | defer `getDynamicProfile` | PORTED | Cleanest of the 4-PR bolt cluster |
| 648 | chromosomes tests | PORTED | |
| 649 | `detectIronHorse` + tests | PORTED | |
| 650 | `BaseHandler` generic → void | PORTED | Matches `ImpactHandlerFunction` |
| 651 | StableRosterWidget EmptyState | REJECTED | Payload absent from diff; 103k lines stale churn |
| 652 | defer-profile variant | REJECTED | Superseded by 647 (non-null assertions, inlined Math.min) |
| 653 | flavor news | REJECTED | No narrative payload; stale test churn only |
| 654 | expert-insight templates | PORTED | 5 categories |
| 655 | noopener | REJECTED | Exact duplicate of 646 |
| 656 | `detectEarlySpeed` + co-located test | PORTED | Test re-homed to `src/tests/domains/horse/simulation/` |
| 657 | defer-profile variant | REJECTED | Superseded by 647; 103k-line stale diff |
| 658 | pregnancies cast removal | PORTED | `GameState.pregnancies` is typed; test casts cleaned |
| 659 | defer-profile variant | REJECTED | Superseded by 647; stale churn + bun.lockb |
| 660 | weather/track/distance flavor | PORTED | |
| 661 | horse stats tests | PORTED | Expectations verified against impl |

## Clusters

| Cluster | PRs | Winner |
| --- | --- | --- |
| defer `getDynamicProfile` (bolt) | 647, 652, 657, 659 | 647 — cleanest formulation, no `!` assertions |
| syndicateActions tests | 633, 641 | merged — 641's file + 633's buyout cases |
| noopener (sentinel) | 646, 655 | 646 (655 identical) |
| EmptyState batch | 636, 640, 643 | all three ported (non-overlapping files) |

## Notes

- `palette/vet-report-empty-state-*` remote branch deleted as stray (no open
  PR counterpart in this wave).
- Five PRs (645, 651, 653, 657, 659) share a stale merge-base carrying ~25
  files of pre-fame-fix state plus megaplan doc copies — the same
  stale-carry pattern documented in wave 1.
- Verification: typecheck 0/0, eslint clean, build green, 1,743 targeted
  tests green, `stateFingerprint 30 small` identical before/after the
  perf commit (`4b2161ca`). Full suite deferred ad hoc.
