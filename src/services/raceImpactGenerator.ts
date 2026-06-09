import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type {
  AnyImpact,
  RaceResultImpact,
  EnergyImpact,
  FormImpact,
  FameImpact,
  RaceHistoryImpact,
  CashImpact,
  BlueHenImpact,
  StudCareerImpact,
  PaceSampleImpact,
  JockeyStatsImpact,
  LogImpact,
  TripleCrownProgressImpact,
  ReputationImpact,
  TransactionImpact,
  NewsImpact,
  RecoveryImpact,
  BeyerImpact,
  InboxImpact,
  TrainerStatsImpact,
  JockeyAffinityImpact,
  SyndicateSatisfactionImpact,
} from "@/core/resolver/impacts/index";
import { computeSectionalSplits } from "@/core/race/sectionalAnalysis";
import { generateRaceNews } from "@/services/newsGenerator";
import { rollForInjury } from "@/core/health/healthSystem";
import { updateApprenticeProgression } from "@/core/apprentice/apprenticeTypes";
import { calculateDailyPremium, INSURANCE_CONFIG } from "@/core/insurance/insuranceTypes";
import { calculateBaseHorseValue } from "@/core/horse/pricing";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { Rng } from "@/core/common/rng";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { generateUUID } from "@/core/uuid";
import { formatCurrency } from "@/lib/formatting";
import { beyerFigure, detectPatternJump } from "@/core/race/beyer";
import { calculateClassBonus } from "@/core/common/classBonus";
import { recalcStandingFee } from "@/core/breeding/stallions";
import {
  detectInbreedingPattern,
  inbreedingPerformanceDampener,
} from "@/core/breeding/populationGenetics";
import type { Race, Horse, Jockey } from "@/game/types";
import { getCurrentYear } from "@/core/race/schedule";
import {
  PRIZE_SPLIT,
  GRADED_PRIZE_SPLIT,
  JOCKEY_FEE_PERCENTAGE,
  BASE_JOCKEY_RIDING_FEE,
  STAMINA_DRAIN_DISTANCE_DIVISOR,
  STAMINA_DRAIN_BEYER_DIVISOR,
  STAMINA_DRAIN_MAX,
  RACE_ENERGY_IMPACT,
  MAX_FAME,
} from "@/constants/game";
import { GRADED_RACES } from "@/data/gradedRaces";
import { calculateRaceWinReputation, calculateRaceLossReputation } from "@/core/reputation";
import { getPeakingBeyerMultiplier } from "@/core/health/banister";
import { AFFINITY_CONSTANTS } from "@/core/jockey/affinity";

/**
 * Get prize split percentages for a specific race.
 *
 * Returns different prize splits based on race type:
 * - Graded races: Higher percentage to winner (70% vs 60%)
 * - Regular races: Standard split (60%, 25%, 10%, 5%)
 *
 * @param race - The race to get prize split for
 * @returns Array of prize split percentages
 */
function getPrizeSplitForRace(race: Race): number[] {
  // Graded races have a different prize split (more to winner)
  if (race.graded) {
    return GRADED_PRIZE_SPLIT;
  }
  // Default prize split for regular races
  return PRIZE_SPLIT;
}

/**
 * Props for the generateRaceImpacts function.
 */
export interface GenerateRaceImpactsProps {
  /** The completed race data */
  race: Race;
  /** Final race result positions and times for each participant */
  result: Array<{ horseId: string; position: number; time: number }>;
  /** The field of runners with lane and barrier data */
  runners: Array<{ horseId: string; barrier?: number; lane?: number }>;
  /** Current horse population (can be an array or a pre-indexed Map) */
  horses: Horse[] | Map<string, Horse>;
  /** Current jockey population (can be an array or a pre-indexed Map) */
  jockeys: Jockey[] | Map<string, Jockey>;
  /** Game day of the race resolution */
  newDay: number;
  /** Active staff members with potential bonuses */
  hiredStaff?: StaffMember[];
  /** Optional random number generator for stochastic events (e.g., injuries) */
  rng?: Rng;
  /** Optional detailed race snapshots for replay/summary purposes */
  snapshots?: RaceSnapshot[];
  /** Speed pars for Beyer speed figure calculation, indexed by distance */
  calibratedPars: Record<number, number>;
  /** Optional current weather state for the race's track (for injury risk). */
  raceWeatherState?: import("@/core/weather/weatherTypes").WeatherState;
  /** Active syndicates for shareholder satisfaction tracking (Phase 5) */
  syndicates?: Record<string, import("@/core/breeding/types").Syndicate>;
}

/**
 * Generate energy expenditure impact for a horse.
 * @param horseId
 * @param newDay
 * @param rng
 * @returns The energy impact object.
 */
function generateEnergyImpact(horseId: string, newDay: number, rng?: Rng): EnergyImpact {
  return {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "energy_change",
    horseId,
    delta: RACE_ENERGY_IMPACT,
    reason: "Race energy expenditure",
  } as EnergyImpact;
}

/**
 * Generate form change impact based on finish position.
 * @param horse
 * @param position
 * @param newDay
 * @param hiredStaff
 * @param rng
 * @returns The form impact object.
 */
function generateFormImpact(
  horse: Horse,
  position: number,
  newDay: number,
  hiredStaff: StaffMember[],
  rng?: Rng,
): FormImpact {
  const stableId = horse.stableId || "";
  const groom = hiredStaff.find((s) => s.role === "groom" && s.stableId === stableId);

  const baseFormDelta =
    position === 1 ? 3 : position === 2 ? 2 : position === 3 ? 1 : position <= 5 ? 0 : -1;
  // Grooms prevent negative form delta from poor performance
  const formDelta = baseFormDelta < 0 && groom ? 0 : baseFormDelta;

  return {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "form_change",
    horseId: horse.id,
    delta: formDelta,
    reason: `Race position: ${position}`,
  } as FormImpact;
}

/**
 * Generate fame change impact for top 3 finishers.
 * @param horse
 * @param position
 * @param newDay
 * @param rng
 * @returns The fame impact object, or null if no fame change.
 */
function generateFameImpact(
  horse: Horse,
  position: number,
  newDay: number,
  rng?: Rng,
): FameImpact | null {
  const fameDelta = position === 1 ? 2 : position <= 3 ? 0.5 : 0;
  if (fameDelta > 0) {
    return {
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "fame_change",
      horseId: horse.id,
      delta: fameDelta,
      reason: `Race position: ${position}`,
    } as FameImpact;
  }
  return null;
}

/**
 * Generate Beyer figure and recovery impacts.
 * @param horse
 * @param position
 * @param time
 * @param race
 * @param classBonus
 * @param calibratedPars
 * @param newDay
 * @param rng
 * @returns Object containing the Beyer impact and recovery impact.
 */
function generateBeyerAndRecoveryImpacts(
  horse: Horse,
  position: number,
  time: number,
  race: Race,
  classBonus: number,
  calibratedPars: any,
  newDay: number,
  rng?: Rng,
): { beyerImpact: BeyerImpact; recoveryImpact: RecoveryImpact } {
  const beyer = beyerFigure({
    distance: race.distance,
    finishTime: time,
    classBonus,
    calibratedPars,
  });
  const inbreedingPattern = detectInbreedingPattern(horse.pedigree);
  const dampener = inbreedingPerformanceDampener(inbreedingPattern);
  const peakingMultiplier = getPeakingBeyerMultiplier(horse.peakingIndex ?? 0);
  const adjustedBeyer = Math.max(0, Math.round((beyer - dampener) * peakingMultiplier));

  // Fatigue: Recovery points drain based on race distance and performance intensity (Beyer)
  const recoveryDrain = Math.min(
    STAMINA_DRAIN_MAX,
    Math.floor(race.distance / STAMINA_DRAIN_DISTANCE_DIVISOR) +
      Math.floor(adjustedBeyer / STAMINA_DRAIN_BEYER_DIVISOR),
  );

  return {
    beyerImpact: {
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "beyer_update",
      horseId: horse.id,
      beyer: adjustedBeyer,
      raceDay: newDay,
      reason: "Race performance",
    } as BeyerImpact,
    recoveryImpact: {
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "recovery_change",
      horseId: horse.id,
      delta: -recoveryDrain,
      reason: "Race fatigue",
    } as RecoveryImpact,
  };
}

/**
 * Generate race history impact.
 * @param horse
 * @param position
 * @param time
 * @param race
 * @param adjustedBeyer
 * @param newDay
 * @param runner
 * @param runner.horseId
 * @param runner.barrier
 * @param runner.lane
 * @param rng
 * @returns The race history impact object.
 */
function generateRaceHistoryImpact(
  horse: Horse,
  position: number,
  time: number,
  race: Race,
  adjustedBeyer: number,
  newDay: number,
  runner?: { horseId: string; barrier?: number; lane?: number },
  rng?: Rng,
): RaceHistoryImpact {
  // Eligibility: Check for "Win and You're In" qualifications for year-end championships
  let winAndYouInQualified = undefined;
  if (position === 1 && race.graded?.winAndYouInTarget) {
    const currentYear = getCurrentYear(newDay);
    winAndYouInQualified = {
      year: currentYear,
      raceId: race.id,
      raceKey: race.graded.winAndYouInTarget,
    };
  }

  return {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "always",
    type: "race_history",
    horseId: horse.id,
    raceHistoryEntry: {
      raceId: race.id,
      raceName: race.name,
      position,
      day: newDay,
      beyer: adjustedBeyer,
      grade: race.graded?.grade,
      distance: race.distance,
      surface: race.graded?.surface,
      purse: race.purse,
      fieldSize: 0, // Will be set by caller
      raceClass: race.raceClass,
      barrier: runner?.barrier,
      lane: runner?.lane,
      winAndYouInQualified,
    },
    reason: "Race completed",
  } as RaceHistoryImpact;
}

/**
 * Generate Triple Crown progress impact for winners of TC races.
 * @param horse
 * @param position
 * @param race
 * @param newDay
 * @param rng
 * @returns The Triple Crown progress impact object, or null if not applicable.
 */
function generateTripleCrownProgressImpact(
  horse: Horse,
  position: number,
  race: Race,
  newDay: number,
  rng?: Rng,
): TripleCrownProgressImpact | null {
  if (position === 1 && race.graded?.triplecrownKey) {
    const currentYear = getCurrentYear(newDay);
    const triplecrownKey = race.graded.triplecrownKey;

    // Get all races for this triple crown series
    const tcRaces = GRADED_RACES.filter((g) => g.triplecrownKey === triplecrownKey);

    // Check horse's race history for all legs
    const legs = tcRaces.map((tcRace) => {
      // If this is the current race being resolved, use the current result
      if (tcRace.key === race.graded?.key) {
        return {
          raceKey: tcRace.key,
          position,
          day: newDay,
        };
      }
      // Otherwise check race history
      const historyEntry = horse.raceHistory.find(
        (rh) => rh.raceId === tcRace.key || rh.raceName === tcRace.name,
      );
      return {
        raceKey: tcRace.key,
        position: historyEntry?.position ?? 999,
        day: historyEntry?.day ?? 0,
      };
    });

    // Check if won all legs (all positions === 1)
    const won = legs.every((leg) => leg.position === 1);

    return {
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "always",
      type: "triple_crown_progress",
      horseId: horse.id,
      triplecrownKey,
      year: currentYear,
      legs,
      won,
      reason: won
        ? `Triple Crown winner! ${horse.name} won ${triplecrownKey}`
        : `Triple Crown progress updated for ${horse.name}`,
    } as TripleCrownProgressImpact;
  }
  return null;
}

/**
 * Generate prize money impacts for a horse.
 * @param horse - The horse to generate prize money for
 * @param position - Finishing position (1-based)
 * @param race - The race data
 * @param newDay - Current game day
 * @param rng
 * @returns Object containing the cash impact and optional transaction and reputation impacts, or null if no prize.
 */
function generatePrizeMoneyImpacts(
  horse: Horse,
  position: number,
  race: Race,
  newDay: number,
  rng?: Rng,
): {
  cashImpact: CashImpact;
  transactionImpact?: TransactionImpact;
  reputationImpact?: ReputationImpact;
} | null {
  const prizeSplit = getPrizeSplitForRace(race);
  if (position - 1 >= prizeSplit.length) return null;

  const prize = Math.round(race.purse * prizeSplit[position - 1]);
  if (prize <= 0) return null;

  const cashImpact: CashImpact = {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "cash_change",
    entityId: horse.stableId || "",
    amount: prize,
    reason: `Prize money: ${position}${getOrdinalSuffix(position)} in ${race.name}`,
  };

  let transactionImpact: TransactionImpact | undefined;
  let reputationImpact: ReputationImpact | undefined;

  // Player-specific impacts
  if (!horse.stableId) {
    transactionImpact = {
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "transaction",
      amount: prize,
      category: "prize_money",
      description: `Prize money: ${position}${getOrdinalSuffix(position)} in ${race.name}`,
      metadata: { horseId: horse.id, raceId: race.id },
    } as TransactionImpact;

    // Reputation: Manager reputation increases for wins
    if (position === 1) {
      const repGain = calculateRaceWinReputation(race.graded?.grade, race.purse);
      reputationImpact = {
        id: generateUUID(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "always",
        type: "reputation_change",
        delta: repGain,
        source: "race_win",
        reason: `Win in ${race.name}${race.graded ? ` (${race.graded.grade})` : ""}`,
        metadata: { horseId: horse.id, raceId: race.id },
      } as ReputationImpact;
    } else {
      // Reputation loss for poor performance in graded races
      const fieldSize = race.entries?.length || position;
      // Calculate consecutive losses from race history
      const consecutiveLosses = horse.raceHistory
        ? horse.raceHistory
            .slice()
            .reverse()
            .filter((h) => h.raceId !== race.id)
            .findIndex((h) => h.position === 1)
        : 0;
      const effectiveConsecutiveLosses = consecutiveLosses === -1 ? 99 : consecutiveLosses;

      const repLoss = calculateRaceLossReputation(
        race.graded?.grade,
        position,
        fieldSize,
        effectiveConsecutiveLosses,
      );

      if (repLoss < 0) {
        reputationImpact = {
          id: generateUUID(rng),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "always",
          type: "reputation_change",
          delta: repLoss,
          source: "race_loss",
          reason: `Poor finish (${position}${getOrdinalSuffix(position)} of ${fieldSize}) in ${race.name}${race.graded ? ` (${race.graded.grade})` : ""}`,
          metadata: { horseId: horse.id, raceId: race.id },
        } as ReputationImpact;
      }
    }
  }

  return { cashImpact, transactionImpact, reputationImpact };
}

/**
 * Generate jockey fee impacts for a horse.
 * @param horse - The horse that ran the race
 * @param jockey - The jockey who rode the horse
 * @param newDay - Current game day
 * @param horseId - The horse ID (for stable identification)
 * @param raceId - The race ID
 * @param rng
 * @returns Object containing the cash impact and optional transaction impact.
 */
function generateJockeyFeeImpacts(
  horse: Horse,
  jockey: Jockey,
  newDay: number,
  horseId: string,
  raceId: string,
  rng?: Rng,
): { cashImpact: CashImpact; transactionImpact?: TransactionImpact } {
  const ridingFee = jockey.ridingFee || BASE_JOCKEY_RIDING_FEE;

  const cashImpact: CashImpact = {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "cash_change",
    entityId: horse.stableId || "",
    amount: -ridingFee,
    reason: `Jockey fee: ${jockey.name}`,
  };

  let transactionImpact: TransactionImpact | undefined;

  // Player-specific transaction
  if (!horse.stableId) {
    transactionImpact = {
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "transaction",
      amount: -ridingFee,
      category: "jockey_fee",
      description: `Jockey fee: ${jockey.name} for ${horse.name}`,
      metadata: { horseId, raceId },
    } as TransactionImpact;
  }

  return { cashImpact, transactionImpact };
}

/**
 * Generate percentage-based jockey fee impacts (10% of purse earnings).
 * @param jockey
 * @param winAmount
 * @param newDay
 * @param owned
 * @param stableId
 * @param rng
 * @returns The cash impact object, or null if no fee applies.
 */
function generatePercentageJockeyFeeImpacts(
  jockey: Jockey,
  winAmount: number,
  newDay: number,
  owned: boolean,
  stableId?: string,
  rng?: Rng,
): CashImpact | null {
  const jockeyFee = Math.round(winAmount * JOCKEY_FEE_PERCENTAGE); // Jockeys take 10% of purse earnings
  if (jockeyFee <= 0) return null;

  return {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "cash_change",
    entityId: owned ? "" : stableId || "",
    amount: -jockeyFee,
    reason: `Jockey fee for ${jockey.name}`,
  } as CashImpact;
}

/**
 * Generate a pattern-jump inbox message for a horse that dramatically improved its Beyer figure.
 * Only fires for Graded races.
 * @param horse
 * @param beyerValue - The adjusted Beyer figure from this race
 * @param race
 * @param newDay
 * @param rng
 * @returns An InboxImpact if a jump was detected, otherwise null.
 */
function generatePatternJumpImpact(
  horse: Horse,
  beyerValue: number,
  race: Race,
  newDay: number,
  rng?: Rng,
): InboxImpact | null {
  if (!race.graded) return null;

  const { jumped, margin } = detectPatternJump(horse, beyerValue);
  if (!jumped) return null;

  const isAdverseWeather =
    (race.weather && (race.weather === "rainy" || race.weather === "cloudy")) ||
    race.trackCondition === "heavy" ||
    race.trackCondition === "soft" ||
    race.trackCondition === "yielding";

  const title = isAdverseWeather
    ? `Storm Performance: ${horse.name}`
    : `Performance Spike: ${horse.name}`;

  const weatherNote = isAdverseWeather
    ? ` Despite the ${race.weather} weather and ${race.trackCondition} track, this horse thrived in the adverse conditions.`
    : " This horse is on a sharp upward trajectory.";

  return {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "always",
    type: "inbox_message",
    message: {
      day: newDay,
      category: "race",
      priority: "info",
      title,
      body: `${horse.name} produced a massive performance jump in the ${
        race.name
      }, earning a ${beyerValue} Beyer figure (+${Math.round(margin)} improvement).${weatherNote}`,
      cta: {
        label: "View Horse",
        route: "stable.$horseId",
        params: { horseId: horse.id },
      },
    },
  } as InboxImpact;
}

/**
 * Generate a trainer stats update impact for a horse's assigned trainer.
 * @param horse
 * @param position - Finishing position (1-based)
 * @param race
 * @param hiredStaff
 * @param newDay
 * @param rng
 * @returns A TrainerStatsImpact if a trainer is assigned, otherwise null.
 */
function generateTrainerStatsImpact(
  horse: Horse,
  position: number,
  race: Race,
  hiredStaff: StaffMember[],
  newDay: number,
  rng?: Rng,
): TrainerStatsImpact | null {
  const horseStableId = horse.stableId || (horse.owned ? "" : undefined);
  const assignedTrainer = hiredStaff.find(
    (s) => s.role === "trainer" && (horse.owned ? !s.stableId : s.stableId === horseStableId),
  );
  if (!assignedTrainer) return null;

  const isWin = position === 1;
  const isPlace = position === 2;
  const isShow = position === 3;

  let fameDelta = 0;
  if (isWin) {
    fameDelta = race.graded?.grade === "G1" ? 10 : race.graded ? 5 : 2;
  } else if (isPlace || isShow) {
    fameDelta = 1;
  } else if (position > 10) {
    fameDelta = -1;
  }

  let specialty: string | undefined;
  if (race.distance && race.distance <= 1400) {
    specialty = "sprinter";
  } else if (race.distance && race.distance >= 2000) {
    specialty = "router";
  }
  if (race.surface) {
    specialty = race.surface.toLowerCase();
  }

  return {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "trainer_stats",
    staffId: assignedTrainer.id,
    raceRecord: {
      wins: isWin ? 1 : 0,
      places: isPlace ? 1 : 0,
      shows: isShow ? 1 : 0,
      starts: 1,
    },
    fameDelta,
    specialty,
    reason: `${assignedTrainer.name} trained ${horse.name} to ${position}${getOrdinalSuffix(position)} in ${race.name}`,
  } as TrainerStatsImpact;
}

/**
 * Generate a jockey affinity XP gain (or penalty) impact.
 * @param horse
 * @param jockey
 * @param position - Finishing position (1-based)
 * @param race
 * @param beyerValue - The adjusted Beyer figure from this race
 * @param newDay
 * @param rng
 * @returns A JockeyAffinityImpact.
 */
function generateJockeyAffinityImpact(
  horse: Horse,
  jockey: Jockey,
  position: number,
  race: Race,
  beyerValue: number,
  newDay: number,
  rng?: Rng,
): JockeyAffinityImpact {
  let xpGain = AFFINITY_CONSTANTS.XP_PER_RACE;

  if (position === 1) {
    xpGain += AFFINITY_CONSTANTS.XP_PER_WIN_BONUS;
  }

  const fieldSize = race.entries?.length || position;
  if (position > 10 && position > fieldSize / 2) {
    xpGain += AFFINITY_CONSTANTS.XP_POOR_RACE_PENALTY;
  }

  if (position <= 3 && beyerValue > 100) {
    xpGain += 5;
  }

  return {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "jockey_affinity_gain",
    jockeyId: jockey.id,
    horseId: horse.id,
    xp: xpGain,
    reason: `Raced ${horse.name} to ${position}${getOrdinalSuffix(position)}${xpGain < 0 ? " (poor performance penalty)" : ""}`,
  } as JockeyAffinityImpact;
}

/**
 * Generate breeding-related impacts for a stakes winner:
 * - Blue hen status update for the dam
 * - Stud career and standing fee recalibration for the sire
 * - Syndicate shareholder satisfaction updates
 *
 * Only fires when the horse finished 1st in a graded or stakes race.
 * @param horse
 * @param position - Finishing position (1-based)
 * @param race
 * @param horseMap
 * @param syndicates
 * @param newDay
 * @param rng
 * @returns Array of impacts (may be empty).
 */
function generateBreedingImpacts(
  horse: Horse,
  position: number,
  race: Race,
  horseMap: Map<string, Horse>,
  syndicates: Record<string, import("@/core/breeding/types").Syndicate> | undefined,
  newDay: number,
  rng?: Rng,
): AnyImpact[] {
  if (position !== 1) return [];
  if (!race.graded && race.raceClass !== "Stakes" && race.raceClass !== "Group") return [];

  const impacts: AnyImpact[] = [];

  // Blue hen status for the dam
  const dam = horse.pedigree?.damId ? horseMap.get(horse.pedigree.damId) : undefined;
  if (dam) {
    impacts.push({
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "blue hen_status",
      horseId: dam.id,
      blueHenStatus: {
        isBlueHen: dam.blueHenStatus?.isBlueHen || false,
        stakesWinnersProduced: (dam.blueHenStatus?.stakesWinnersProduced ?? 0) + 1,
        group1WinnersProduced:
          race.graded?.grade === "G1"
            ? (dam.blueHenStatus?.group1WinnersProduced ?? 0) + 1
            : dam.blueHenStatus?.group1WinnersProduced,
        blueHenScore: dam.blueHenStatus?.blueHenScore || 0,
        foalsProduced: dam.blueHenStatus?.foalsProduced || 0,
      },
      reason: `Stakes win by ${horse.name}`,
    } as BlueHenImpact);
  }

  // Stud career and fee recalibration for the sire
  const sire = horse.pedigree?.sireId ? horseMap.get(horse.pedigree.sireId) : undefined;
  if (sire && sire.stud?.atStud) {
    const newStakesFoals = (sire.stud.lifetimeStakesFoals ?? 0) + 1;
    const newG1Foals =
      race.graded?.grade === "G1"
        ? (sire.stud.lifetimeG1Foals ?? 0) + 1
        : sire.stud.lifetimeG1Foals;

    const previousFee = sire.stud.standingFee;
    const newFee = sire.stableId
      ? recalcStandingFee(
          {
            ...sire,
            stud: {
              ...sire.stud,
              lifetimeStakesFoals: newStakesFoals,
              lifetimeG1Foals: newG1Foals,
            },
          },
          newDay,
        )
      : sire.stud.standingFee;

    impacts.push({
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "stud_career",
      horseId: sire.id,
      studCareer: {
        ...sire.stud,
        standingFee: newFee,
        previousStandingFee: previousFee,
        lifetimeStakesFoals: newStakesFoals,
        lifetimeG1Foals: newG1Foals,
      },
      reason: `Stakes win by ${horse.name}${sire.stableId ? `. Fee: $${formatCurrency(previousFee)} → $${formatCurrency(newFee)}.` : ""}`,
    } as StudCareerImpact);

    // Syndicate shareholder satisfaction
    const syndicate = Object.values(syndicates || {}).find((s) => s.stallionId === sire.id);
    if (syndicate) {
      const satisfactionDelta = race.graded?.grade === "G1" ? 15 : race.graded ? 8 : 5;
      for (const stableId of Object.keys(syndicate.shareHolders)) {
        impacts.push({
          id: generateUUID(rng),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "syndicate_satisfaction",
          syndicateId: syndicate.id,
          stableId,
          satisfactionDelta,
          reason: `Syndicated stallion ${sire.name}'s foal ${horse.name} won ${race.name}`,
        } as SyndicateSatisfactionImpact);
      }
    }
  }

  return impacts;
}

/**
 * Generate a race summary log impact for the player's owned horses.
 * @param ownedResults - Results for player-owned horses only
 * @param race
 * @param horseMap
 * @param newDay
 * @param rng
 * @returns A LogImpact summarising results and prize earnings, or null if no owned horses.
 */
function generateRaceSummaryLog(
  ownedResults: Array<{ horseId: string; position: number; time: number }>,
  race: Race,
  horseMap: Map<string, Horse>,
  newDay: number,
  rng?: Rng,
): import("@/core/resolver/impacts/index").LogImpact | null {
  if (ownedResults.length === 0) return null;

  const summary = ownedResults
    .map((r) => {
      const horse = horseMap.get(r.horseId);
      return `${horse?.name} ${r.position}${getOrdinalSuffix(r.position)}`;
    })
    .join(", ");

  const prize = ownedResults.reduce((sum, r) => {
    const prizeSplit = getPrizeSplitForRace(race);
    if (r.position - 1 < prizeSplit.length) {
      return sum + Math.round(race.purse * prizeSplit[r.position - 1]);
    }
    return sum;
  }, 0);

  return {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "always",
    type: "log",
    text: `${race.name} — ${summary}${prize > 0 ? ` (won ${formatCurrency(prize)})` : ""}`,
    reason: "Race summary",
  } as import("@/core/resolver/impacts/index").LogImpact;
}

/**
 * Generate all state impacts resulting from a completed race.
 *
 * This function orchestrates the post-race resolution logic, including:
 * - Result recording and history updates
 * - Energy expenditure and injury rolls
 * - Performance metrics (Beyer Figures) with genetic dampeners
 * - Financial transactions (prize money, jockey fees)
 * - Reputation and fame updates
 * - Career milestones (Triple Crown progress, blue hen status, stud fees)
 * - Narrative and news generation
 *
 * @param props - Impact generation properties
 * @param props.race - The completed race data
 * @param props.result - Final race result positions and times for each participant
 * @param props.runners - The field of runners with lane and barrier data
 * @param props.horses - Current horse population (can be an array or a pre-indexed Map)
 * @param props.jockeys - Current jockey population (can be an array or a pre-indexed Map)
 * @param props.newDay - Game day of the race resolution
 * @param props.hiredStaff - Active staff members with potential bonuses
 * @param props.rng - Optional random number generator for stochastic events (e.g., injuries)
 * @param props.snapshots - Optional detailed race snapshots for replay/summary purposes
 * @param props.calibratedPars - Speed pars for Beyer speed figure calculation, indexed by distance
 * @param props.raceWeatherState
 * @returns Array of impacts to be applied to the game state by the resolver
 */
export function generateRaceImpacts({
  race,
  result,
  runners,
  horses,
  jockeys,
  newDay,
  hiredStaff = [],
  rng,
  snapshots = [],
  calibratedPars,
  raceWeatherState,
  syndicates,
}: GenerateRaceImpactsProps): AnyImpact[] {
  try {
    const impacts: AnyImpact[] = [];
    const classBonus = calculateClassBonus(race.graded?.grade, race.raceClass);

    // Build the weather context for injury rolls (passed to rollForInjury).
    const injuryWeatherCtx = {
      weather: race.weather,
      trackCondition: race.trackCondition,
      pattern: raceWeatherState?.pattern,
      tempC: raceWeatherState?.tempC,
      windKph: raceWeatherState?.windKph,
      snow: raceWeatherState?.pattern === "snow",
    };

    // Normalize collections to Maps for O(1) lookups
    const horseMap =
      horses instanceof Map
        ? (horses as Map<string, Horse>)
        : new Map(horses.map((h) => [h.id, h]));
    const jockeyMap =
      jockeys instanceof Map
        ? (jockeys as Map<string, Jockey>)
        : new Map(jockeys.map((j) => [j.id, j]));

    const runnersMap = new Map(runners.map((run) => [run.horseId, run]));
    const entriesMap = new Map(race.entries.map((e) => [e.horseId, e]));

    // 1. Record the overall race result
    impacts.push({
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "always",
      type: "race_result",
      raceId: race.id,
      results: result.map(({ horseId, position, time }) => ({ horseId, position, time })),
      snapshots,
      reason: "Race resolved",
    } as RaceResultImpact);

    // Compute sectional splits if snapshots are available
    if (snapshots && snapshots.length > 0) {
      race.sectionalSplits = computeSectionalSplits(snapshots, race.distance);
    }

    const splitEntryMaps = race.sectionalSplits?.map((split) =>
      new Map(split.entries.map((e) => [e.horseId, e])),
    ) ?? [];

    // 2. Process per-horse consequences
    for (const r of result) {
      const horse = horseMap.get(r.horseId);
      if (!horse) continue;

      const runner = runnersMap.get(r.horseId);

      // Energy expenditure
      impacts.push(generateEnergyImpact(horse.id, newDay, rng));

      // Health: Roll for potential injuries
      if (rng) {
        const injury = rollForInjury(rng, horse, newDay, hiredStaff, injuryWeatherCtx);
        if (injury) {
          impacts.push(injury);
          // Insurance payout for career-ending injuries
          if (injury.severity === "career-ending" && horse.insurancePolicy) {
            const coveragePercent = INSURANCE_CONFIG.COVERAGE[horse.insurancePolicy.type];
            if (coveragePercent > 0) {
              const horseValue = calculateBaseHorseValue(horse, "mid");
              const payout = Math.round(horseValue * coveragePercent);
              if (payout > 0) {
                impacts.push({
                  id: generateUUID(rng),
                  intentId: "",
                  day: newDay,
                  phase: "raceResolution",
                  logLevel: "always",
                  type: "insurance_payout",
                  horseId: horse.id,
                  amount: payout,
                  reason: `Insurance payout for ${horse.name} (${horse.insurancePolicy.type})`,
                } as any);
              }
            }
          }
        }
      }

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

      // Store beyer for later use in affinity calculations
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
      // Store visits BEFORE this race; handler increments by 1 when applying
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
      );
      historyImpact.raceHistoryEntry.fieldSize = result.length;
      historyImpact.raceHistoryEntry.pacePositions = pacePositions;
      historyImpact.raceHistoryEntry.courseVisitCount = courseVisitCount;
      impacts.push(historyImpact);

      // Triple Crown progress
      const tcImpact = generateTripleCrownProgressImpact(horse, r.position, race, newDay, rng);
      if (tcImpact) {
        impacts.push(tcImpact);
      }

      // Trainer stats update (Phase 4: Relationship Enhancement)
      const trainerImpact = generateTrainerStatsImpact(horse, r.position, race, hiredStaff, newDay, rng);
      if (trainerImpact) {
        impacts.push(trainerImpact);
      }

      // Prize money distribution
      const prizeImpacts = generatePrizeMoneyImpacts(horse, r.position, race, newDay, rng);
      if (prizeImpacts) {
        impacts.push(prizeImpacts.cashImpact);
        if (prizeImpacts.transactionImpact) impacts.push(prizeImpacts.transactionImpact);
        if (prizeImpacts.reputationImpact) impacts.push(prizeImpacts.reputationImpact);
      }

      // Jockey riding fees
      const entry = entriesMap.get(horse.id);
      if (entry?.jockeyId) {
        const jockey = jockeyMap.get(entry.jockeyId);
        if (jockey) {
          const jockeyFeeImpacts = generateJockeyFeeImpacts(
            horse,
            jockey,
            newDay,
            horse.id,
            race.id,
            rng,
          );
          impacts.push(jockeyFeeImpacts.cashImpact);
          if (jockeyFeeImpacts.transactionImpact) impacts.push(jockeyFeeImpacts.transactionImpact);

          // Affinity XP gain / penalty
          impacts.push(generateJockeyAffinityImpact(horse, jockey, r.position, race, beyerValue, newDay, rng));
        }
      }

      // 5+6. Breeding: blue hen, stud career, syndicate satisfaction
      for (const bi of generateBreedingImpacts(horse, r.position, race, horseMap, syndicates, newDay, rng)) {
        impacts.push(bi);
      }

      // 7. Jockey performance and stats tracking
      const raceEntry = entriesMap.get(horse.id);
      const prizeSplit = getPrizeSplitForRace(race);
      if (raceEntry?.jockeyId && r.position - 1 < prizeSplit.length) {
        const jockey = jockeyMap.get(raceEntry.jockeyId);

        if (jockey) {
          const winAmount = prizeSplit[r.position - 1] * race.purse;

          // Update apprentice progression if applicable
          let apprenticeProgression = jockey.apprenticeProgression;
          if (jockey.isApprentice && apprenticeProgression && r.position === 1) {
            apprenticeProgression = updateApprenticeProgression(apprenticeProgression, false);
          }

          impacts.push({
            id: generateUUID(rng),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "jockey_stats",
            jockeyId: jockey.id,
            careerStarts: jockey.careerStarts + 1,
            careerWins: jockey.careerWins + (r.position === 1 ? 1 : 0),
            fame: Math.min(
              MAX_FAME,
              jockey.fame + (r.position === 1 ? 2 : r.position <= 3 ? 0.5 : 0),
            ),
            apprenticeProgression,
            reason: `Rode ${horse.name} to ${r.position}${getOrdinalSuffix(r.position)}`,
          } as JockeyStatsImpact);

          const percentageFeeImpact = generatePercentageJockeyFeeImpacts(
            jockey,
            winAmount,
            newDay,
            raceEntry.owned || false,
            raceEntry.stableId,
            rng,
          );
          if (percentageFeeImpact) {
            impacts.push(percentageFeeImpact);
          }
        }
      }
    }

    // 8. Analytics: Global pace samples for handicapping logic
    if (result.length > 0) {
      const winner = result[0];
      impacts.push({
        id: generateUUID(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "conditional",
        type: "pace_sample",
        distance: race.distance,
        time: winner.time,
        reason: `Pace sample from ${race.name}`,
      } as PaceSampleImpact);
    }

    // 9. Narrative: Generate race summary logs for the player
    const ownedHorses = result.filter((r) => {
      const h = horseMap.get(r.horseId);
      return h && !h.stableId;
    });
    const summaryLog = generateRaceSummaryLog(ownedHorses, race, horseMap, newDay, rng);
    if (summaryLog) {
      impacts.push(summaryLog);
    }

    // 10. Narrative: Dynamic news generation for major races
    if (rng) {
      const newsItem = generateRaceNews(race, result, Array.from(horseMap.values()), newDay, rng);
      if (newsItem) {
        impacts.push({
          id: generateUUID(rng),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "always",
          type: "news_item",
          newsItem,
        } as NewsImpact);
      }
    }

    return impacts;
  } catch (error) {
    console.error("Error in generateRaceImpacts:", error);
    // Return empty impacts array on error to prevent corruption
    return [];
  }
}
