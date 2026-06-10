import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type {
  AnyImpact,
  RaceResultImpact,
  PaceSampleImpact,
  JockeyStatsImpact,
  NewsImpact,
} from "@/core/resolver/impacts/index";
import { computeSectionalSplits } from "@/core/race/sectionalAnalysis";
import { generateRaceNews } from "@/services/newsGenerator";
import { rollForInjury } from "@/core/health/healthSystem";
import { updateApprenticeProgression } from "@/core/apprentice/apprenticeTypes";
import { INSURANCE_CONFIG } from "@/core/insurance/insuranceTypes";
import { calculateBaseHorseValue } from "@/core/horse/pricing";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { Rng } from "@/core/common/rng";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { generateUUID } from "@/core/uuid";
import { calculateClassBonus } from "@/core/common/classBonus";
import type { Race, Horse, Jockey } from "@/game/types";
import { MAX_FAME, GRADED_PRIZE_SPLIT, PRIZE_SPLIT } from "@/constants/game";
import {
  generateEnergyImpact,
  generateFormImpact,
  generateFameImpact,
  generateBeyerAndRecoveryImpacts,
  generateRaceHistoryImpact,
  generateTripleCrownProgressImpact,
  generatePrizeMoneyImpacts,
  generateJockeyFeeImpacts,
  generatePercentageJockeyFeeImpacts,
  generatePatternJumpImpact,
  generateTrainerStatsImpact,
  generateJockeyAffinityImpact,
  generateBreedingImpacts,
  generateRaceSummaryLog,
} from "@/core/race/impacts";

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
      const prizeSplit = race.graded ? GRADED_PRIZE_SPLIT : PRIZE_SPLIT;
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
