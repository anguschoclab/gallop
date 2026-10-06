# Consolidation Verdict V4 — Full-Repo Review & 59-PR Triage

**Target:** `anguschoclab/gallop`
**Base:** `main` @ `93e3cd45`
**Branch:** `consolidation/integration-v4` (16 commits, 89 files, +3,114/−283)
**Date:** 2026-10-07
**Auditor:** Devin (AI Assistant)
**Mandate:** Zero constraints regarding save files or backwards compatibility; strict test-first gate; merge-base authored-diff triage of every open PR; explicit approve/disprove on every finding and architectural choice.

---

## Executive Summary

An exhaustive re-read of the repository (A–K subsystem taxonomy + full post-V3 delta sweep of 135 changed files) was combined with per-PR merge-base authored-diff triage of **all 59 open PRs (#451–#509)**. Every hunk passed a payload-purity audit — approximately half the PRs carried a shared contaminated payload (`.jules/` artifacts, repeated lint/JSDoc sweeps, unrelated route changes, stale audit docs) that was excluded from integration.

The consolidation landed **31 PRs' worth of real content** (18 canonical + 6 union contributors + 7 extracted hunks) across 9 duplicate-heavy clusters, fixed **2 baseline breakages** found on clean main, confirmed and fixed **1 real gameplay bug** (award gender eligibility), and removed **all production `as never` casts**. All of it gated behind 134 new characterization tests plus extracted spec tests (Phase 3 strict test-first gate: 10 FAIL-EXPECTED spec tests flipped green post-implementation; 0 FAIL-INVALID).

**Remote lifecycle actions (push/merge/close/delete) are recorded in Phase 8 and were NOT taken at time of writing — no PR state on GitHub has been altered by this branch.**

### Final Verification Quality Gates

| Gate | Command | Status | Result |
| :--- | :--- | :--- | :--- |
| TypeScript | `bun run typecheck:errors` | **PASS** | 0 errors, 0 warnings |
| ESLint | `bun run lint` | **PASS** | 0 errors (baseline main: 99) |
| Unit & integration | `bun run test` | **PASS** | 867 files, 9,284 passed, 1 skipped, 0 failures (baseline: 9,198 pass / 2 fail) |
| Production build | `bun run build` | **PASS** | clean, ~2.2s bundle |
| Composite verify | `bash scripts/verify.sh` | **PASS** | typecheck + lint + layering + naming + immutability + full suite — "all gates green" |
| Perf spot-check | microbench, `buildFieldContext` | **PASS** | 0.20µs → 0.07µs/call (~3x), outputs byte-identical |

---

## PR Verdicts — Summary (full ledger: `audit/pr-verdicts-v4.md`)

| Verdict | Count | PRs |
| :--- | :--- | :--- |
| **APPROVE** (canonical/clean) | 18 | #452, #454, #455, #462, #463, #467, #469, #472, #474, #482, #489, #490, #493, #494, #499, #500, #501, #505 |
| **APPROVE-UNION** (Herald content merge) | 6 | #460, #466, #471, #478, #492, #506 |
| **APPROVE-EXTRACT** (hunks from contaminated PRs) | 7 | #456, #457, #475, #476, #485, #498, #503 |
| **DISAPPROVE** — equivalent duplicate | 15 | #451, #453, #458, #461, #470, #479, #481, #484, #486, #487, #488, #491, #496, #502, #504 |
| **DISAPPROVE** — contaminated/superseded | 9 | #459, #464, #468, #477, #480, #483, #497, #507, #508 |
| **DISAPPROVE** — empty/mislabeled payload | 3 | #465, #495, #509 |
| **DISAPPROVE** — regression | 1 | #473 (removed `aria-label` from StableCompareBar clear button — accessibility regression; superseded by #500 which preserves it) |

**Total: 59/59 PRs adjudicated.**

### Cluster outcomes

| Cluster | Winner / disposition | Integration commit(s) |
| :--- | :--- | :--- |
| Bolt `buildFieldContext` (13 PRs) | **#463** single-pass loop — all 13 variants semantically identical; #463 chosen on diff cleanliness. ~3x faster, output-verified. | `4c729c5a` (w/ characterization tests in `fa6e0086`) |
| Bolt Beyer history scans | **#474** — scalar accumulation replaces filter/map allocations in `detectPatternJump` + bounce logic. | `13bceb8b` |
| Mason `ImpactHandlerFunction` (12 PRs) | **#472** — shared type in `handlers/types.ts`; all 5 clean variants byte-identical in handlers, #472 has the correct doc comment. `HorseHandler` keeps its distinct local signature (extra horse arg). | `640cf8b8` |
| Herald narrative content (10 PRs) | **Union merge** — `directiveNewsGenerator` +194 unique template lines across all 4 pools; plus #498 grudge headlines, #454 flavor stories, #501 naming patterns (improved interpolation-asserting test). | `453b6b94` |
| Palette a11y/tooltips (5 PRs) | **#455 + #500** — nav-button `aria-label`s + icon-button tooltips. #473 **rejected**: deleted `aria-label` and weakened the test to `button:last-child` selector. | `89294dd0` |
| Groom destructive dialogs (2 PRs) | **#505 + #456** — `buttonVariants({variant:"destructive"})` on gelding/retire-to-stud confirmations; `DisabledTooltipWrapper`. | `3d882929` |
| Probe tests (11 PRs) | All clean test files landed in Phase 3 gate; #509 was an empty payload (zero award tests despite the name). | `29b78141`, `fa6e0086` |
| Tipster insights (2 PRs) | **#489 + #476** — `detectJockeyChemistry` (19th registered detector), optional `jockeyId` on `HorseInsight`, `{jockeyName}` interpolation; `Perfect Partnership` jockey insight. | `3206a406` |
| Anvil typing (2 PRs) | **#493 + #499** — strict `buildCampaignIntent` discriminated-union inference (caught a real test bug: `targetRaceKey` vs `raceKey`); typed auction impact replacing an `as never`. | `57e134cb` |
| Jules | #473 rejected (see above); no `.jules/` artifacts landed. | — |

---

## Bug & Finding Resolutions (full register: `audit/bug-register.md`)

| ID | Severity | Finding | Verdict |
| :--- | :--- | :--- | :--- |
| BUG-V4-001 | HIGH | Clean main had 99 lint errors (prettier, 4 layering violations, 9 JSDoc) | **FIXED** — `9b057905` |
| BUG-V4-002 | HIGH | `src/data/importedRealWorld.ts` violated data-immutability invariant (mutable state, `localStorage`, `new Date`) | **FIXED** — moved to `services/storage/importedRealWorldService.ts`, test-first via `importedRealWorld.test.ts` characterization |
| BUG-V4-003 | LOW | 3 valid kebab-case routes missing from naming baseline | **FIXED** — baseline regenerated |
| FINDING-V4-004 | LOW | 7 production `as never` structural casts | **FIXED** — all removed via honest boundary types (`51b99952`); test-file fixture casts remain by convention |
| BUG-V4-007 | MEDIUM | Gender-restricted award categories (`potrillo/potranca_del_ano`, `champion_sprint_male/female`) ignored gender — fillies could win colt awards | **FIXED** — `7b95e789`, test-first (2 FAIL-EXPECTED assertions → green) |
| V3 spot-checks | — | `runDailyAutoEntry` re-entry guard, BUG-011 prestige multiplier, `detectEarningsMilestone` registration | **CONFIRMED SOUND** — no regressions |

### Architectural choices explicitly approved

- **Single-pass imperative loop** over chained `filter`/`reduce`/spread in hot path — verified non-mutating of caller input (sorts locally-built arrays).
- **Shared `ImpactHandlerFunction`** centralization — correct seam; `HorseHandler` deliberately excluded (distinct signature).
- **Herald union merge** over picking one branch — additive template pools are complementary, not competing.
- **`buildCampaignIntent` strict typing** — infers concrete intent from `AnyIntent["type"]`; caught a masked test bug.
- **`asOwnerKey` via `commonFacade`** in `NpcStableTradingTab` — respects layering (no direct `@/core` branded-type import in components).
- **Accessibility-over-brevity** — every integrated icon button keeps a real `aria-label`; disabled controls get `DisabledTooltipWrapper` + reason.

### Architectural choices explicitly disproved

- **#473's test-weakening approach** (DOM-position selector, dropped aria-label) — rejected as an accessibility regression.
- **Filename-level diff filtering alone** — disproved during validation: Mason #508 and Probe #503 carried unrelated production files; hunk-level purity audit was required and used.
- **Test-file `as never` removal** — reviewed and rejected; fixture casts are the established convention.

---

## Test-First Compliance

Phase 3 landed **all** validating tests before any production hunk:

- **14 files / 134 characterization tests** — PASS against pre-change code (behavior pinned).
- **10 spec assertions across 3 files** — FAIL-EXPECTED for exactly the right reasons (missing `detectJockeyChemistry`, 18-vs-19 detector registry count, missing `Perfect Partnership`); all flipped green at integration.
- **0 FAIL-INVALID** — no test was defective against current behavior.
- **2 bug-fix assertions** — FAIL-EXPECTED → green (BUG-V4-007).

Net suite delta vs baseline main: **+86 tests** (9,198 → 9,284), −2 failures, lint 99 → 0 errors.

## Remaining Risks / Notes

- `routeTree.gen.ts` is regenerated locally for build/typecheck; it is gitignored and intentionally untracked.
- Herald union content is additive-only; template-pool statistical balance across themes was not separately tuned.
- `HorseHandler`'s local handler type is a deliberate divergence from `ImpactHandlerFunction`, not an oversight.
- Remote cleanup (Phase 8) pending explicit confirmation: push branch → merge to `main` → close 28 losing PRs with verdict comments → delete 59 remote branches.
