# Make Reputation & Dark AI Systems Load-Bearing

## Problem

- Reputation has 7 tiers (unknown→legendary), accumulates correctly, but gates **nothing**
- `difficultyModulator` is defined on `NpcAIManager`, read by 3 intent generators, but **never initialized or updated** — always `undefined`, making every `if (difficultyModulator)` check dead code
- 7 AI subsystems (cartels, retention, distress, diplomacy, narrative, economy, difficulty) simulate a world the player can't see

## Part A: Reputation Gating

### Step 1: Create `src/core/reputation/reputationGating.ts`

Central gating logic mapping reputation tiers to access levels.

**Facility upgrade gates** (by target level):

- → standard: requires `local` (150+)
- → premium: requires `regional` (300+)
- → elite: requires `national` (450+)

**Auction sale access gates** (by sale kind):

- `2yo_training`: requires `regional` (300+) — prestigious OBS-style sales
- `broodmare`: requires `local` (150+) — established breeders only
- `racing_age`, `weanling`, `yearling`: no gate (open access)

**Race invitation gates** (by race grade):

- G1/G2 invitation races: at-large entries require `regional` (300+)
- G3/Listed invitation races: at-large entries require `local` (150+)
- Win-and-you-in qualifiers: always invited regardless of reputation

Export functions:

- `canUpgradeFacility(currentLevel, reputationTier): { allowed: boolean; requiredTier: ReputationTier }`
- `canAccessSale(saleKind, reputationTier): { allowed: boolean; requiredTier: ReputationTier }`
- `canReceiveAtLargeInvite(raceGrade, reputationTier): { allowed: boolean; requiredTier: ReputationTier }`
- `FACILITY_UPGRADE_TIER_REQ: Record<FacilityLevel, ReputationTier>`
- `SALE_ACCESS_TIER_REQ: Record<AuctionSaleKind, ReputationTier>`
- `INVITE_GRADE_TIER_REQ: Record<string, ReputationTier>`

### Step 2: Gate facility upgrades

**`src/game/store/slices/facilitySlice.ts`**: Add reputation tier check in `upgradeFacility` before cash check. Return `{ ok: false, reason: "Reputation too low. Requires [tier] reputation." }` if gated.

**`src/components/facilities/FacilityCategory.tsx`**: Show reputation lock on upgrade button when tier insufficient. Pass `reputationTier` to `FacilityCard`, disable button + show "Requires [tier] reputation" text.

### Step 3: Gate auction sales access

**`src/routes/auction.index.tsx`**: Filter `allUpcoming` sales by reputation tier. Show locked sales with a "Requires [tier] reputation" badge instead of hiding them entirely (player can see what they're missing). Gate both buying AND consigning for gated sale kinds.

### Step 4: Gate race invitations

**`src/core/time/phases/raceInvitations.ts`**: Add reputation check before adding player-owned horses to `atLargeCandidates`. Win-and-you-in qualifiers bypass the gate. NPC horses are not gated (they have their own `stable.reputation` which is separate from `ManagerReputation`).

## Part B: Wire difficultyModulator

### Step 5: Extend `DifficultyState` in `npcCycleAI.ts`

Add fields:

- `playerWins: number` — accumulated count
- `playerEntries: number` — accumulated count
- `adjustmentPeriod: number` — days between adjustments (default 30)

### Step 6: Create `src/core/time/phases/difficultyPhase.ts`

Pipeline phase at order 71 (after race resolution at 70, before leaderboard at 72).

Logic:

1. Scan races resolved on `newDay` (race.resolved && race.day === newDay)
2. For each resolved race, check if any player-owned horse participated → increment `playerEntries`
3. Check if position 1 horse is player-owned → increment `playerWins`
4. If `newDay - lastAdjustmentDay >= adjustmentPeriod` (30 days):
   - Compute `playerWinRate = playerWins / playerEntries`
   - Target competence: if winRate > 0.35 → increase toward 1.3; if < 0.15 → decrease toward 0.7; else drift toward 1.0
   - Smooth adjustment: `npcCompetenceMultiplier += (target - current) * 0.3`
   - Clamp to [0.7, 1.3]
   - Update `lastAdjustmentDay = newDay`
5. Store updated `difficultyModulator` on `npcAIManager`

### Step 7: Register phase

- Add `PHASE_ORDER_DIFFICULTY = 71` to `src/constants/pipelineConstants.ts`
- Import and register `difficultyPhase` in `src/core/time/phases/index.ts`

## Part C: Rival-Intelligence Screen

### Step 8: Create `src/components/analytics/RivalIntelScreen.tsx`

Consolidated panel with tabbed sections surfacing all dark AI subsystems:

1. **Difficulty & Adaptation** tab: Player win rate, NPC competence multiplier, last adjustment, trend arrow. (Replaces the basic `NpcAIStatusPanel` display)
2. **Cartels & Alliances** tab: Active cartels (type, members, formed day), NPC-to-NPC alliances (which stables are allied, type), trust heatmap
3. **Economic Trends** tab: Global economic state (stud fee trend, yearling price index, claiming activity), economic history chart
4. **NPC Distress** tab: Each NPC stable's financial distress level, what actions are blocked, which stables are near bankruptcy
5. **Narrative Arcs** tab: Active story arcs across all stables, recent story beats, dramatic potential ratings

Data sources:

- `npcAIManager.difficultyModulator` (newly wired)
- `npcAIManager.activeCartels`
- `npcAIManager.globalEconomicState`, `npcAIManager.economicHistory`
- `npcAIManager.stableStates[id].npcRelationships` (alliances)
- `npcAIManager.stableStates[id].financialDistress` (distress levels)
- `npcAIManager.stableStates[id].narrativeState` (arcs and beats)

### Step 9: Add route

Create `src/routes/intel.tsx` — new route for the rival-intelligence screen. Add navigation link in `AppShell.tsx`.

## Part D: Tests

### Step 10: Reputation gating tests

`src/tests/core/reputation/reputationGating.test.ts`:

- `canUpgradeFacility` returns correct allowed/requiredTier for each level combination
- `canAccessSale` gates 2yo_training and broodmare correctly
- `canReceiveAtLargeInvite` gates G1/G2 vs G3/Listed correctly
- Edge cases: exactly at threshold, unknown tier

### Step 11: Difficulty modulator tests

`src/tests/core/time/difficultyPhase.test.ts`:

- Initializes difficultyModulator when undefined
- Counts player wins/entries correctly from resolved races
- Adjusts npcCompetenceMultiplier after adjustment period
- Clamps to [0.7, 1.3]
- Does not adjust before adjustment period elapses

### Step 12: Validation

- `bun run typecheck`
- `bun run test` (or targeted test files)
- `bun run lint`
