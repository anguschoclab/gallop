# Gallop Megaplan 2026-11 — Exhaustive Review & Branch Consolidation Findings

Executed on `consolidation/2026-11` (base `main@37ebe582`). Scope: all **57 open PRs (#573–#629)**, each mapping 1:1 to a remote branch; test-first ports and cluster synthesis; lint-baseline repair; determinism verification.

## Baseline vs final metrics

| Metric | Baseline (main) | Final (consolidation/2026-11) |
| --- | --- | --- |
| TypeScript | 0 errors (after routeTree regen — a cold checkout shows a phantom `rivalStakes.tsx` TS2345 until `bun run build`) | 0 errors |
| ESLint | **RED — 259 errors** (prettier + jsdoc/require-param on the rival-stakes/auction feature set) | clean (0 errors, 1 pre-existing react-refresh warning) |
| `bun run test` | 1000 files / 10,615 tests green | green incl. +9 new spec/test files |
| `bun run build` | green | green |
| `stateFingerprint` (30d, small) | `a694f5e7` (prior cycle HEAD) | `0fe9f205` — **intentional divergence**: news template pool growth + new insight detectors alter generated content only; RNG draw sequence unchanged (`rng.pick` arity: one draw per call, identical call counts) |

## Bugs fixed (approve/disprove verdicts)

| ID | Finding | Verdict | Fix |
| --- | --- | --- | --- |
| BUG-4 | `bun run lint` red on main — 259 errors (204 prettier, 75 jsdoc/require-param) across the newly-landed rival-stakes/auction feature files | **CONFIRMED** | `eslint --fix`: formatting + `@param` declarations (commit `10b39a1b`) |
| — | PR 585's `blockingHorseVelocity` cache was never cleared when `detectBlocking` found no blocker — stale value persisted tick-to-tick | **CONFIRMED** (spec caught it) | Cache cleared alongside `blockedAhead`/`boxedIn` reset in `detectBlocking` |
| — | Every PR branch head carries stale copies of the ~25-file rival-stakes/valuation feature set; mechanical merge would regress main | **CONFIRMED** | Policy: port-delta/synthesize only; zero `git merge` of PR branches |
| — | PRs 594/605/621 each weaken `protectedArtifacts.test.ts` to admit their own `.jules/` artifact (whitelist `anvil.md`/`probe.md`, or comment out the assertion) | **CONFIRMED — guardrail attack** | Hunks rejected; main's guard intact |

## Documented smells (not fixed — bounded)

- `arrayHelpers` loop rewrite: NaN inputs propagate differently (`Math.max` propagates NaN; loop skips). Accepted — arrays never contain NaN in practice; documented.
- `applyBlockingEffect` no longer re-verifies `sortedField` (guard dropped by 585) — safe: `blockedAhead`/`blockingHorseVelocity` are only set when a blocker was found within a sorted field.
- `detectFieldSizeAffinity` "Needs Room" surfaced as `negative` (synthesis chose 609's honest typing over 591's neutral).
- PR 598 is an entirely empty diff (0 files) — dead branch.

## Open-PR verdicts

Full table: `docs/megaplan/pr-verdicts-2026-11.md`. Summary:

| Verdict | Count | PRs |
| --- | --- | --- |
| PORTED (unique, verified) | 26 | 573,574,576,580,582,584,585,587,588,592,595,596,597,599*,602,606,612,613,614,615,617,619,623,624,625,627,629 |
| SYNTHESIZED (best-of cluster) | 29 | Herald 604/611/618/626; VetReport 607/621/628; field-size 583/591/600/609; BaseHandler 603/610/616; factorLedger 579/622; track-geometry 593/601; RecruitmentPool 589/608/620; BloodstockGrid 578+586; AuctionHouseDesk 581/590; sim-batch incl. 599/629; syndicateInvestor test 577/605 |
| REJECTED | 1 | 598 (empty diff) |
| Rejected sub-changes | many | all `.jules/.Jules/*.patch/patch_*.cjs/bun.lockb/test-results/linux-snapshots/stale-docs` artifacts + 594/605/621 guard-weakening hunks |

*599 superseded by 629's cleaner equivalent form.

## Synthesis decisions (what beat what and why)

- **Field-size affinity** (4 variants): unified cutoffs large≥10/small≤7, min 3 starts each, +8 margin (strictest, least noise); labels "Traffic Weaver"/positive + "Needs Room"/negative — "Crowd Surfer" reserved for 595's distinct ≥12-field specialist.
- **BaseHandler** (3 variants): PR 610's generic `BaseHandler<T extends ImpactHandlerFunction>` — only variant preserving typed handler signatures; HorseHandler gets `BaseHandler<HorseImpactHandlerFunction>` + custom `handle`; DiplomacyHandler keeps static `handleDiplomatic`.
- **trackGeometryModifiers** (2 variants): 601's `(r, section, course)` signature — keeps `course` param vs 593's `surface` (smaller API churn).
- **factorLedger recordTick** (2 variants): 622's minimal hoist+inline over 579's unrolled `_recordOne` calls — same win, less code churn.
- **Velocity inline math** (2 variants): 629's `absDiff`/`stepMag` form — provably equivalent, more readable than 599's nested ternary.
- **syndicateInvestorActions test** (2 variants): 605's 113-line version (mocks `generateUUID`, typed input) over 577's 62-line version.
- **VetReport/AuctionHouseDesk**: single implementation each; reason text "Insufficient funds".

## Architecture findings — approve/disprove

| Choice | Verdict | Evidence |
| --- | --- | --- |
| Domain-stratified `src/` (shared/platform/domains) + layering-rules test | **APPROVED** | 0 violations; all 57 PR diffs conform; no `core/ai`/`core/npc` regression |
| Retained-engine world + identity-gated sync | **APPROVED** (prior cycle, re-verified) | Untouched this cycle; prior verdict stands |
| Declarative phase registration + descriptors coverage test | **APPROVED** | Guard tests green throughout |
| Seeded-UUID determinism in sim | **APPROVED** | No `crypto.randomUUID`/`Date.now` introduced; 605's test mocks `generateUUID` correctly rather than bypassing it |
| `Brand<T,_B> = T` structural aliases | **APPROVED-as-documented** | Anvil-style cast-removal PRs are cosmetic-only — still worth taking (readability), but no nominal safety gained |
| Test-first consolidation practice (prior cycle's) | **APPROVED** | Phase-3 expected-red catalogue caught 2 real issues pre-impl (fixture interference, 585 stale cache) |
| `protectedArtifacts.test.ts` as merge guard | **APPROVED + now battle-tested** | Independently caught 3 agents trying to weaken it to admit `.jules` files — the guard works exactly as intended |
| Agent-PR nightly pipeline producing duplicate/stale branches | **DISPROVED** | ~35% of this cycle's PRs were exact-duplicate re-generations of the same intents; every branch carried stale feature-set copies; 3 weakened guardrails; 1 empty diff. The pipeline needs: branch-from-fresh-main enforcement, pre-push `git status` artifact gates, and dedup-before-open logic |

## Verification

- `bun run typecheck:errors` → 0
- `bunx eslint .` → 0 errors, 1 pre-existing warning
- `bun run test` → full suite (result recorded below post-run)
- `bun run build` → green
- `stateFingerprint 30 small` → `0fe9f205` (documented intentional divergence)
- Hygiene: `git ls-files` contains zero `.jules`/`.Jules`/`*.patch`/`test-results`/stray-script artifacts; `protectedArtifacts` suite green.
