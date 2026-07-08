/**
 * performanceCareer.ts - Performance, career, and history impact generators
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { Rng } from "@/core/common/rng";
import {
  generateFormImpact,
  generateFameImpact,
} from "./energyFormFame";
import { generateBeyerAndRecoveryImpacts } from "./beyerRecovery";
import { generatePatternJumpImpact } from "./patternJump";
import { generateRaceHistoryImpact, generateTripleCrownProgressImpact } from "./raceHistory";
import { generateTrainerStatsImpact } from "./trainerStats";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { Race, Horse } from "@/game/types";

export interface RaceResultEntry {
  horseId: string;
  position: number;
  time: number;
}

export function generatePerformanceCareerImpacts(
  horse: Horse,
  r: RaceResultEntry,
  race: Race,
  runner: { horseId: string; barrier?: number; lane?: number } | undefined,
  classBonus: number,
  calibratedPars: Record<number, number>,
  splitEntryMaps: Map<string, { horseId: string; rank: number }>[],
  resultLength: number,
  newDay: number,
  hiredStaff: StaffMember[],
  rng?: Rng,
  raceEntry?: { jockeyId?: string; stableId?: string; owned?: boolean },
): { impacts: AnyImpact[]; beyerValue: number } {
  const impacts: AnyImpact[] = [];

  // Form change
  impacts.push(generateFormImpact(horse, r.position, newDay, hiredStaff, rng));

  // Fame change
  const fameImpact = generateFameImpact(horse, r.position, newDay, rng);
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
  );
  impacts.push(beyerImpact, recoveryImpact);

  const beyerValue = beyerImpact.beyer;

  // Pattern jump detection — inbox notification for Graded races
  const patternJumpImpact = generatePatternJumpImpact(horse, beyerValue, race, newDay, rng);
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
  );
  historyImpact.raceHistoryEntry.fieldSize = resultLength;
  historyImpact.raceHistoryEntry.pacePositions = pacePositions;
  historyImpact.raceHistoryEntry.courseVisitCount = courseVisitCount;
  impacts.push(historyImpact);

  // Triple Crown progress
  const tcImpact = generateTripleCrownProgressImpact(horse, r.position, race, newDay, rng);
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
  );
  if (trainerImpact) {
    impacts.push(trainerImpact);
  }

  return { impacts, beyerValue };
}
