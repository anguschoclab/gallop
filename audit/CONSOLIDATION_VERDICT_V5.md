# CONSOLIDATION VERDICT V5

**Date:** 2026-10-15 · **Auditor:** Devin · **Branch:** `consolidation/integration-v5` · **Commits:** 35 over `main@438fc7a9`

Companion ledgers: `pr-verdicts-v5.md` (41 open PRs), `pr-verdicts-v5-closed.md` (313 closed-unmerged), `consolidation-baseline-v5.md`, subsystem deltas in `audit/subsystems/*.md`, `bug-register.md` V5 section.

## Scope

41 open PRs (#510–#550; #549 + #550 appeared mid-run), 313 closed-unmerged PRs re-audited, ~389k LOC re-read across the A–K subsystem taxonomy. Zero backwards-compat/save constraints per mandate. **Full `bun run test` suite intentionally not run this session** (user constraint — targeted suites only; full suite remains for ad hoc run).

## Baseline repair (Phase 0) — commit `59bbfa8c`

- `NotificationSettingsCard` imported core type directly → created `services/settings/settingsFacade.ts` re-export (layering rule held).
- 5 prettier violations formatted.
- `naming-violations.baseline.json` regenerated: + `routes/rankings-history.tsx` kebab entry — **correct as baseline** (kebab routes are the established convention; 15+ siblings).
- Gates post-repair: typecheck 0, lint clean, arch green, build clean.

## Test-first evidence (Phase 4)

All production content landed **after** its tests were committed and classified:

- Test-first commit `Phase 4` batch: 5 new characterization files (58 tests, all PASS) + unions into `dailyProgress`/`insightRegistry`/`insights`/`rivalryNewsGenerator.variety`/`SaveTab`.
- Classification: **6 FAIL-EXPECTED** (registry×2, Undefeated, SireValue×3) — flipped green when `detectUndefeated`/`detectSireValue` landed (`f96c5e48`). **0 FAIL-INVALID**, **0 weakened assertions**.
- Mason spec `handlerCanHandle.test.ts` (4 tests) committed before the `Object.hasOwn` refactor (`de7652e9`).
- BUG-V5-001 (dead cast) had existing `dailySnapshotPhase` characterization coverage — refactor validated by test + typecheck.

## Integration manifest (Phase 5) — hybrid merge/extract

**Real merges (11):** #510 (imperative loops), #515 (flavor stories +40), #527 (seedNewsSlots +94 — verified real module, not facade), #530 (region-lost templates), #512 (tooltip providers), #525 (aria labels — scrubber duplicate dedup'd post-merge, BUG-V5-003), #533 (LedgerEntry tooltip delay), #534 (EligibleHorseRow a11y), #521 (9 dead casts), #523 (isWinningG1 type guard), #520 (canonical sim-loop: refill + Int32Array + idToIndex).

**Hunk extractions (7):** #519 (TOOLTIP_DELAY_MS; bun.lockb stripped), #540 (leadGroupVelocitiesBuffer only — rankMap hunk superseded by #520's ranks array), #545 (LedgerEntryProps + ComponentType typing; route rename REJECTED — kebab is the baselined convention, would change URL + diverge from siblings; 13 strays stripped incl. `request.md`), #513 + #524 (Tipster union → 21 detectors), #541 + #546 (Herald union: 9 conflict blocks resolved as deduplicated string unions, 6 in rivalryGrudgeMatch + 3 in rivalryNewsGenerator).

**Implemented directly:** Mason `Object.hasOwn(IMPACT_HANDLERS, type)` across 8 handlers — #538's semantics modernized; subsumes #516/#517/#522/#526/#529/#532/#537/#538/#539/#543/#550.

**Disapproved (15):** #516/#522/#532/#539/#543/#550 (`in`-operator prototype hazard), #517/#528/#535 (inferior duplicates), #529/#548/#549 (divergent/contaminated), #537/#544 (contaminated equivalents). See `pr-verdicts-v5.md` for per-PR rationale.

## Closed-PR re-audit (Phase 3)

313 closed-unmerged → 193 covered by V3/V4 ledgers (verdicts stand), 120 re-audited: 5 individually verified (#7, #12, #116, #120, #130 — all superseded or already-fixed), 115 SUPERSEDED on sampling evidence (6/8 perf PRs target files that no longer exist; all 5 sampled test subjects have live coverage). Detail in `pr-verdicts-v5-closed.md`.

## Bugs found & fixed this round

| ID | Finding | Disposition |
|---|---|---|
| BUG-V5-001 | `(state as {rankingsHistory?…})` dead cast missed by #521 | FIXED `8f772bd0` |
| BUG-V5-002 | `rankings-history` kebab route "violation" | DISPROVED — baselined convention |
| BUG-V5-003 | Duplicate aria-label post-#525 merge | FIXED `8f772bd0` |
| FINDING-V5-001 | canHandle/IMPACT_HANDLERS drift hazard | FIXED `de7652e9` (Object.hasOwn) |
| FINDING-V5-002 | keep-and-resort sortedField tie-order divergence | CONFIRMED → divergent hunks rejected |
| FINDING-V5-003 | bruceLowe stale `Math.random` doc | FIXED |
| (V4 residue) | bunfig `[test]`, HorseHandler CTA, orphanAudit regex | VERIFIED FIXED (all green) |

## Architectural choices — verdicts

- **Resolver dispatch:** `Object.hasOwn` over `in` / `hasOwnProperty.call` — APPROVED (ES2022, own-property safe, deduped).
- **Sim loop:** refill-family (#520) over keep-and-resort — APPROVED (stable-sort tie-order preserved); divergence in #529/#549/#540-sim-hunk explicitly disproved.
- **Insight registry order:** Undefeated@0, SireValue@end → 21 detectors — APPROVED (priority semantics pinned by registry test).
- **Route naming:** keep kebab-case `rankings-history.tsx` + baseline entry — APPROVED as convention; camelCase rename disproved.
- **Narrative targets:** unions land in `core/narrative/*`; `services/narrative/seedNewsSlots.ts` verified as real module — mixed-dir caveat recorded.
- **Components → core layering:** facade re-export pattern (`settingsFacade`) — APPROVED, consistent with layering rule.

## Final gate results

| Gate | Result |
|---|---|
| `bun run typecheck:errors` | **0 errors, 0 warnings** |
| `bun run lint` | **clean** |
| Architecture tests (layering/naming/immutability/any-regression/noMathRandom) | **23/23 green** |
| Targeted suites (horse, resolver, phases, services, components, performance, race) | **2,039+ green** across 174 files |
| `bun run build` | **clean** (routeTree regenerated, not committed) |
| `bun run test` (full suite) | **NOT RUN — deferred per user constraint** |

## Remote lifecycle

Tracked in Phase-8 execution log: push `consolidation/integration-v5` → merge to `main` → per-PR verdict comments → close 41 PRs → delete merged/superseded remote branches. See PR comments for per-PR dispositions.
