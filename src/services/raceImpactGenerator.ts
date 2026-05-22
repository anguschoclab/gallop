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
  InjuryImpact,
  NewsImpact,
  RecoveryImpact,
  BeyerImpact,
  InboxImpact,
} from "@/core/resolver/impacts/index";
import { computeSectionalSplits } from "@/core/race/sectionalAnalysis";
import { generateRaceNews } from "@/services/newsGenerator";
import { rollForInjury } from "@/core/health/healthSystem";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { Rng } from "@/game/rng";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { generateUUID } from "@/core/uuid";
import { formatCurrency } from "@/lib/formatting";
import { beyerFigure, detectPatternJump } from "@/game/beyer";
import { calculateClassBonus } from "@/core/common/classBonus";
import { recalcStandingFee } from "@/core/breeding/stallions";
import {
  detectInbreedingPattern,
  inbreedingPerformanceDampener,
} from "@/core/breeding/populationGenetics";
import type { Race, Horse, Jockey } from "@/game/types";
import { getCurrentYear } from "@/game/raceSchedule";
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
} from "@/game/constants/gameConstants";
import { GRADED_RACES } from "@/core/data/gradedRaces";
import { createReputationEvent, calculateRaceWinReputation } from "@/core/reputation";
import type { ManagerReputation } from "@/core/reputation";
import { createTransaction } from "@/core/transactions";
import type { Transaction } from "@/core/transactions";
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
  /** Current player cash balance */
  stateCash: number;
  /** Current manager reputation state */
  stateReputation?: ManagerReputation;
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
 * @returns Array of impacts to be applied to the game state by the resolver
 */
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
  hiredStaff: any[],
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
 * @param props.stateCash - Current player cash balance
 * @param props.stateReputation - Current manager reputation state
 * @param props.hiredStaff - Active staff members with potential bonuses
 * @param props.rng - Optional random number generator for stochastic events (e.g., injuries)
 * @param props.snapshots - Optional detailed race snapshots for replay/summary purposes
 * @param props.calibratedPars - Speed pars for Beyer speed figure calculation, indexed by distance
 * @returns Array of impacts to be applied to the game state by the resolver
 */
export function generateRaceImpacts({
  race,
  result,
  runners,
  horses,
  jockeys,
  newDay,
  stateCash,
  stateReputation,
  hiredStaff = [],
  rng,
  snapshots = [],
  calibratedPars,
  raceWeatherState,
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

      // --- PATTERN JUMP DETECTION ---
      // Only push notifications for Graded races (G1, G2, G3)
      if (race.graded) {
        const { jumped, margin } = detectPatternJump(horse, beyerImpact.beyer);
        if (jumped) {
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

          impacts.push({
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
              }, earning a ${beyerImpact.beyer} Beyer figure (+${Math.round(
                margin,
              )} improvement).${weatherNote}`,
              cta: {
                label: "View Horse",
                route: "stable.$horseId",
                params: { horseId: horse.id },
              },
            },
          });
        }
      }

      // Race history impact
      const trackId = race.trackId || race.graded?.trackId;
      const pacePositions = race.sectionalSplits?.map((split) => {
        const entry = split.entries.find((e) => e.horseId === horse.id);
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

          // --- AFFINITY XP GAIN ---
          const xpGain =
            AFFINITY_CONSTANTS.XP_PER_RACE +
            (r.position === 1 ? AFFINITY_CONSTANTS.XP_PER_WIN_BONUS : 0);
          impacts.push({
            id: generateUUID(rng),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "jockey_affinity_gain",
            jockeyId: jockey.id,
            horseId: horse.id,
            xp: xpGain,
            reason: `Raced ${horse.name} to ${r.position}${getOrdinalSuffix(r.position)}`,
          } as any);
          // --- END AFFINITY XP GAIN ---
        }
      }

      // 5. Breeding: "Blue Hen" status tracking for high-performing mares
      if (
        r.position === 1 &&
        (race.graded || race.raceClass === "Stakes" || race.raceClass === "Group")
      ) {
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

        // 6. Breeding: Stallion stud career and fee recalibration
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
        }
      }

      // 7. Jockey performance and stats tracking
      const raceEntry = entriesMap.get(horse.id);
      const prizeSplit = getPrizeSplitForRace(race);
      if (raceEntry?.jockeyId && r.position - 1 < prizeSplit.length) {
        const jockey = jockeyMap.get(raceEntry.jockeyId);

        if (jockey) {
          const winAmount = prizeSplit[r.position - 1] * race.purse;

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
      const horse = horseMap.get(r.horseId);
      return horse && !horse.stableId;
    });
    if (ownedHorses.length > 0) {
      const summary = ownedHorses
        .map((r) => {
          const horse = horseMap.get(r.horseId);
          return `${horse?.name} ${r.position}${getOrdinalSuffix(r.position)}`;
        })
        .join(", ");

      const prize = ownedHorses.reduce((sum, r) => {
        const prizeSplit = getPrizeSplitForRace(race);
        if (r.position - 1 < prizeSplit.length) {
          return sum + Math.round(race.purse * prizeSplit[r.position - 1]);
        }
        return sum;
      }, 0);
      impacts.push({
        id: generateUUID(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "always",
        type: "log",
        text: `${race.name} — ${summary}${prize > 0 ? ` (won ${formatCurrency(prize)})` : ""}`,
        reason: "Race summary",
      } as LogImpact);
    }

    // 10. Narrative: Dynamic news generation for major races
    const newsItem = generateRaceNews(race, result, Array.from(horseMap.values()), newDay, rng!);
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

    return impacts;
  } catch (error) {
    console.error("Error in generateRaceImpacts:", error);
    // Return empty impacts array on error to prevent corruption
    return [];
  }
}
