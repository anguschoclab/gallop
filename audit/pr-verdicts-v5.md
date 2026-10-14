# Per-PR Verdicts V5 — 40 Open PRs (#510–#549)

**Date:** 2026-10-15 · **Auditor:** Devin · **Base:** `main` @ `438fc7a9` (+ baseline repair `59bbfa8c`)
**Branch:** `consolidation/integration-v5`
**Method:** authored-diff extraction via `git diff $(merge-base origin/main branch) branch`. Branch merge-bases vary (`ddb1a665`, `0ae57541`, `caddf6bf`, `677d12d5`, `a8a48b2b`). GitHub file-lists and 3-dot diffs are inflated — true authored deltas are 1–25 files.

## Shared stray payload (this round)

- **`rankings-history.tsx` / `rankingsHistory.tsx` + `rankingsHistory.test.ts` + `naming-violations.baseline.json`** — prettier fixes + baseline regen for a route that exists on main; branches based on `0ae57541` carry the **pre-rename** `rankingsHistory.tsx` (re-adds the old filename). Superseded by baseline-repair `59bbfa8c`. Seen in #536, #537, #538, #542, #544, #545, #546, #548.
- **Stale audit docs** (`CONSOLIDATION_VERDICT*`, `audit/*.md`) — #511, #537, #545, #548.
- **`bun.lockb`** rewrites — #518, #519, #524, #545, #548.
- **`.jules/*` artifacts** — #526, #543, #547, #549.
- **`request.md`** — #545.

## Cluster verdicts

### Bolt — simulation-loop allocations (8 PRs)

Target: `runRaceToCompletion` in `src/core/race/engine/simulation.ts` — per-tick `[...runners].sort()` + `new Map()` allocations. Two semantic families:

- **Refill family (semantics-exact):** refill `sortedField` from `runners` each tick before sort — preserves stable-sort tie-order (original `runners` order) identical to the original fresh-copy. #517, #520, #537, #544.
- **Keep-and-resort family (SEMANTIC DIVERGENCE):** sort the pre-allocated array without refilling — tie-break order becomes prior-tick order instead of `runners` order. `#529`, `#540`, `#549` sim hunks. `Array.prototype.sort` is stable (ES2019), so this is a real behavioral delta whenever two runners share `position`.

| PR | Content | Verdict |
|---|---|---|
| #520 | refill + `Int32Array` ranks + `idToIndex` map, `!== undefined` guard | **APPROVE — canonical** (semantics-exact, no `!` assertions, smallest clean diff) |
| #517 | refill + `Int32Array` + `runnerIndices`, `!` assertions | DISAPPROVE — equivalent duplicate, weaker on assertions |
| #537 | refill + Map reuse | DISAPPROVE — contaminated (10 audit docs, SidebarNav, pre-rename route); hunk equivalent but Map-only (no Int32Array) |
| #544 | refill + Int32Array + extra per-runner map lookup | DISAPPROVE — contaminated (prettier strays duplicating baseline repair); extra `horseIndexMap.get()` in stepRunner loop vs #520's `ranks[i]` |
| #529 | keep-and-resort + `rankMap.clear()` | DISAPPROVE — **tie-order semantic divergence** |
| #540 | keep-and-resort + Map reuse + **`paceContext.leadGroupVelocitiesBuffer` hoist** | **APPROVE-EXTRACT** — land only the `computePaceContext` buffer param + call-site; drop its divergent sortedField hunk (superseded by #520) |
| #549 | keep-and-resort + Int32Array + `.jules` + NotificationSettingsCard inline-type hack | DISAPPROVE — divergence + contaminated; its "inline type to avoid layering violation" hunk creates a drifting duplicate interface, inferior to baseline `settingsFacade` fix |
| #510 | `buildFieldContext` forEach→for loops (runnerConditionDerivation.ts) | **APPROVE** — clean, semantics preserved (post-sort loops identical), removes closure allocs |

### Mason — `canHandle` dict-key dedup (7 PRs)

Target: 8 dict-based handlers (`IMPACT_HANDLERS` `Record<string, ImpactHandlerFunction>`) where `canHandle` re-listed all keys as a string array — drift hazard (two lists can desync). Diplomacy/Inbox handlers correctly excluded: they use direct `type ===` (1–2 types, no dict). Two variants:

- `type in IMPACT_HANDLERS` — #516/#522/#532/#539 byte-identical; #526/#543 same + `.jules`. **Prototype-chain hazard:** `"toString" in dict` → true via `Object.prototype`.
- `Object.prototype.hasOwnProperty.call(IMPACT_HANDLERS, type)` — #538 (carries stray trio). **Semantically exact** (own-property only).

**Integration decision:** land `Object.hasOwn(IMPACT_HANDLERS, type)` — ES2022 (tsconfig target/lib confirmed) — the modern equivalent of #538's semantics.

| PR | Verdict |
|---|---|
| #538 | **APPROVE-EXTRACT** — canonical semantics; strip stray trio |
| #516, #522, #532, #539 | DISAPPROVE — identical `in`-operator duplicates (prototype hazard) |
| #526, #543 | DISAPPROVE — same `in` payload + `.jules/mason.md` stray |

### Herald — narrative content (5 PRs)

| PR | Target | Verdict |
|---|---|---|
| #515 | `core/narrative/flavorStories.ts` +40 (community ×4, industry ×4) | **APPROVE** — clean, correct `core/` path |
| #527 | `services/narrative/seedNewsSlots.ts` +94 (legit impl file — services/narrative is a mixed dir, not all facades) | **APPROVE** — clean |
| #530 | `core/narrative/rivalryNewsGenerator.ts` region-lost templates + variety-test bound 24→30 | **APPROVE** — clean |
| #541 | `rivalryGrudgeMatch.ts` + `rivalryNewsGenerator.ts` (+111: grudge/escalation arcStage templates) | **APPROVE-UNION** |
| #546 | same two files, different alternative strings + stray trio | **APPROVE-UNION-EXTRACT** — union-merge template strings into #541's additions; strip strays |

### Palette — tooltips/aria (5 PRs)

| PR | Verdict |
|---|---|
| #519 | **APPROVE** — `TooltipProvider delayDuration={TOOLTIP_DELAY_MS}` in NewGameWizard (TOOLTIP_DELAY_MS=300 verified in `constants/uiConstants.ts`); strip `bun.lockb` |
| #548 | DISAPPROVE — NewGameWizard hunk byte-identical to #519's result; 17 strays |
| #512 | **APPROVE** — TooltipProvider+delay wraps in StepIdentity + NpcCareerTrackerPanel (career-timeline toggle keeps aria-label/expanded/controls) |
| #525 | **APPROVE** — aria-labels on PlanSummaryBar plan-name input + RaceVisualizer scrubber |
| #533 | **APPROVE** — LedgerEntry delete-button TooltipProvider+delay |

### Groom (1 PR)

| #534 | **APPROVE** — `title=`→`Hint` (V3 house pattern) + `DisabledTooltipWrapper reason={false}` guard on withdraw button; signature verified (`reason?: string \| false`) |

### Anvil — typing (4 PRs)

| PR | Verdict |
|---|---|
| #521 | **APPROVE** — drops `(state as {npcAIManager?...})` / `horseDailyProgress` assertions across 8 phase files; both fields verified present on the state type (`systemsState.ts:69,77`) — dead casts |
| #523 | **APPROVE** — `isWinningG1`→type guard; removes `r.grade as` + `horse as Horse` casts in `connectionTrophies.ts`; predicate exactly matches removed casts |
| #545 | **APPROVE-EXTRACT** — exports `LedgerEntryProps` from LedgerEntry.tsx, single source for SaveTab/LoadTab props (superior to #535's inline re-declaration which can drift); strip 13 strays incl `request.md` |
| #535 | DISAPPROVE — equivalent-but-inferior: inlines a duplicated anonymous prop type; #545's exported-interface approach prevents drift |

### Tipster — insight detectors (2 PRs)

| PR | Verdict |
|---|---|
| #513 | **APPROVE** — `detectSireValue` (3 tiers; fields verified: `stud.atStud/lifetimeFoals/lifetimeStakesFoals/standingFee` in `core/horse/types.ts:77-84`); registry →20; +4 spec tests |
| #524 | **APPROVE** — `detectUndefeated` prepended at registry index 0 (intentional: Perfection > Red Hot for all-wins careers); registry →20; +2 spec tests + 1 existing test fixture fix; strip `bun.lockb` |
| **Union** | INSIGHT_DETECTORS → **21** (Undefeated@0 … SireValue@end); `insightRegistry.test.ts` union: length 21 + both names |

### Probe — test files (7 PRs)

| PR | File | Verdict |
|---|---|---|
| #514 | `proceduralNaming.test.ts` (new) | **APPROVE** — clean; signature verified (`generateProceduralJockeyName(region, rng, usedNames?)`, `proceduralNaming.ts:325`) |
| #531 | `dailyProgress.test.ts` (new, 118 lines, `createTestHorse`/`createTestNpcHorse`/`createTestColt` helpers — all verified) | **APPROVE-UNION** |
| #547 | `dailyProgress.test.ts` (new, 102 lines, different cases + `.jules` stray) | **APPROVE-UNION-EXTRACT** — union-merge distinct cases |
| #518 | `auctionActions.test.ts` (new, 26 cases, shared mock fixtures) | **APPROVE** — canonical over #528; strip `bun.lockb` |
| #528 | `auctionActions.test.ts` (new, 25 cases, thinner `{} as X` fixtures) | DISAPPROVE — equivalent duplicate, thinner fixtures |
| #536 | `resolution.test.ts` (new, `computePayoutSplits`/`sanitizeAndRankResults`/`detectPhotoFinish`) | **APPROVE-EXTRACT** — strip stray trio |
| #511 | `trackGeometryModifiers.test.ts` (new, ~17 cases) | **APPROVE-EXTRACT** — 22 stray files (audit docs, prettier sweep); land test only |
| #542 | `trackGeometryModifiers.test.ts` (new, 3 cases) + strays | **APPROVE-EXTRACT** — union any unique cases into #511's file |

## Summary

| Verdict | Count | PRs |
|---|---|---|
| APPROVE (canonical/clean) | 16 | #510, #512, #513, #514, #515, #518, #519, #520, #521, #523, #524, #525, #527, #530, #533, #534 |
| APPROVE-UNION / UNION-EXTRACT | 10 | #511, #531, #536, #538, #540, #541, #542, #545, #546, #547 |
| DISAPPROVE — equivalent duplicate | 9 | #516, #517, #522, #526, #528, #532, #535, #539, #543 |
| DISAPPROVE — semantic divergence / contaminated / inferior | 5 | #529, #537, #544, #548, #549 |

Full tally: 40/40 adjudicated (16 approve + 10 union/extract + 14 disapprove).
