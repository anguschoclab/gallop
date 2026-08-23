/**
 * npc/npcFacilityUpgrades.ts - NPC facility upgrade processing
 *
 * Extracted from npcCycle.ts for modularity.
 *
 * Dependencies: @/game/types (Stable), @/core/ai/npcCycleAI (NpcAIManager, StableAIState), @/core/ai/facilityAI, @/core/facilities, @/constants/aiConstants
 */

import type { Stable } from "@/game/types";
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";
import {
  selectFacilityToUpgrade,
  calculateFacilityBudget,
  shouldUpgradeFacility,
} from "@/core/ai/facilityAI";
import { createFacilityAIState } from "@/core/ai/facilityAITypes";
import { recordFacilityInvestment } from "@/core/ai/facilityAIRoi";
import { upgradeFacility } from "@/core/facilities";
import { DEFAULT_SUBSYSTEM_WEIGHT } from "@/constants/aiConstants";
import type { PlayerFacilities } from "@/core/facilities/facilityTypes";

/**
 * Process facility upgrades for a single NPC stable.
 *
 * @param stable - The NPC stable.
 * @param stableAIState - AI state for this stable.
 * @param facilities - Facilities for this stable (mutated in place).
 * @param currentDay - Current game day.
 * @returns Cash change entry if an upgrade was performed, otherwise null.
 */
export function processNpcFacilityUpgrade(
  stable: Stable,
  stableAIState: StableAIState,
  facilities: PlayerFacilities,
  currentDay: number,
): { stableId: string; amount: number; reason: string } | null {
  if (!stableAIState.facilityAI) {
    stableAIState.facilityAI = createFacilityAIState(stable);
  }

  const facilityBudget = calculateFacilityBudget(stableAIState.facilityAI, stable, currentDay);

  if (facilityBudget.upgradeBudget <= 0 || stable.cash < facilityBudget.upgradeBudget) {
    return null;
  }

  const facilityToUpgrade = selectFacilityToUpgrade(
    stableAIState.facilityAI,
    facilities,
    stable,
    currentDay,
  );
  if (!facilityToUpgrade) return null;

  const currentFacility = facilities[facilityToUpgrade];
  if (!currentFacility) return null;

  const facilityWeight = stableAIState.subsystemWeights?.facility ?? DEFAULT_SUBSYSTEM_WEIGHT;
  if (
    !shouldUpgradeFacility(
      stableAIState.facilityAI,
      facilityToUpgrade,
      currentFacility.level,
      stable,
      currentDay,
      facilityWeight,
    )
  ) {
    return null;
  }

  const upgraded = upgradeFacility(currentFacility, currentDay);
  if (!upgraded) return null;

  facilities[facilityToUpgrade] = upgraded;
  stableAIState.facilityAI = recordFacilityInvestment(
    stableAIState.facilityAI,
    facilityToUpgrade,
    currentFacility.level,
    upgraded.level,
    upgraded.upgradeCost,
    stable,
    currentDay,
  );

  return {
    stableId: stable.id,
    amount: -upgraded.upgradeCost,
    reason: `Facility upgrade: ${facilityToUpgrade}`,
  };
}
