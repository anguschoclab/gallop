/**
 * campaignSlotBuilders.ts - Campaign slot building strategies
 *
 * Extracted from planner.ts for modularity.
 * Contains slot builders for different campaign goal types
 * (grade chase, earnings, maiden, prep chain) and aptitude scoring helpers.
 */

import type {
  Horse,
  Race,
  HorseCampaign,
  CampaignRaceSlot,
  ConfirmedAptitudes,
} from "@/game/types";
import { GRADED_RACES_BY_KEY } from "@/data/gradedRaces";
import type { GradedRace } from "@/data/gradedRaces";

// ── Distance band helpers ────────────────────────────────────────────────────

export type DistanceBand = "sprint" | "mile" | "intermediate" | "staying";

export function getDistanceBand(meters: number): DistanceBand {
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

export function surfaceScore(
  apts: ConfirmedAptitudes,
  surface: "Turf" | "Dirt" | "Synthetic",
): number {
  if (apts.surfaceConfirmed) return apts.surfaceConfirmed === surface ? 2 : 0;
  return apts.surfaceStarts[surface] ?? 0;
}

export function distanceBandScore(apts: ConfirmedAptitudes, band: DistanceBand): number {
  if (apts.distanceBandConfirmed) return apts.distanceBandConfirmed === band ? 2 : 0;
  return apts.distanceBandStarts[band] ?? 0;
}

// ── Slot builders ────────────────────────────────────────────────────────────

export function buildPrepChain(
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
          "Turf" | "Dirt" | "Synthetic" | undefined,
        status: "planned",
      });
    }
  }

  return slots.sort((a, b) => a.dayTarget - b.dayTarget);
}

export function buildGradeChaseSlots(
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

export function buildEarningsSlots(
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

export function buildMaidenSlots(
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
