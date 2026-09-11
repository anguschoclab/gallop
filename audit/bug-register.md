# Consolidated Bug Register

All bugs discovered during the Phase 1 file-by-file audit. Prioritized by severity. Each entry: id, file:line, severity, description, fix sketch, source (which audit subsystem).

---

## CRITICAL (crashes, wrong results, data corruption)

### BUG-001: `schedulerPhase.ts:156` — Unsafe `campaign.flags` spread

- **Severity:** CRITICAL (3 test failures, runtime crash)
- **File:** `src/core/time/phases/schedulerPhase.ts:156`
- **Description:** `[...campaign.flags]` throws `TypeError` when `flags` is not iterable. Tests pass `flags: {}` (object) but type is `CampaignFlag[]`.
- **Fix:** `[...(campaign.flags ?? [])]` in production; change `flags: {}` to `flags: []` in tests.
- **Source:** K (failing tests), B (time/pipeline)

### BUG-002: `schedulerPhase.ts:113-117` — Missing player-ownership guard

- **Severity:** CRITICAL (wrong game behavior)
- **File:** `src/core/time/phases/schedulerPhase.ts:113-117`
- **Description:** Second loop only checks `!horse`, not `horse.ownership?.type !== "player"`. Can auto-enter NPC/unowned horses and assign `makePlayerOwned()` to them.
- **Fix:** Add `if (!horse || horse.ownership?.type !== "player") continue;` after line 117.
- **Source:** B (time/pipeline)

### BUG-003: `HorseHandler.ts:204-221` — CTA always attached to injury messages

- **Severity:** HIGH (2 test failures, wrong UX)
- **File:** `src/core/resolver/handlers/HorseHandler.ts:204-221`
- **Description:** `cta` and `secondaryCta` always set for all injury severities. Tests expect `undefined` for minor/moderate.
- **Fix:** Make conditional: `if (severity === "major" || severity === "career-ending")`.
- **Source:** B (time/pipeline), K (failing tests)

### BUG-004: `HQOpsWidget.tsx:70` — Accesses non-existent `Facility.rank`

- **Severity:** HIGH (wrong UI for all facilities)
- **File:** `src/components/dashboard/HQOpsWidget.tsx:70`
- **Description:** `f?.rank ?? 1` — `Facility` has no `rank` field (only `level`). Every facility renders "LVL 1".
- **Fix:** Use `f?.level` instead. **PR #382 fixes this.**
- **Source:** H (UI components)

### BUG-005: `useSaveSlots.ts:54-70` — Loading state never reset on success

- **Severity:** HIGH (UI stuck in loading)
- **File:** `src/hooks/shared/useSaveSlots.ts:54-70`
- **Description:** `handleLoad` sets `isLoading(true)` but only calls `setIsLoading(false)` in `catch`. Successful load leaves loading spinner forever.
- **Fix:** Add `finally { setIsLoading(false); }` or add `setIsLoading(false)` after successful load.
- **Source:** I (routes/hooks/game)

### BUG-006: `foaling.ts:158-172` — Inbreeding stat modifiers wiped by resolvePhenotype

- **Severity:** HIGH (wrong game balance — inbreeding penalties don't apply)
- **File:** `src/core/horse/foaling.ts:158-172, 178`
- **Description:** Modifiers applied to `foal.stats.consistency` etc. are overwritten by `resolvePhenotype(foal)` which recomputes `stats` from scratch.
- **Fix:** Call `resolvePhenotype` before applying modifiers, or reapply after.
- **Source:** C (horse/breeding)

### BUG-007: `commentaryGenerator.ts:159-171, 211-219` — Double-substitution wipes precision

- **Severity:** HIGH (wrong display — track record times lose decimals)
- **File:** `src/services/narrative/commentaryGenerator.ts:159-171, 211-219`
- **Description:** `{recordTime}` etc. substituted twice. First pass uses `toFixed(1)`, second pass uses `toString()`, wiping the decimal.
- **Fix:** Remove the second substitution pass (l.211-219) or merge into single pass.
- **Source:** G (narrative)

### BUG-008: `auctionResolution.ts:75` — Player winning bids silently passed

- **Severity:** HIGH (wrong auction results)
- **File:** `src/core/auction/auctionResolution.ts:75`
- **Description:** `currentWinner === undefined` condition passes lots where player has hammer price but no NPC raise. Player wins are dropped.
- **Fix:** Check `lot.hammerPrice` and `lot.soldToStableId` before passing.
- **Source:** D (auction/market)

### BUG-009: `auctionValuation.ts:45-55` — Double-discount for racing_age lots

- **Severity:** MEDIUM (wrong auction valuations)
- **File:** `src/core/auction/auctionValuation.ts:45-55`
- **Description:** `developerValuation` applies `1.0 - AUCTION_RACING_AGE_DISCOUNT` twice for racing_age lots.
- **Fix:** Remove the second discount application.
- **Source:** D (auction/market)

### BUG-010: `auctionValuation.ts:65-69` — specialistValuation ignores horse

- **Severity:** MEDIUM (wrong auction valuations)
- **File:** `src/core/auction/auctionValuation.ts:65-69`
- **Description:** `specialistValuation` never looks at the horse — only checks stable's preferred distance vs 1600. Should compare horse's `distanceAptitude`.
- **Fix:** Pass horse data and compare to stable's preferred distance.
- **Source:** D (auction/market)

### BUG-011: `engine.ts:137-183` — AI branch ignores `house` prestige multiplier

- **Severity:** MEDIUM (wrong NPC bid ceilings at prestige houses)
- **File:** `src/core/auction/engine.ts:137-183`
- **Description:** `calculateNpcBid` AI-driven branch never uses `house` parameter. Only non-AI fallback (l.187) applies `housePrestigeMultiplier`. AI-managed bidders don't get prestige-adjusted ceilings.
- **Fix:** Apply prestige multiplier in AI branch too.
- **Source:** D (auction/market)

### BUG-012: `engine.ts:198-207` — Aggressive bid can exceed maxBid after rounding

- **Severity:** MEDIUM (NPC overbids)
- **File:** `src/core/auction/engine.ts:198-207`
- **Description:** `Math.ceil(aggressiveBid / 100) * 100` not rechecked against `maxBid` — can exceed ceiling.
- **Fix:** Clamp after rounding: `Math.min(rounded, maxBid)`.
- **Source:** D (auction/market)

### BUG-013: `exchangeAI.ts:367-374` — Ignores listing-time acceptFloor

- **Severity:** MEDIUM (inconsistent NPC trade behavior)
- **File:** `src/core/market/exchangeAI.ts:367-374`
- **Description:** `resolveNpcExchangeTrades` recalculates `sellerStance` floor, ignoring `ask.acceptFloor` computed at listing time. Listing and settlement floors can diverge.
- **Fix:** Use `ask.acceptFloor` from the listing, or document why it's recalculated.
- **Source:** D (auction/market)

### BUG-014: `auctionRunnerImpacts.ts:172` — Inconsistent player consignment check

- **Severity:** MEDIUM (missing player messages)
- **File:** `src/core/auction/auctionRunnerImpacts.ts:172`
- **Description:** Uses `lot.consignorStableId === ""` but `isPlayerConsignment` at l.23 uses `!lot.consignorStableId`. If player = `undefined`, passed-lot message never generated.
- **Fix:** Use `!lot.consignorStableId` consistently.
- **Source:** D (auction/market)

### BUG-015: `auctionRunnerImpacts.ts:161-166` — horse_transfer uses undefined for player

- **Severity:** MEDIUM (wrong transfer impacts)
- **File:** `src/core/auction/auctionRunnerImpacts.ts:161-166`
- **Description:** Uses raw `consignorStableId`/`winnerStableId` — when player (undefined), impact has `fromStableId`/`toStableId: undefined` instead of `"player"`.
- **Fix:** Use `asOwnerKey("player")` consistently.
- **Source:** D (auction/market)

### BUG-016: `priceAlerts.ts:337` — horseName always falls back to horseId

- **Severity:** MEDIUM (wrong display — shows ID not name)
- **File:** `src/core/market/priceAlerts.ts:337`
- **Description:** `(ask as { horseName?: string }).horseName ?? ask.horseId` — `ExchangeAsk` has no `horseName` field, so always falls back to ID.
- **Fix:** Pass `Map<string, Horse>` and look up `horse.name`, or add `horseName` to `ExchangeAsk`.
- **Source:** D (auction/market)

### BUG-017: `dateFormatting.ts:58-65, 76-84` — Off-by-one in month/day calculation

- **Severity:** MEDIUM (wrong date display)
- **File:** `src/core/calendar/dateFormatting.ts:58-65, 76-84`
- **Description:** `getMonthName(31)` returns `February` (strict `<`). `formatDate(1)` returns `"Jan 2"` (over-adds 1).
- **Fix:** Use `<=` threshold; remove `+ 1` from day calculation.
- **Source:** B (time/pipeline)

### BUG-018: `npcCycle.ts:109` — yesterdayRaces uses currentDay

- **Severity:** MEDIUM (wrong NPC behavior — processes today's races as yesterday's)
- **File:** `src/core/npc/npcCycle.ts:109`
- **Description:** Filter uses `r.day === currentDay` but variable name says "yesterday's races". Off-by-one.
- **Fix:** Use `r.day === currentDay - 1` or `r.day < currentDay`.
- **Source:** E (NPC/stable)

### BUG-019: `stableSelection.ts:26` — Biased shuffle

- **Severity:** MEDIUM (non-deterministic/biased stable selection)
- **File:** `src/core/stable/stableSelection.ts:26`
- **Description:** `array.sort(() => rng.next() - 0.5)` — biased, non-deterministic shuffle. Not a true Fisher-Yates.
- **Fix:** Replace with Fisher-Yates shuffle.
- **Source:** E (NPC/stable)

### BUG-020: `stables.ts:119` — Unguarded empty array access

- **Severity:** LOW (crash on edge case)
- **File:** `src/core/npc/stables.ts:119`
- **Description:** `rng.pick(midTierArchetypes).id` unguarded for empty `midTierArchetypes` array.
- **Fix:** Add empty-array guard.
- **Source:** E (NPC/stable)

### BUG-021: `auctionConsignment.ts:87-91` — specialist crashes on undefined surfaceAptitude

- **Severity:** LOW (crash on edge case)
- **File:** `src/core/auction/auctionConsignment.ts:87-91`
- **Description:** `Object.entries(apts)` then `best[0]` — crashes if `surfaceAptitude` undefined/empty.
- **Fix:** Add guard for empty/undefined.
- **Source:** D (auction/market)

### BUG-022: `transportationTypes.ts:111-115` — Distance >5000 falls to road

- **Severity:** LOW (wrong transport mode for very long distances)
- **File:** `src/core/transportation/transportationTypes.ts:111-115`
- **Description:** `getTransportModeForDistance` falls through to `road` for distances >5000 miles (should be `air`).
- **Fix:** Change `distance <= 5000` to just `distance > 200` for air.
- **Source:** F (economy)

### BUG-023: `foaling.ts:76-78` — Unbounded age risk

- **Severity:** LOW (game balance — very old dams guaranteed complication)
- **File:** `src/core/horse/foaling.ts:76-78`
- **Description:** `ageRisk` has no upper clamp. When `baseRate + ageRisk >= 1`, every roll triggers complication.
- **Fix:** Clamp `ageRisk` to `Math.min(ageRisk, 1 - baseRate)`.
- **Source:** C (horse/breeding)

### BUG-024: `rivalryGrudgeMatch.ts:148` — Grammar typo

- **Severity:** LOW (display text)
- **File:** `src/services/narrative/rivalryGrudgeMatch.ts:148`
- **Description:** `"during today is grudge match"` should be `"during today's grudge match"`.
- **Fix:** Fix the string.
- **Source:** G (narrative)

### BUG-025: `bunfig.toml:4-5` — `[test]` section violates project policy

- **Severity:** LOW (1 test failure)
- **File:** `bunfig.toml:4-5`
- **Description:** Contains `[test]` section that `packageManagerConfig.test.ts` forbids. Project uses vitest, not bun test.
- **Fix:** Remove `[test]` section.
- **Source:** K (failing tests)

### BUG-026: `scripts/orphan-audit.ts:246-250` — Brittle regex misses outpost keys

- **Severity:** LOW (1 test failure)
- **File:** `scripts/orphan-audit.ts:246-250`
- **Description:** Regex extraction of `SLOT_FOOTPRINTS` keys from raw file text misses `jockey_academy` and `museum`.
- **Fix:** Import `OUTPOST_CONSTANTS.SLOT_FOOTPRINTS` directly and use `Object.keys()`.
- **Source:** K (failing tests)

### BUG-027: `HorseConditionSection.tsx:20-25` — TanStack Link crashes tests

- **Severity:** MEDIUM (8 test failures)
- **File:** `src/components/horse/HorseConditionSection.tsx:20-25`
- **Description:** `<Link to="/vet">` calls `useRouter()` which throws outside RouterProvider. All 8 tests crash.
- **Fix:** Add router mock in test file, or replace `<Link>` with `<a href="/vet">`.
- **Source:** H (UI), K (failing tests)

### BUG-028: `HorseBenchmarkDialog.test.tsx` — Non-unique getByText queries

- **Severity:** LOW (3 test failures)
- **File:** `src/tests/components/HorseBenchmarkDialog.test.tsx:81-82, 128`
- **Description:** `getByText("Turf")`/`getByText("Dirt")` match table rows too; `getByText("Black Caviar")` matches 2 rows.
- **Fix:** Use `getByRole("button", { name: ... })` for filter buttons; `getAllByText` for duplicates.
- **Source:** K (failing tests)

### BUG-029: `HorseDetail.surfacing.test.tsx:49` — Hidden element not found

- **Severity:** LOW (1 test failure)
- **File:** `src/tests/components/horse/HorseDetail.surfacing.test.tsx:49`
- **Description:** `getByText(/Campaign Strategy/i)` can't find element hidden by `hidden xl:block`.
- **Fix:** Use `{ hidden: true }` option or set wide viewport.
- **Source:** K (failing tests)

### BUG-030: `raceImpactHelpers.test.ts` — 1 failure (pending investigation)

- **Severity:** MEDIUM (1 test failure)
- **File:** `src/tests/services/raceImpactHelpers.test.ts`
- **Description:** Needs runtime confirmation. Likely data-shape mismatch in jockey stats or Triple Crown progress.
- **Fix:** Run `bunx vitest run` to get exact failure, then fix.
- **Source:** K (failing tests)

### BUG-031: `HorseManagementSection.tsx:33` — Second native `confirm()` not covered by any PR

- **Severity:** LOW (UX inconsistency)
- **File:** `src/components/horse/HorseManagementSection.tsx:33`
- **Description:** `confirm(\`Geld ${horse.name}?...\`)` — native confirm, not covered by PR #385.
- **Fix:** Replace with AlertDialog (extend Groom pattern).
- **Source:** H (UI), cross-cutting

### BUG-032: `engine.ts:384` — generateAuctionLots mutates input array

- **Severity:** LOW (side effect)
- **File:** `src/core/auction/engine.ts:384`
- **Description:** `generateAuctionLots` pushes generated horses into the input `allHorses` array via `.push()`.
- **Fix:** Create a copy first: `const result = [...allHorses]`.
- **Source:** D (auction/market)

### BUG-033: `campaignSlice.ts:132-154` — dismissCampaignFlag stale index

- **Severity:** MEDIUM (wrong flag dismissed)
- **File:** `src/game/store/slices/campaignSlice.ts:132-154`
- **Description:** Removes flag by `filter` AND enqueues `campaign_flag_dismissal` intent. Pipeline processing the intent finds stale index.
- **Fix:** Use soft-delete (set `dismissed: true`) or dismiss by flag ID.
- **Source:** I (routes/hooks/game)

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| CRITICAL  | 2      |
| HIGH      | 5      |
| MEDIUM    | 13     |
| LOW       | 13     |
| **Total** | **33** |

**Test failures accounted for:** 19 failing tests = BUG-001 (3) + BUG-003 (2) + BUG-025 (1) + BUG-026 (1) + BUG-027 (8) + BUG-028 (3) + BUG-029 (1) + BUG-030 (1) = 20 (1 pending investigation may overlap).
