# Per-PR Verdicts (16 Open PRs)

All PRs authored by `anguschoclab` via Jules bots. Zero human reviews on any PR (only the Jules greeting bot comment). Verdicts based on full diff analysis, file-overlap detection, and codebase audit findings.

---

## PR #397 — probe/resolve-auction-bidding-test (+74/−7, MERGEABLE)

**Title:** 🧪 Probe: [resolveAuctionSale bidding war logic]

**Changes:**

- `src/tests/core/auction/auctionResolution.bidding.test.ts` (new, 61 lines) — bidding war coverage
- `src/tests/core/history/almanacInsights.test.ts` (1 line removed)
- `src/components/DefaultErrorComponent.tsx` — **BEST** of 5 versions: `import type { ErrorComponentProps }`, `error instanceof Error ? error.message : String(error)`
- `.github/workflows/ci.yml` — **REJECT**: pins `bun-version: 1.1.27` (downgrades from 1.3.14 per AGENTS.md)
- `bun.lockb` — **REJECT**: 437KB→425KB binary rewrite (unrelated to tests)
- `.jules/probe.md` — **STRIP**

**Verdict: PARTIAL APPROVE**

- TAKE: `auctionResolution.bidding.test.ts`, `almanacInsights.test.ts`, `DefaultErrorComponent.tsx` (canonical winner)
- REJECT: `ci.yml` (bun downgrade), `bun.lockb` (unrelated rewrite)
- STRIP: `.jules/probe.md`
- **Rationale:** The bidding war tests are valuable. The DefaultErrorComponent fix is the cleanest of 5 competing versions. But the CI downgrade is a silent sabotage — pinning bun to 1.1.27 when AGENTS.md specifies 1.3.14 would break the build environment.

---

## PR #396 — probe-foaling-resolution (+208/−3, MERGEABLE)

**Title:** 🧪 Probe: Foaling resolution

**Changes:**

- `src/tests/core/horse/foaling.test.ts` (new, 202 lines) — deterministic foaling tests
- `src/components/DefaultErrorComponent.tsx` — uses `(error as Error).message` cast (inferior to #397)
- `.jules/probe.md` — **STRIP**

**Verdict: PARTIAL APPROVE**

- TAKE: `foaling.test.ts` (valuable coverage of deep RNG branching paths)
- DROP: `DefaultErrorComponent.tsx` hunk (inferior to #397's version)
- STRIP: `.jules/probe.md`
- **Rationale:** Foaling tests are high-value (core game logic with deep RNG). The DefaultErrorComponent fix uses a raw `as Error` cast which is less safe than #397's `instanceof` guard.

---

## PR #395 — bolt-optimize-blocking (+26/−13, CONFLICTING)

**Title:** ⚡ Bolt: optimize applyBlockingEffect hot loop

**Changes:**

- `src/core/race/engine/jockeyEffects.ts` — replaces `Array.find()` with for-loop + early break (valid optimization)
- `src/components/DefaultErrorComponent.tsx` — uses non-type import of `ErrorComponentProps` (inferior to #397)
- `tsc-results.txt` — **STRIP** (build artifact)
- `.jules/bolt.md` — **STRIP**

**Verdict: PARTIAL APPROVE**

- TAKE: `jockeyEffects.ts` (valid hot-loop optimization)
- DROP: `DefaultErrorComponent.tsx` hunk (inferior)
- STRIP: `tsc-results.txt`, `.jules/bolt.md`
- **Rationale:** The for-loop with early break is a legitimate optimization for the race engine hot path. CONFLICTING status due to DefaultErrorComponent overlap — resolve by taking #397's version.

---

## PR #394 — palette/tooltip-aria-label (+26/−9, MERGEABLE)

**Title:** 🎨 Palette: Replace native title with custom Tooltip and aria-label for LiveAnnualTimeline remove button

**Changes:**

- `src/components/strategy/LiveAnnualTimeline.tsx` — native `title` → `Tooltip` + `aria-label`
- `.jules/palette.md` — **STRIP**

**Verdict: APPROVE**

- TAKE: `LiveAnnualTimeline.tsx`
- STRIP: `.jules/palette.md`
- **Rationale:** Clean a11y improvement, follows the established Palette pattern.

---

## PR #393 — anvil-fix-insurance-intents-any (+40/−13, MERGEABLE)

**Title:** 🔨 Anvil: Removed explicit any casts in insuranceIntents

**Changes:**

- `src/core/npc/intents/insuranceIntents.ts` — removes 4 `as any` casts (the only `as any` in all of `src/core/`)
- `src/tests/core/npc/intents/insuranceIntents.test.ts` — updated tests
- `src/components/DefaultErrorComponent.tsx` — uses `instanceof Error` only, no `String(error)` fallback (inferior to #397)
- `.jules/anvil.md` — **STRIP**

**Verdict: PARTIAL APPROVE**

- TAKE: `insuranceIntents.ts` + test (removes the only `as any` in production core code)
- DROP: `DefaultErrorComponent.tsx` hunk (inferior)
- STRIP: `.jules/anvil.md`
- **Rationale:** High-value type safety fix. The 4 `as any` casts access non-existent horse properties (`currentGrade`, `racing.speed`), indicating the type definition is incomplete or the code is wrong.

---

## PR #392 — palette-tooltip-ux (+0/−0, MERGEABLE)

**Title:** 🎨 Palette: Replace native title with custom Tooltip for Remove Slot action

**Changes:** NONE (0 additions, 0 deletions, 0 changed files)

**Verdict: DISAPPROVE — CLOSE**

- **Rationale:** Empty PR. Superseded by #394 which covers the same LiveAnnualTimeline remove button. Close without merge.

---

## PR #391 — bolt-runner-conditions-opt (+33/−10, MERGEABLE)

**Title:** ⚡ Bolt: Optimize runner condition derivation hot loops

**Changes:**

- `src/core/race/runnerConditionDerivation.ts` — early-break loops in `nearestRival` and `isBlocked`
- `.jules/bolt.md` — **STRIP**

**Verdict: APPROVE**

- TAKE: `runnerConditionDerivation.ts`
- STRIP: `.jules/bolt.md`
- **Rationale:** Valid O(N²) → O(N) optimization in the race simulation hot path. The array is sorted by position, so early termination on distance thresholds is correct.

---

## PR #390 — herald-flavor-enrichment (+53/−0, MERGEABLE)

**Title:** 📯 Herald: Expanded track and jockey flavor stories

**Changes:**

- `src/services/narrative/flavorStories.ts` — 50 lines of additive flavor stories
- `.jules/herald.md` — **STRIP**

**Verdict: APPROVE**

- TAKE: `flavorStories.ts`
- STRIP: `.jules/herald.md`
- **Rationale:** Pure additive content, no risk. Expands narrative variety.

---

## PR #389 — probe/npc-auction-consignment-tests (+153/−0, MERGEABLE)

**Title:** 🧪 Probe: NPC auction consignment strategy logic

**Changes:**

- `src/tests/core/auction/auctionConsignment.test.ts` (new, 153 lines) — uses branded types (`asNpcStableId`, `asHorseId`, `makeNpcOwned`, `createTestNpcHorse`)
- `.jules/probe.md` — **STRIP**

**Verdict: APPROVE**

- TAKE: `auctionConsignment.test.ts` (SUPERIOR to #383's version — branded types, more thorough, 153 vs 45 lines)
- STRIP: `.jules/probe.md`
- **Rationale:** This is the canonical version of the consignment test file. Uses the codebase's branded-type system correctly. Supersedes #383's raw-string version.

---

## PR #388 — palette-replays-a11y (+17/−6, CONFLICTING)

**Title:** 🎨 Palette: Add accessibility attributes to replay filters

**Changes:**

- `src/components/replays/ReplaysLibrary.tsx` — aria-label, aria-pressed, type="button" (GOOD)
- `src/core/inbox/inboxTypes.ts` — (review needed)
- `src/core/market/priceAlerts.ts` — adds `(ask as any).horseName` — **REGRESSION** (introduces `as any`)
- `src/components/DefaultErrorComponent.tsx` — uses `as Error` alias (inferior to #397)
- `tsc-results.txt` — **STRIP**
- `.jules/palette.md` — **STRIP**

**Verdict: PARTIAL APPROVE**

- TAKE: `ReplaysLibrary.tsx`, `inboxTypes.ts` (a11y improvements)
- REJECT: `priceAlerts.ts` hunk (introduces `as any` regression — opposite of codebase direction)
- DROP: `DefaultErrorComponent.tsx` hunk (inferior)
- STRIP: `tsc-results.txt`, `.jules/palette.md`
- **Rationale:** The a11y improvements are good, but the `priceAlerts.ts` change introduces an `as any` cast that violates the codebase's type-safety direction (the Anvil PRs exist specifically to remove `as any`). CONFLICTING — resolve manually.

---

## PR #387 — bolt-optimize-conditions (+19/−8, CONFLICTING)

**Title:** ⚡ Bolt: Optimize condition derivation loops

**Changes:**

- `src/core/market/priceAlerts.ts` — cosmetic only: collapses multi-line union to single line + adds `@param` JSDoc. NO actual loop optimization.

**Verdict: DISAPPROVE — CLOSE (pending verification)**

- **Rationale:** The PR title claims "optimize condition derivation loops" but the diff is purely cosmetic (formatting + JSDoc). No performance improvement. The reformatted union is less readable. Identical content to #386's priceAlerts hunk. CONFLICTING. **Verify during execution — if confirmed cosmetic-only, close.**

---

## PR #386 — probe-test-expenses (+150/−22, CONFLICTING)

**Title:** 🧪 Probe: Core financial expense logic and utilities

**Changes:**

- `src/tests/core/expenses/expenseTypes.test.ts` (new, 99 lines) — covers `createExpense`, `groupExpensesByCategory`, `filterExpensesByDayRange`, `calculateCategoryTotal`
- `src/core/market/priceAlerts.ts` — same cosmetic reformat as #387 (union collapse + JSDoc)
- Other files: `BiddingHistoryTable.tsx`, `NpcStableTradingTab.tsx`, `biddingHistory.ts` (review needed)
- `.jules/probe.md` — **STRIP**

**Verdict: PARTIAL APPROVE**

- TAKE: `expenseTypes.test.ts` (valuable coverage of untested financial logic)
- DROP/KEEP: `priceAlerts.ts` hunk — keep multi-line union, optionally keep JSDoc
- Review other file changes during execution
- STRIP: `.jules/probe.md`
- **Rationale:** The expense tests fill a critical gap (financial module had no tests). The priceAlerts reformat is cosmetic noise. CONFLICTING — resolve manually.

---

## PR #385 — groom-retire-horse-alert-dialog (+37/−12, MERGEABLE)

**Title:** ✨ Groom: Replace native confirm dialog with AlertDialog for retiring horses

**Changes:**

- `src/components/routes/HorseDetail.tsx` — native `confirm()` → `AlertDialog`

**Verdict: APPROVE**

- TAKE: `HorseDetail.tsx`
- **Rationale:** Clean UX improvement. Uses Radix AlertDialog for proper focus management and screen reader support. Note: `HorseManagementSection.tsx:33` has another `confirm()` not covered by this PR — fix in Phase 4.

---

## PR #384 — herald-commentary-expansion (+27/−0, MERGEABLE)

**Title:** 📯 Herald: Expanded race commentary START/FINISH templates

**Changes:**

- `src/assets/narrative/templates.ts` — +14 START, +10 FINISH templates
- `.jules/herald.md` — **STRIP**

**Verdict: APPROVE**

- TAKE: `templates.ts`
- STRIP: `.jules/herald.md`
- **Rationale:** Pure additive content for high-frequency race events. Reduces commentary repetition.

---

## PR #383 — probe-auction-consignment-tests (+76/−0, MERGEABLE)

**Title:** 🧪 Probe: auction consignment policy coverage

**Changes:**

- `src/tests/core/auction/auctionConsignment.test.ts` (new, 45 lines) — raw strings, no branded types
- `src/tests/core/auction/auctionResolution.test.ts` (new, 28 lines) — resolution tests
- `.jules/probe.md` — **STRIP**

**Verdict: PARTIAL APPROVE**

- TAKE: `auctionResolution.test.ts` (resolution coverage)
- DROP: `auctionConsignment.test.ts` (INFERIOR to #389 — raw strings, 45 vs 153 lines, no branded types)
- STRIP: `.jules/probe.md`
- **Rationale:** The resolution tests are valuable. The consignment test file is superseded by #389's superior version.

---

## PR #382 — anvil-fix-hqopswidget-type (+12/−2, MERGEABLE)

**Title:** 🔨 Anvil: Remove any cast in HQOpsWidget and fix revealed type error

**Changes:**

- `src/components/dashboard/HQOpsWidget.tsx` — removes `[string, any]` cast, maps `Facility.level` to rank (fixes bug: code accessed `f?.rank` which doesn't exist on `Facility`, always fell back to `1`)
- `.jules/anvil.md` — **STRIP**

**Verdict: APPROVE**

- TAKE: `HQOpsWidget.tsx` (real bug fix — `f?.rank` was always undefined → fallback to `1`)
- STRIP: `.jules/anvil.md`
- **Rationale:** High-value fix. The `any` cast was hiding a real bug where `Facility.rank` doesn't exist (only `Facility.level` does), causing all facilities to display rank `1`.

---

## Summary Table

| PR   | Verdict    | Take                                                              | Drop/Reject                                    | Strip               |
| ---- | ---------- | ----------------------------------------------------------------- | ---------------------------------------------- | ------------------- |
| #397 | PARTIAL    | bidding tests, DefaultErrorComponent (canonical), almanacInsights | ci.yml, bun.lockb                              | .jules              |
| #396 | PARTIAL    | foaling.test.ts                                                   | DefaultErrorComponent                          | .jules              |
| #395 | PARTIAL    | jockeyEffects.ts                                                  | DefaultErrorComponent                          | tsc-results, .jules |
| #394 | APPROVE    | LiveAnnualTimeline.tsx                                            | —                                              | .jules              |
| #393 | PARTIAL    | insuranceIntents.ts + test                                        | DefaultErrorComponent                          | .jules              |
| #392 | DISAPPROVE | —                                                                 | (empty PR)                                     | —                   |
| #391 | APPROVE    | runnerConditionDerivation.ts                                      | —                                              | .jules              |
| #390 | APPROVE    | flavorStories.ts                                                  | —                                              | .jules              |
| #389 | APPROVE    | auctionConsignment.test.ts (canonical)                            | —                                              | .jules              |
| #388 | PARTIAL    | ReplaysLibrary.tsx, inboxTypes.ts                                 | priceAlerts.ts (as any), DefaultErrorComponent | tsc-results, .jules |
| #387 | DISAPPROVE | —                                                                 | (cosmetic only, mislabeled)                    | —                   |
| #386 | PARTIAL    | expenseTypes.test.ts                                              | priceAlerts.ts (cosmetic)                      | .jules              |
| #385 | APPROVE    | HorseDetail.tsx                                                   | —                                              | —                   |
| #384 | APPROVE    | templates.ts                                                      | —                                              | .jules              |
| #383 | PARTIAL    | auctionResolution.test.ts                                         | auctionConsignment.test.ts (inferior)          | .jules              |
| #382 | APPROVE    | HQOpsWidget.tsx                                                   | —                                              | .jules              |
