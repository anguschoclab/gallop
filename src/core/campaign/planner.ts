/**
 * campaignPlanner.ts - Campaign planning and slot generation
 *
 * This file generates and updates campaign race slots by scanning upcoming races
 * and matching them to the horse's goal and aptitudes.
 *
 * Dependencies: ./types (Horse, Race, HorseCampaign, CampaignRaceSlot, CampaignFlag, ConfirmedAptitudes, Stable), ./gradedRaces (GRADED_RACES, GradedRace), ./raceSchedule (getCurrentYear), @/core/ai/campaignAI (detectContender, getOptimalMajorRaceTarget, getPrepRaceStrategy, createCampaignAIState), @/core/ai/npcCycleAI (getOrCreateStableAIState, NpcAIManager)
 * Related files: autoEntryRunner.ts (uses campaign slots for auto-entry), scheduler.ts (uses for campaign management)
 */

// Campaign Planner
// Generates and updates CampaignRaceSlot[] for a HorseCampaign by scanning
// upcoming races and matching them to the horse's goal and aptitudes.

import type {
  Horse,
  Race,
  HorseCampaign,
  CampaignRaceSlot,
  CampaignFlag,
  ConfirmedAptitudes,
  Stable,
} from "@/game/types";
import { GRADED_RACES_BY_KEY } from "@/data/gradedRaces";
import { getCurrentYear } from "@/core/race/schedule";
import { detectContender, createCampaignAIState } from "@/core/ai/campaignAI";
import { getOptimalMajorRaceTarget, getPrepRaceStrategy } from "@/core/ai/campaignTargeting";
import type { TripleCrownProgress } from "@/core/calendar/campaignTypes";
import { getOrCreateStableAIState, type NpcAIManager } from "@/core/ai/npcCycleAI";
import {
  getDistanceBand,
  surfaceScore,
  distanceBandScore,
  buildPrepChain,
  buildGradeChaseSlots,
  buildEarningsSlots,
  buildMaidenSlots,
  type DistanceBand,
} from "./campaignSlotBuilders";

// ── Campaign plan generation ──────────────────────────────────────────────────

export type PlannerInput = {
  horse: Horse;
  campaign: HorseCampaign;
  races: Race[];
  currentDay: number;
  stable?: Stable;
  npcAIManager?: NpcAIManager;
  triplecrownHistory?: TripleCrownProgress[];
};

/**
 * Strategy for building campaign slots based on goal type.
 */
interface GoalStrategy {
  build: (
    candidateRaces: Race[],
    preserved: CampaignRaceSlot[],
    apts: ConfirmedAptitudes,
    currentDay: number,
  ) => CampaignRaceSlot[];
}

/**
 * Registry of goal strategies indexed by campaign goal type.
 */
const CAMPAIGN_GOAL_STRATEGIES: Record<HorseCampaign["goalType"], GoalStrategy> = {
  chase_g1: {
    build: (races, preserved, apts, day) => buildGradeChaseSlots(races, "G1", preserved, apts, day),
  },
  chase_g2: {
    build: (races, preserved, apts, day) => buildGradeChaseSlots(races, "G2", preserved, apts, day),
  },
  chase_g3: {
    build: (races, preserved, apts, day) => buildGradeChaseSlots(races, "G3", preserved, apts, day),
  },
  maximize_earnings: {
    build: (races, preserved, apts, day) => buildEarningsSlots(races, preserved, apts, day),
  },
  develop_maiden: {
    build: (races, preserved, _apts, day) => buildMaidenSlots(races, preserved, day),
  },
  chase_major_race: {
    build: (_races, preserved) => preserved, // Handled separately for contender detection
  },
  free_run: {
    build: (_races, preserved) => preserved,
  },
};

/**
 * Build a fresh set of CampaignRaceSlots from available races + GRADED_RACES calendar.
 *
 * Existing "entered" or "completed" slots are preserved. Uses AI-driven major race targeting
 * for NPCs when AI manager is available.
 *
 * @param input - Planner input including horse, campaign, races, current day, stable, and AI manager
 * @returns Array of campaign race slots
 */
export function buildCampaignSlots(input: PlannerInput): CampaignRaceSlot[] {
  const { horse, campaign, races, currentDay, stable, npcAIManager } = input;
  const { goalType, targetRaceKey, confirmedAptitudes } = campaign;

  const preserved = campaign.slots.filter(
    (s) => s.status === "entered" || s.status === "completed",
  );

  const candidateRaces = races.filter((r) => {
    if (r.resolved) return false;
    if (r.cancelled) return false;
    if (r.day <= currentDay) return false;
    if (r.day > currentDay + 365) return false;
    return true;
  });

  const year = getCurrentYear(currentDay);

  // AI-driven major race targeting for NPCs
  if (goalType === "chase_major_race" && stable && npcAIManager) {
    const aiState = getOrCreateStableAIState(npcAIManager, stable, currentDay);
    // Initialize campaignAI if not present
    if (!aiState.campaignAI) {
      aiState.campaignAI = createCampaignAIState(stable);
    }
    if (aiState.campaignAI) {
      // Check if horse is a contender
      const updatedState = detectContender(aiState.campaignAI, horse, currentDay);
      const horseStatus = updatedState.contenderTracking[horse.id];
      if (horseStatus?.isContender && !targetRaceKey) {
        // Auto-assign optimal major race target
        const optimalTarget = getOptimalMajorRaceTarget(
          aiState.campaignAI,
          horse,
          stable,
          currentDay,
          input.triplecrownHistory ?? [],
        );
        if (optimalTarget) {
          const targetGraded = GRADED_RACES_BY_KEY.get(optimalTarget);
          if (targetGraded) {
            return buildPrepChain(
              targetGraded,
              candidateRaces,
              preserved,
              confirmedAptitudes,
              currentDay,
              year,
              horse,
            );
          }
        }
      }
    }
  }

  // If targeting a specific graded race key, build a prep chain
  if (targetRaceKey) {
    const targetGraded = GRADED_RACES_BY_KEY.get(targetRaceKey);
    if (targetGraded) {
      return buildPrepChain(
        targetGraded,
        candidateRaces,
        preserved,
        confirmedAptitudes,
        currentDay,
        year,
        horse,
      );
    }
  }

  // Otherwise select races by goal via strategy pattern
  return CAMPAIGN_GOAL_STRATEGIES[goalType].build(
    candidateRaces,
    preserved,
    confirmedAptitudes,
    currentDay,
  );
}

// ── Flag generation ───────────────────────────────────────────────────────────

/**
 * Generate campaign flags for a horse based on current state.
 *
 * Creates flags for low energy, health issues, and upgrade availability.
 * Preserves existing flags unless dismissed.
 *
 * @param horse - The horse to generate flags for
 * @param campaign - The horse's campaign
 * @param currentDay - Current simulation day
 * @returns Array of campaign flags
 */
export function generateCampaignFlags(
  horse: Horse,
  campaign: HorseCampaign,
  currentDay: number,
): CampaignFlag[] {
  const flags: CampaignFlag[] = [...campaign.flags];

  // Low energy flag
  if (horse.energy < 30 && !flags.some((f) => !f.dismissed && f.type === "low_energy")) {
    flags.push({
      day: currentDay,
      type: "low_energy",
      message: `${horse.name} energy is critically low (${horse.energy}%). Consider a rest window.`,
      dismissed: false,
    });
  }

  // Health flag
  if (
    horse.healthStatus !== "healthy" &&
    !flags.some((f) => !f.dismissed && f.type === "health_issue")
  ) {
    flags.push({
      day: currentDay,
      type: "health_issue",
      message: `${horse.name} is not fully healthy (${horse.healthStatus}). Review upcoming entries.`,
      dismissed: false,
    });
  }

  // Upgrade available — if horse won last 2 starts in non-graded
  const recentHistory = (horse.raceHistory ?? []).slice(-3);
  const recentWins = recentHistory.filter((h) => h.position === 1);
  if (
    recentWins.length >= 2 &&
    !recentHistory.some((h) => h.grade) &&
    !flags.some((f) => !f.dismissed && f.type === "upgrade_available")
  ) {
    flags.push({
      day: currentDay,
      type: "upgrade_available",
      message: `${horse.name} has won ${recentWins.length} of last ${recentHistory.length} starts — ready for a class rise.`,
      dismissed: false,
    });
  }

  return flags;
}

// ── Aptitude update from race result ─────────────────────────────────────────

/**
 * Update campaign aptitudes from a race result.
 *
 * Increments surface and distance band start counts. Confirms surface and distance band
 * after 3 starts with 60% majority.
 *
 * @param apts - Current confirmed aptitudes
 * @param surface - Surface of the race
 * @param distance - Distance of the race in meters
 * @returns Updated confirmed aptitudes
 */
export function updateCampaignAptitudes(
  apts: ConfirmedAptitudes,
  surface: "Turf" | "Dirt" | "Synthetic",
  distance: number,
): ConfirmedAptitudes {
  const band = getDistanceBand(distance);
  const updated: ConfirmedAptitudes = {
    ...apts,
    surfaceStarts: { ...apts.surfaceStarts, [surface]: (apts.surfaceStarts[surface] ?? 0) + 1 },
    distanceBandStarts: {
      ...apts.distanceBandStarts,
      [band]: (apts.distanceBandStarts[band] ?? 0) + 1,
    },
  };

  // Confirm surface after 3 starts on it with majority
  const surfTotal = Object.values(updated.surfaceStarts).reduce((a, b) => a + b, 0);
  if (surfTotal >= 3) {
    const dominant = (Object.entries(updated.surfaceStarts) as [string, number][]).sort(
      (a, b) => b[1] - a[1],
    )[0];
    if (dominant[1] >= surfTotal * 0.6) {
      updated.surfaceConfirmed = dominant[0] as "Turf" | "Dirt" | "Synthetic";
    }
  }

  // Confirm distance band after 3 starts
  const bandTotal = Object.values(updated.distanceBandStarts).reduce((a, b) => a + b, 0);
  if (bandTotal >= 3) {
    const dominant = (Object.entries(updated.distanceBandStarts) as [string, number][]).sort(
      (a, b) => b[1] - a[1],
    )[0];
    if (dominant[1] >= bandTotal * 0.6) {
      updated.distanceBandConfirmed = dominant[0] as DistanceBand;
    }
  }

  return updated;
}
