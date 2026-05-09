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
} from "./types";
import { GRADED_RACES } from "./gradedRaces";
import type { GradedRace } from "./gradedRaces";
import { getCurrentYear } from "./raceSchedule";
import {
  detectContender,
  getOptimalMajorRaceTarget,
  getPrepRaceStrategy,
  createCampaignAIState,
} from "@/core/ai/campaignAI";
import type { TripleCrownProgress } from "@/core/campaign/types";
import { getOrCreateStableAIState, type NpcAIManager } from "@/core/ai/npcCycleAI";

// ── Distance band helpers ────────────────────────────────────────────────────

type DistanceBand = "sprint" | "mile" | "intermediate" | "staying";

function getDistanceBand(meters: number): DistanceBand {
  if (meters <= 1300) return "sprint";
  if (meters <= 1700) return "mile";
  if (meters <= 2200) return "intermediate";
  return "staying";
}

// ── Grade ordering ───────────────────────────────────────────────────────────

const GRADE_ORDER: Record<string, number> = { G1: 3, G2: 2, G3: 1, Stakes: 0, Allowance: -1 };

function gradeAtLeast(raceGrade: string | undefined, minGrade: string): boolean {
  if (!raceGrade || !minGrade) return true;
  return (GRADE_ORDER[raceGrade] ?? -1) >= (GRADE_ORDER[minGrade] ?? -1);
}

// ── Aptitude scoring ─────────────────────────────────────────────────────────

function surfaceScore(apts: ConfirmedAptitudes, surface: "Turf" | "Dirt" | "Synthetic"): number {
  if (apts.surfaceConfirmed) return apts.surfaceConfirmed === surface ? 2 : 0;
  return apts.surfaceStarts[surface] ?? 0;
}

function distanceBandScore(apts: ConfirmedAptitudes, band: DistanceBand): number {
  if (apts.distanceBandConfirmed) return apts.distanceBandConfirmed === band ? 2 : 0;
  return apts.distanceBandStarts[band] ?? 0;
}

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
          const targetGraded = GRADED_RACES.find((g) => g.key === optimalTarget);
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
    const targetGraded = GRADED_RACES.find((g) => g.key === targetRaceKey);
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

  // Otherwise select races by goal
  switch (goalType) {
    case "chase_g1":
      return buildGradeChaseSlots(candidateRaces, "G1", preserved, confirmedAptitudes, currentDay);
    case "chase_g2":
      return buildGradeChaseSlots(candidateRaces, "G2", preserved, confirmedAptitudes, currentDay);
    case "chase_g3":
      return buildGradeChaseSlots(candidateRaces, "G3", preserved, confirmedAptitudes, currentDay);
    case "maximize_earnings":
      return buildEarningsSlots(candidateRaces, preserved, confirmedAptitudes, currentDay);
    case "develop_maiden":
      return buildMaidenSlots(candidateRaces, preserved, currentDay);
    case "free_run":
    default:
      return preserved;
  }
}

function buildPrepChain(
  target: GradedRace,
  candidateRaces: Race[],
  preserved: CampaignRaceSlot[],
  apts: ConfirmedAptitudes,
  currentDay: number,
  year: number,
  _horse: Horse,
): CampaignRaceSlot[] {
  const firstDayOfYear = (year - 1) * 365 + 1;
  const targetDay = firstDayOfYear + target.dayOfYear - 1;
  const slots: CampaignRaceSlot[] = [...preserved];

  // Main target slot
  const targetRace = candidateRaces.find((r) => r.graded?.key === target.key);
  if (!slots.some((s) => s.raceKey === target.key)) {
    slots.push({
      dayTarget: targetDay,
      dayWindow: 7,
      raceId: targetRace?.id,
      raceKey: target.key,
      role: "target",
      constraintDistance: target.distance,
      constraintSurface: target.surface,
      constraintGradeMin: target.grade,
      status: targetRace ? "planned" : "planned",
    });
  }

  // Add 1-2 prep races ~30 and ~60 days before target
  for (const daysOut of [60, 30]) {
    const prepWindowStart = targetDay - daysOut - 10;
    const prepWindowEnd = targetDay - daysOut + 10;
    if (prepWindowStart <= currentDay) continue;

    const bandScore = (r: Race) => {
      const band = getDistanceBand(r.distance);
      const surf = (r.graded?.surface ?? r.surface) as "Turf" | "Dirt" | "Synthetic" | undefined;
      let score = distanceBandScore(apts, band);
      if (surf) score += surfaceScore(apts, surf);
      return score;
    };

    const prep = candidateRaces
      .filter(
        (r) =>
          r.day >= prepWindowStart &&
          r.day <= prepWindowEnd &&
          !slots.some((s) => s.raceId === r.id || s.dayTarget === r.day),
      )
      .sort((a, b) => bandScore(b) - bandScore(a))[0];

    if (prep) {
      slots.push({
        dayTarget: prep.day,
        dayWindow: 5,
        raceId: prep.id,
        raceKey: prep.graded?.key,
        role: "prep",
        constraintDistance: prep.distance,
        constraintSurface: (prep.graded?.surface ?? prep.surface) as
          | "Turf"
          | "Dirt"
          | "Synthetic"
          | undefined,
        status: "planned",
      });
    }
  }

  return slots.sort((a, b) => a.dayTarget - b.dayTarget);
}

function buildGradeChaseSlots(
  candidateRaces: Race[],
  minGrade: "G1" | "G2" | "G3",
  preserved: CampaignRaceSlot[],
  apts: ConfirmedAptitudes,
  currentDay: number,
): CampaignRaceSlot[] {
  const slots: CampaignRaceSlot[] = [...preserved];

  const gradedCandidates = candidateRaces
    .filter(
      (r) =>
        r.graded &&
        gradeAtLeast(r.graded.grade, minGrade) &&
        r.day > currentDay + 14 &&
        !slots.some((s) => s.raceId === r.id),
    )
    .sort((a, b) => {
      const aSurf = (a.graded?.surface ?? a.surface) as "Turf" | "Dirt" | "Synthetic" | undefined;
      const bSurf = (b.graded?.surface ?? b.surface) as "Turf" | "Dirt" | "Synthetic" | undefined;
      const aScore =
        (aSurf ? surfaceScore(apts, aSurf) : 0) +
        distanceBandScore(apts, getDistanceBand(a.distance));
      const bScore =
        (bSurf ? surfaceScore(apts, bSurf) : 0) +
        distanceBandScore(apts, getDistanceBand(b.distance));
      return bScore - aScore;
    })
    .slice(0, 6);

  for (const r of gradedCandidates) {
    slots.push({
      dayTarget: r.day,
      dayWindow: 3,
      raceId: r.id,
      raceKey: r.graded?.key,
      role: "target",
      constraintGradeMin: minGrade,
      status: "planned",
    });
  }

  return slots.sort((a, b) => a.dayTarget - b.dayTarget);
}

function buildEarningsSlots(
  candidateRaces: Race[],
  preserved: CampaignRaceSlot[],
  apts: ConfirmedAptitudes,
  currentDay: number,
): CampaignRaceSlot[] {
  const slots: CampaignRaceSlot[] = [...preserved];

  const highValue = candidateRaces
    .filter(
      (r) => r.purse >= 100000 && r.day > currentDay + 7 && !slots.some((s) => s.raceId === r.id),
    )
    .sort((a, b) => {
      const aSurf = (a.graded?.surface ?? a.surface) as "Turf" | "Dirt" | "Synthetic" | undefined;
      const bSurf = (b.graded?.surface ?? b.surface) as "Turf" | "Dirt" | "Synthetic" | undefined;
      const aScore =
        (aSurf ? surfaceScore(apts, aSurf) : 0) +
        distanceBandScore(apts, getDistanceBand(a.distance)) +
        a.purse / 1000000;
      const bScore =
        (bSurf ? surfaceScore(apts, bSurf) : 0) +
        distanceBandScore(apts, getDistanceBand(b.distance)) +
        b.purse / 1000000;
      return bScore - aScore;
    })
    .slice(0, 8);

  for (const r of highValue) {
    slots.push({
      dayTarget: r.day,
      dayWindow: 3,
      raceId: r.id,
      raceKey: r.graded?.key,
      role: "target",
      status: "planned",
    });
  }

  return slots.sort((a, b) => a.dayTarget - b.dayTarget);
}

function buildMaidenSlots(
  candidateRaces: Race[],
  preserved: CampaignRaceSlot[],
  currentDay: number,
): CampaignRaceSlot[] {
  const slots: CampaignRaceSlot[] = [...preserved];

  const maidens = candidateRaces
    .filter(
      (r) =>
        (r.raceClass === "Maiden" || r.raceClass === "MaidenClaiming") &&
        r.day > currentDay + 7 &&
        !slots.some((s) => s.raceId === r.id),
    )
    .sort((a, b) => a.day - b.day)
    .slice(0, 4);

  for (const r of maidens) {
    slots.push({
      dayTarget: r.day,
      dayWindow: 3,
      raceId: r.id,
      role: "target",
      status: "planned",
    });
  }

  return slots.sort((a, b) => a.dayTarget - b.dayTarget);
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
