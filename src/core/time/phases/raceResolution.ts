/**
 * phases/raceResolution.ts - Race resolution phase
 *
 * This file provides the race resolution phase that simulates unresolved races
 * and generates all race resolution impacts.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/race/raceResolution (resolveRaces), @/game/constants (PHASE_ORDER_RACE_RESOLUTION), @/core/resolver/impacts/index (AnyImpact), @/services/raceSimulationService (rngForRace), @/game/types (Race), @/core/resolver/intents (ClaimingIntent), @/services/raceSimulationExecutor (simulateRace), @/services/raceImpactGenerator (generateRaceImpacts), @/services/claimingResolutionService (processClaimingResolution), @/services/historyService (recordRaceHistory, checkHallOfFameInduction), @/game/uuid (generateUUID), @/core/ai/npcCycleAI (getOrCreateStableAIState), @/core/ai/raceEntryAI (recordRaceEntryOutcome), @/core/ai/jockeyAI (recordJockeyOutcome), @/core/ai/campaignAI (recordCampaignOutcome)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext, PipelinePhase } from "../pipeline";
import { PHASE_ORDER_RACE_RESOLUTION, RACE_HISTORY_UNGRADED_RETENTION_DAYS } from "@/constants";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import { rngForRace } from "@/services/race/raceSimulationService";
import type { Race } from "@/game/types";
import type { WeatherState } from "@/core/weather/weatherTypes";
import type { ClaimingIntent, RaceResolutionIntent } from "@/core/resolver/intents";
import { simulateRace } from "@/services/race/raceSimulationExecutor";
import { generateRaceImpacts } from "@/services/race/raceImpactGenerator";
import {
  recordNpcAiOutcomes,
  checkTrackRecordAndHof,
  processClaimingForRace,
} from "./raceResolutionHelpers";

/**
 * Race Resolution Phase (Order 70)
 * Simulates unresolved races and generates all race resolution impacts.
 */
export const raceResolutionPhase: PipelinePhase = {
  name: "raceResolution",
  order: PHASE_ORDER_RACE_RESOLUTION,
  skipIf: (context) =>
    !!context.skipRaceResolution || Object.keys(context.state.horses).length === 0,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];
    const updatedRaces: Record<string, Race> = { ...state.races };
    const overdueRaces = Object.values(state.races).filter(
      (r) => !r.resolved && !r.cancelled && r.day <= newDay,
    );

    // PRE-INDEX: Use shared context maps built at pipeline entry
    const { horseMap, jockeyMap } = context;
    const npcStableMap = context.stableMap;
    const hallOfFameIds = new Set((state.hallOfFame ?? []).map((e) => e.horseId));

    // Clone the AI manager so NPC learning updates are applied as a new object.
    const npcAIManager = state.npcAIManager
      ? {
          ...state.npcAIManager,
          stableStates: Object.fromEntries(
            Object.entries(state.npcAIManager.stableStates).map(([id, s]) => [id, { ...s }]),
          ),
        }
      : undefined;

    let resolvedCount = 0;
    // Build a lookup of race_resolution intents so live-resolved races skip re-simulation
    const resolutionIntents = new Map<string, RaceResolutionIntent>();
    for (const intent of intents) {
      if (intent.type === "race_resolution") {
        resolutionIntents.set(intent.raceId, intent as RaceResolutionIntent);
      }
    }

    for (const race of overdueRaces) {
      resolvedCount++;

      // Check if this race was already resolved live (via race_resolution intent)
      const liveIntent = resolutionIntents.get(race.id);
      if (liveIntent && liveIntent.results.length > 0) {
        // Use the live results directly — do NOT re-simulate
        const result = liveIntent.results.map(({ horseId, position, time }) => ({
          horseId,
          position,
          time,
        }));
        updatedRaces[race.id] = { ...race, resolved: true, result };

        // Still generate impacts (prize money, form, etc.) using the live results
        const rng = rngForRace(race);

        // We need runners for impact generation — build them from the race field
        const { runners: impactRunners } = simulateRace(
          race,
          horseMap,
          jockeyMap,
          state.hiredStaff,
          npcStableMap,
          npcAIManager,
          newDay,
          undefined,
          undefined,
          undefined,
        );

        // Generate race impacts using the live results
        const raceImpacts = generateRaceImpacts({
          race,
          result,
          runners: impactRunners,
          horses: horseMap,
          jockeys: jockeyMap,
          newDay,
          hiredStaff: state.hiredStaff ?? [],
          rng,
          snapshots: [],
          calibratedPars: state.calibratedPars || {},
          raceWeatherState: undefined,
          syndicates: state.syndicates,
          narrativeArcs: state.narrativeArcs,
        });

        for (const impact of raceImpacts) {
          impacts.push(impact);
        }

        // Record NPC AI outcomes
        if (npcAIManager) {
          recordNpcAiOutcomes(
            npcAIManager,
            race,
            result,
            impactRunners,
            horseMap,
            jockeyMap,
            npcStableMap,
            newDay,
          );
        }

        // Track record, G1 history & Hall of Fame
        const trackRecordAndHofImpacts = checkTrackRecordAndHof(
          race,
          result,
          impactRunners,
          horseMap,
          newDay,
          state.trackRecords || {},
          hallOfFameIds,
        );
        impacts.push(...trackRecordAndHofImpacts);

        // Claiming resolution
        if (race.claimingPrice) {
          const claimIntents = context.intents.filter(
            (i): i is ClaimingIntent => i.type === "claiming" && i.raceId === race.id,
          );
          const claimingImpacts = processClaimingForRace(
            race,
            claimIntents,
            Object.values(state.horses),
            newDay,
            rng,
          );
          impacts.push(...claimingImpacts);
        }
        continue;
      }

      // Look up current weather for this race's track BEFORE simulating
      // so the granular SimWeatherPattern can be used for weather-preference bonuses.
      const raceTrackId = race.graded?.trackId ?? race.trackId;
      const weatherBuf = raceTrackId ? state.weather?.byTrack?.[raceTrackId] : undefined;
      const raceWeatherState = Array.isArray(weatherBuf)
        ? ((weatherBuf as WeatherState[]).find((w) => w.day === newDay) ??
          (weatherBuf as WeatherState[])[weatherBuf.length - 1])
        : undefined;

      // Simulate race using service
      const { result, runners, snapshots, paceSnapshots } = simulateRace(
        race,
        horseMap,
        jockeyMap,
        state.hiredStaff,
        npcStableMap,
        npcAIManager,
        newDay,
        undefined,
        raceWeatherState?.pattern,
        raceWeatherState?.windKph,
      );

      const rng = rngForRace(race);

      // Update race in the updatedRaces Record
      updatedRaces[race.id] = { ...race, resolved: true, result, snapshots };

      // Record outcomes for NPC AI
      if (npcAIManager) {
        recordNpcAiOutcomes(
          npcAIManager,
          race,
          result,
          runners,
          horseMap,
          jockeyMap,
          npcStableMap,
          newDay,
        );
      }

      // Generate race impacts using service
      const raceImpacts = generateRaceImpacts({
        race,
        result,
        runners,
        horses: horseMap,
        jockeys: jockeyMap,
        newDay,
        hiredStaff: state.hiredStaff ?? [],
        rng,
        snapshots,
        paceSnapshots,
        calibratedPars: state.calibratedPars || {},
        raceWeatherState,
        syndicates: state.syndicates,
        narrativeArcs: state.narrativeArcs,
      });

      for (const impact of raceImpacts) {
        impacts.push(impact);
      }

      // --- Historical Records & Hall of Fame ---
      const trackRecordAndHofImpacts = checkTrackRecordAndHof(
        race,
        result,
        runners,
        horseMap,
        newDay,
        state.trackRecords || {},
        hallOfFameIds,
      );
      impacts.push(...trackRecordAndHofImpacts);

      // Claiming resolution (if race is claiming race)
      if (race.claimingPrice) {
        const claimIntents = context.intents.filter(
          (i): i is ClaimingIntent => i.type === "claiming" && i.raceId === race.id,
        );
        const claimingImpacts = processClaimingForRace(
          race,
          claimIntents,
          Object.values(state.horses),
          newDay,
          rng,
        );
        impacts.push(...claimingImpacts);
      }
    }

    // Cleanup
    const prunedRaces = Object.fromEntries(
      Object.values(updatedRaces)
        .filter(
          (r) =>
            (!r.resolved && !r.cancelled) || r.day >= newDay - RACE_HISTORY_UNGRADED_RETENTION_DAYS,
        )
        .map((r) => [r.id, r]),
    );

    return {
      ...context,
      state: {
        ...state,
        races: prunedRaces,
        ...(npcAIManager && { npcAIManager }),
      },
      impacts: [...(context.impacts || []), ...impacts],
    };
  },
};
