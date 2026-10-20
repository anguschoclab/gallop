/**
 * liveResolution.ts - Authoritative live-race resolution transform.
 *
 * Called by SimulationEngine for `resolveLiveRace` commands. Applies the
 * player-facing impacts of a finished live race (cash, prestige, syndicate
 * stakes, journal outcomes) and records a `race_resolution` intent carrying
 * the live session's field, factor ledgers, and replay snapshots. The next
 * advance consumes the intent: it marks the race resolved and applies all
 * remaining impacts, skipping the player-facing ones already applied here
 * (`liveImpactsApplied`) and reusing the supplied runners instead of
 * re-simulating the race.
 *
 * Pure with respect to inputs: returns a new GameState; the caller owns the
 * commit. IDs minted here come from a seeded UUID stream so same-seed
 * replays produce identical state.
 */

import type { GameState } from "@/platform/game/types";
import type { RaceRunner } from "@/domains/race/simulation/types";
import type { RunnerFactorLedger } from "@/domains/race/simulation/factorLedger";
import type { RaceSnapshot } from "@/domains/race/model/engine/raceSnapshotTypes";
import type { RaceResolutionIntent } from "@/platform/resolver/systemIntents";
import { simulateRace } from "@/domains/race/simulation/raceSimulationExecutor";
import { generateRaceImpacts } from "@/domains/race/simulation/raceImpactGenerator";
import { applyImpacts } from "@/platform/resolver/resolver";
import { rngForRace } from "@/domains/race/simulation/rngForRace";
import { isLivePlayerImpact } from "@/domains/race/simulation/liveRaceImpacts";
import { fillJournalOutcomes } from "@/domains/tactics/simulation/strategyJournal";
import { generateUUID, withUuidStream } from "@/shared/uuid/uuid";
import { createRng, hashStr } from "@/shared/common/rng";

export interface LiveRaceResolutionPayload {
  raceId: string;
  result: { horseId: string; position: number; time: number }[];
  /** The live session's simulated field (RaceRunner). When absent the
   *  transform re-simulates once to recover gate/lane/jockey context. */
  runners?: RaceRunner[];
  factorLedgers?: Record<string, RunnerFactorLedger>;
  snapshots?: RaceSnapshot[];
}

/**
 * Apply a live race resolution to `state`, or return `state` unchanged when
 * the race is already resolved/queued — a duplicate delivery is a no-op, so
 * impacts can never be applied twice.
 * @param state
 * @param payload
 */
export function applyLiveRaceResolution(
  state: GameState,
  payload: LiveRaceResolutionPayload,
): GameState {
  const stored = state.races[payload.raceId];
  if (!stored || stored.resolved || stored.cancelled || payload.result.length === 0) {
    return state;
  }
  // generateRaceImpacts can decorate the race (e.g. sectionalSplits) — hand it
  // a shallow copy so the input state object is never mutated in place.
  const race = { ...stored };
  const pending = state.pendingIntents ?? [];
  const alreadyQueued = pending.some(
    (i) => i.type === "race_resolution" && (i as RaceResolutionIntent).raceId === payload.raceId,
  );
  if (alreadyQueued) return state;

  return withUuidStream(createRng(hashStr(`liveResolve_${payload.raceId}_${state.day}`)), () => {
    let impactRunners = payload.runners;
    if (!impactRunners || impactRunners.length === 0) {
      // No live field supplied (headless resolution path) — simulate once to
      // recover the runner context needed for impact generation.
      const npcAIManager = state.npcAIManager
        ? {
            ...state.npcAIManager,
            stableStates: Object.fromEntries(
              Object.entries(state.npcAIManager.stableStates).map(([id, st]) => [id, { ...st }]),
            ),
          }
        : undefined;
      impactRunners = simulateRace(
        race,
        Object.values(state.horses),
        state.jockeys ?? [],
        state.hiredStaff ?? [],
        state.npcStables ?? [],
        npcAIManager,
        state.day,
      ).runners;
    }

    const raceImpacts = generateRaceImpacts({
      race,
      result: payload.result,
      runners: impactRunners,
      horses: Object.values(state.horses),
      jockeys: state.jockeys ?? [],
      newDay: state.day,
      hiredStaff: state.hiredStaff ?? [],
      rng: rngForRace(race),
      snapshots: [],
      calibratedPars: state.calibratedPars || {},
      raceWeatherState: undefined,
      syndicates: state.syndicates,
      narrativeArcs: state.narrativeArcs,
    });
    const applied = applyImpacts({
      state,
      intents: [],
      impacts: raceImpacts.filter(isLivePlayerImpact),
      impactLog: [],
      day: state.day,
    });
    const newState = applied.state as GameState;

    const intent: RaceResolutionIntent = {
      id: generateUUID(),
      entityId: payload.raceId,
      source: "system",
      day: state.day,
      priority: 10,
      type: "race_resolution",
      raceId: payload.raceId,
      results: payload.result,
      runners: impactRunners,
      factorLedgers: payload.factorLedgers,
      snapshots: payload.snapshots,
      liveImpactsApplied: true,
    };

    return {
      ...newState,
      pendingIntents: [...(newState.pendingIntents ?? []), intent],
      strategyJournal: fillJournalOutcomes(
        newState.strategyJournal,
        newState.horses,
        newState.cash,
        newState.day,
        newState.races,
      ),
    };
  });
}
