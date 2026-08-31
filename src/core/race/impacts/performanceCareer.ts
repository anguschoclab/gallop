/**
 * performanceCareer.ts - Performance, career, and history impact generators
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { AnyImpact, DistanceAptitudeImpact } from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import type { Rng } from "@/core/common/rng";
import { computeDistanceScaling } from "@/core/race/engine/runnerBuilder";
import { generateFormImpact, generateFameImpact } from "./energyFormFame";
import { generateBeyerAndRecoveryImpacts } from "./beyerRecovery";
import { generatePatternJumpImpact } from "./patternJump";
import { generateRaceHistoryImpact, generateTripleCrownProgressImpact } from "./raceHistory";
import { generateTrainerStatsImpact } from "./trainerStats";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { Race, Horse, RaceResult, RaceEntry } from "@/game/types";

export function generatePerformanceCareerImpacts(
  horse: Horse,
  r: RaceResult,
  race: Race,
  runner: { horseId: string; gate?: number; lane?: number } | undefined,
  classBonus: number,
  calibratedPars: Record<number, number>,
  splitEntryMaps: Map<string, { horseId: string; rank: number }>[],
  resultLength: number,
  newDay: number,
  hiredStaff: StaffMember[],
  rng?: Rng,
  raceEntry?: RaceEntry,
  getId?: () => string,
): { impacts: AnyImpact[]; beyerValue: number } {
  const impacts: AnyImpact[] = [];

  // Form change
  impacts.push(generateFormImpact(horse, r.position, newDay, hiredStaff, rng, getId));

  // Fame change
  const fameImpact = generateFameImpact(horse, r.position, newDay, rng, getId);
  if (fameImpact) {
    impacts.push(fameImpact);
  }

  // Beyer and recovery impacts
  const { beyerImpact, recoveryImpact } = generateBeyerAndRecoveryImpacts(
    horse,
    r.position,
    r.time,
    race,
    classBonus,
    calibratedPars,
    newDay,
    rng,
    getId,
  );
  impacts.push(beyerImpact, recoveryImpact);

  const beyerValue = beyerImpact.beyer;

  // Pattern jump detection — inbox notification for Graded races
  const patternJumpImpact = generatePatternJumpImpact(horse, beyerValue, race, newDay, rng, getId);
  if (patternJumpImpact) {
    impacts.push(patternJumpImpact);
  }

  // Race history impact
  const trackId = race.trackId || race.graded?.trackId;
  const pacePositions = race.sectionalSplits?.map((split, i) => {
    const entry = splitEntryMaps[i]?.get(horse.id);
    return entry?.rank ?? 0;
  });
  const courseVisitCount = trackId ? (horse.courseVisits?.[trackId] ?? 0) : undefined;

  const historyImpact = generateRaceHistoryImpact(
    horse,
    r.position,
    r.time,
    race,
    beyerImpact.beyer,
    newDay,
    runner,
    rng,
    raceEntry,
    getId,
  );
  historyImpact.raceHistoryEntry.fieldSize = resultLength;
  historyImpact.raceHistoryEntry.pacePositions = pacePositions;
  historyImpact.raceHistoryEntry.courseVisitCount = courseVisitCount;
  impacts.push(historyImpact);

  // Distance aptitude drift — preferred distance gradually shifts toward the
  // distances the horse actually races at (5% of the gap per start, clamped
  // to the aptitude range).
  const currentApt = horse.distanceAptitude ?? 1600;
  const shifted = currentApt + (race.distance - currentApt) * 0.05;
  const newApt = Math.max(800, Math.min(3200, shifted));
  const aptDelta = newApt - currentApt;
  if (Math.abs(aptDelta) >= 1) {
    const scaling = computeDistanceScaling(currentApt, race.distance);
    impacts.push({
      id: getId ? getId() : generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "distance_aptitude_shift",
      horseId: horse.id,
      delta: aptDelta,
      newValue: newApt,
      reason: "Race experience",
      preferredDistance: scaling.preferredDistance,
      raceDistance: race.distance,
      distanceRatio: scaling.distanceRatio,
      distanceDeviation: scaling.distanceDeviation,
      distanceMod: scaling.distanceMod,
      distanceStaminaMul: scaling.distanceStaminaMul,
    } as DistanceAptitudeImpact);
  }

  // Triple Crown progress
  const tcImpact = generateTripleCrownProgressImpact(horse, r.position, race, newDay, rng, getId);
  if (tcImpact) {
    impacts.push(tcImpact);
  }

  // Trainer stats update
  const trainerImpact = generateTrainerStatsImpact(
    horse,
    r.position,
    race,
    hiredStaff,
    newDay,
    rng,
    getId,
  );
  if (trainerImpact) {
    impacts.push(trainerImpact);
  }

  return { impacts, beyerValue };
}
