# Stable Rivalries Spec

**Date:** 2026-05-13  
**Feature:** Dynamic Stable Rivalries  
**Scope:** Rivalries only (alliances deferred)

---

## Overview

The `StableAIState.friction` system, regional king tracking, and rivalry helpers already exist but are invisible to the player. This feature surfaces them through:

1. Gazette events that fire at rivalry milestones
2. NPC AI weight adjustments that make rivals actively target the player
3. A "Key Rivals" dashboard widget
4. Enhanced NPC stable detail page with head-to-head records

No new rivalry _state_ needs to be invented — the work is wiring what exists to news, AI weights, and UI.

---

## Existing Infrastructure

| What                                | Location                                                  |
| ----------------------------------- | --------------------------------------------------------- |
| `StableAIState.friction` (-100→100) | `src/core/ai/npcCycleAI.ts`                               |
| `StableAIState.winsAgainstPlayer`   | `src/core/ai/npcCycleAI.ts`                               |
| `StableAIState.regionalPrestige`    | `src/core/ai/npcCycleAI.ts`                               |
| `isHatedRival(friction)` helper     | `src/core/stable/rivalry.ts`                              |
| `isFriendlyCompetitor(friction)`    | `src/core/stable/rivalry.ts`                              |
| Friction decay + update logic       | `src/core/npc/npcCycle.ts` → `processRegionalDominance()` |
| `NpcAIManager.regionalKings`        | `src/game/state/systemsState.ts`                          |
| `NewsItem` type                     | `src/core/narrative/newsTypes.ts`                         |
| `generateRaceNews()`                | `src/services/newsGenerator.ts`                           |
| Claiming AI                         | `src/core/ai/claimingAI.ts` → `shouldClaimHorse()`        |
| Auction AI                          | `src/core/ai/auctionAI.ts` → `calculateMaxBid()`          |

---

## Files to Create

### `src/services/rivalryNewsGenerator.ts`

This module is solely responsible for generating `NewsItem` objects from rivalry state transitions. It should be pure (no state writes) — callers are responsible for appending the returned items to `state.news`.

```typescript
import type { NewsItem } from "@/core/narrative/newsTypes";
import type { StableAIState } from "@/core/ai/npcCycleAI";
import type { Stable } from "@/core/stable/types";

// --- Milestone: A rivalry becomes heated ---
// Call when friction crosses 60 for the first time.
// Check StableAIState for a "rivalryAnnouncedDay" flag to avoid re-firing.
export function generateRivalEmergesNews(npcStable: Stable, day: number): NewsItem;

// --- Milestone: Grudge match result ---
// Call after any G1/G2/G3 race resolution where:
//   - The player owned at least one entry
//   - An NPC stable with friction >= 50 also had an entry
// Pass both horses (player best-placed and rival best-placed) and the race.
export function generateGrudgeMatchNews(
  race: Race,
  playerHorse: Horse,
  rivalHorse: Horse,
  npcStable: Stable,
  playerWon: boolean,
  day: number,
): NewsItem;

// --- Milestone: Regional king dethroned ---
// Call when winsAgainstPlayer >= 3 triggers a region transfer.
export function generateRegionLostNews(
  npcStable: Stable,
  regionName: string,
  day: number,
): NewsItem;
```

**NewsItem shapes to produce:**

| Trigger                   | category   | importance | headline example                                                    |
| ------------------------- | ---------- | ---------- | ------------------------------------------------------------------- |
| Rival emerges             | `"stable"` | `"medium"` | `"Thornfield Racing has become a fierce rival."`                    |
| Grudge match (player won) | `"racing"` | `"high"`   | `"Player defeats Thornfield Racing in the King's Plate."`           |
| Grudge match (rival won)  | `"racing"` | `"high"`   | `"Thornfield Racing edges out player in a thrilling King's Plate."` |
| Region lost               | `"stable"` | `"high"`   | `"Thornfield Racing claims dominance of North America East."`       |

Each `NewsItem` should include `entityLinks` pointing to the NPC stable (`type: "stable"`) and any named horses.

---

## Files to Modify

### `src/core/npc/npcCycle.ts` — `processRegionalDominance()`

After friction is updated for a race result, add three checks:

```
1. If friction just crossed 60 AND stableAI has no "rivalryAnnouncedDay":
   → call generateRivalEmergesNews()
   → set stableAI.rivalryAnnouncedDay = currentDay
   → push NewsItem to impacts

2. After a G1/G2/G3 resolves:
   → find all NPC stables with friction >= 50 that had entries
   → if player also had entries, call generateGrudgeMatchNews()
   → push NewsItem to impacts

3. When winsAgainstPlayer triggers regional king transfer:
   → call generateRegionLostNews()
   → push NewsItem to impacts
```

**State change needed in `StableAIState`:**  
Add one optional field: `rivalryAnnouncedDay?: number` — prevents the "rival emerges" news from firing more than once per NPC stable.

### `src/core/ai/claimingAI.ts` — `shouldClaimHorse()`

Locate where the claim desirability score is computed for player-owned horses. Apply a friction multiplier:

```typescript
// After existing score calculation:
if (targetOwnedByPlayer && stableAI) {
  const friction = stableAI.friction ?? 0;
  if (friction >= 50) {
    score *= 1 + (friction - 50) / 100; // max +0.5x at friction=100
  }
}
```

This makes rivals noticeably more aggressive at claiming without making it guaranteed.

### `src/core/ai/auctionAI.ts` — `calculateMaxBid()`

Locate the max bid ceiling calculation when bidding against the player. Apply friction:

```typescript
// After existing maxBid calculation:
if (isPlayerLot && stableAI) {
  const friction = stableAI.friction ?? 0;
  if (friction >= 50) {
    maxBid *= 1 + (friction - 50) / 200; // max +0.25x at friction=100
  }
}
```

Smaller multiplier than claiming — auction overbidding is financially self-punishing, so the effect should be visible but not ruinous.

### `src/routes/index.tsx` — Dashboard

Add a **"Key Rivals"** card in the right-hand column (below the news feed, above stable overview or wherever space permits).

**Data to display per rival (top 3 by friction, minimum friction 40):**

- Stable name + tier badge
- Friction bar: red fill proportional to `friction / 100`, label "Hostile" / "Rival" / "Competitive"
- Head-to-head line: derives from scanning `state.horses[].raceHistory` for races where both stables had entries (expensive — memoize or limit to last 30 days)

**If no rivals above threshold:** render `"No bitter rivals yet — keep winning."` in grey text.

### `src/routes/npc-stables.$stableId.tsx`

In the existing rivalry/relationship section (where `friction` is already read from `stableAI`), add:

- **Rivalry status label:** Neutral / Competitive / Rival / Heated Rival (based on friction thresholds 0/30/60/80)
- **Head-to-head record:** Count of shared graded race starts where player and this stable both entered — wins/losses from player's perspective. Source from `race.result` cross-referencing entries.
- **Grudge match history:** Last 3 grudge match news items that involved this stable (filter `state.news` by `entityLinks` containing the stable id)

---

## Friction Threshold Reference

| Friction | Label        | NPC Behaviour                                       |
| -------- | ------------ | --------------------------------------------------- |
| < 30     | Neutral      | Default AI weights                                  |
| 30–59    | Competitive  | Mild claim/auction preference against player        |
| 60–79    | Rival        | Rival Emerges news fires; moderate targeting        |
| 80–100   | Heated Rival | `isHatedRival()` = true; full targeting multipliers |

---

## Testing Checklist

- [ ] Advance days until player wins a G2/G3 against an NPC — friction updates in `npcAIManager.stableStates`
- [ ] Once friction ≥ 60, check gazette for "Rival Emerges" article; confirm it only appears once per NPC
- [ ] Both player and high-friction NPC enter same G1 — confirm "Grudge Match" gazette item appears after race resolution
- [ ] Simulate `winsAgainstPlayer = 3` on a stableAI — confirm regional king transfers and gazette article fires
- [ ] Consign a cheap player horse to a claiming race with a high-friction NPC in the pool — confirm they claim more often than a neutral NPC would
- [ ] Dashboard: confirm "Key Rivals" widget appears only when at least one NPC has friction ≥ 40
- [ ] NPC stable detail page: confirm friction label, H2H record, and grudge match history display correctly
