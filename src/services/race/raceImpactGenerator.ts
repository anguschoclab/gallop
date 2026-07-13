import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";
import type {
  AnyImpact,
  RaceResultImpact,
  PaceSampleImpact,
  NewsImpact,
} from "@/core/resolver/impacts/index";
import { computeSectionalSplits } from "@/core/race/sectionalAnalysis";
import { generateRaceNews } from "@/services/narrative/newsGenerator";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { calculateClassBonus } from "@/core/common/classBonus";
import type { Race, Horse, Jockey } from "@/game/types";
import {
  generateHealthInjuryImpacts,
  generatePerformanceCareerImpacts,
  generateFinancialBreedingImpacts,
  generateJockeyStatsTrackingImpacts,
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
 * @param props.syndicates
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

    const splitEntryMaps =
      race.sectionalSplits?.map((split) => new Map(split.entries.map((e) => [e.horseId, e]))) ?? [];

    // 2. Process per-horse consequences
    for (const r of result) {
      const horse = horseMap.get(r.horseId);
      if (!horse) continue;

      const runner = runnersMap.get(r.horseId);
      const entry = entriesMap.get(horse.id);

      // Health & injury (energy, injury roll, insurance payout)
      impacts.push(
        ...generateHealthInjuryImpacts(horse, newDay, hiredStaff, injuryWeatherCtx, rng),
      );

      // Performance & career (form, fame, beyer, recovery, pattern jump, race history, TC, trainer)
      const { impacts: perfImpacts, beyerValue } = generatePerformanceCareerImpacts(
        horse,
        r,
        race,
        runner,
        classBonus,
        calibratedPars,
        splitEntryMaps,
        result.length,
        newDay,
        hiredStaff,
        rng,
        entry,
      );
      impacts.push(...perfImpacts);

      // Financial & breeding (prize money, jockey fees, affinity, breeding)
      impacts.push(
        ...generateFinancialBreedingImpacts(
          horse,
          r,
          race,
          entry,
          jockeyMap,
          horseMap,
          syndicates,
          beyerValue,
          newDay,
          rng,
        ),
      );

      // Jockey stats & tracking (career stats, apprentice progression, percentage fees)
      impacts.push(
        ...generateJockeyStatsTrackingImpacts(horse, r, race, entry, jockeyMap, newDay, rng),
      );
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
