/**
 * pipelinePorts.ts - Port interfaces for pipeline dependency injection.
 *
 * Defines the port interfaces that allow pipeline phases to call
 * race-resolution and narrative functions through injected dependencies
 * rather than direct imports. This makes the pipeline testable and
 * allows implementations to be swapped at the composition root.
 *
 * When ports are not injected, phases fall back to the default
 * core implementations (imported directly).
 *
 * Dependencies: @/core/race/raceSimulationExecutor,
 *              @/core/race/raceImpactGenerator,
 *              @/core/auction/claimingResolutionService,
 *              @/core/history/historyService,
 *              @/core/history/hallOfFame,
 *              @/core/history/trackRecords,
 *              @/core/narrative/newsGenerator
 * Related files: src/core/time/pipeline.ts (PipelineContext consumer),
 *               src/core/time/phases/raceResolution.ts (port consumer),
 *               src/core/time/phases/upkeep.ts (port consumer)
 */

import { simulateRace } from "@/core/race/raceSimulationExecutor";
import { generateRaceImpacts } from "@/core/race/raceImpactGenerator";
import { resolveClaimingResolution } from "@/core/auction/claimingResolutionService";
import {
  recordRaceHistory,
  checkHallOfFameInduction,
  checkTrackRecords,
} from "@/core/history/historyService";
import { generateFlavorNews, generateWeeklyFlavorNews } from "@/core/narrative/newsGenerator";

/**
 * Ports for race resolution phase functions.
 * Each port matches the signature of the core implementation.
 */
export interface RaceResolutionPorts {
  /** Simulate a race and produce results. */
  simulate: typeof simulateRace;
  /** Generate impacts from a completed race. */
  generateImpacts: typeof generateRaceImpacts;
  /** Resolve claiming intents for a race. */
  resolveClaiming: typeof resolveClaimingResolution;
  /** Record a race result in seasonal history. */
  recordRaceHistory: typeof recordRaceHistory;
  /** Check if a horse qualifies for Hall of Fame induction. */
  checkHallOfFame: typeof checkHallOfFameInduction;
  /** Check if a race set a new track record. */
  checkTrackRecords: typeof checkTrackRecords;
}

/**
 * Ports for narrative generation functions used by the upkeep phase.
 */
export interface NarrativePorts {
  /** Generate flavor news for the current day. */
  generateFlavor: typeof generateFlavorNews;
  /** Generate weekly flavor news. */
  generateWeeklyFlavor: typeof generateWeeklyFlavorNews;
}

/**
 * Aggregate of all pipeline ports. All fields are optional — phases
 * fall back to direct core imports when a port is not injected.
 */
export interface PipelinePorts {
  /** Ports for the race resolution phase. */
  raceResolution?: RaceResolutionPorts;
  /** Ports for narrative generation (upkeep phase). */
  narrative?: NarrativePorts;
}

/** Default race resolution implementations (core direct imports). */
const DEFAULT_RACE_PORTS: RaceResolutionPorts = {
  simulate: simulateRace,
  generateImpacts: generateRaceImpacts,
  resolveClaiming: resolveClaimingResolution,
  recordRaceHistory,
  checkHallOfFame: checkHallOfFameInduction,
  checkTrackRecords,
};

/** Default narrative implementations (core direct imports). */
const DEFAULT_NARRATIVE_PORTS: NarrativePorts = {
  generateFlavor: generateFlavorNews,
  generateWeeklyFlavor: generateWeeklyFlavorNews,
};

/**
 * Resolve a race-resolution port function, falling back to the default.
 *
 * @param ports - The injected ports (may be undefined).
 * @param key - Which function within the raceResolution group.
 * @returns The injected function if available, otherwise the core default.
 */
export function resolveRacePort<K extends keyof RaceResolutionPorts>(
  ports: PipelinePorts | undefined,
  key: K,
): RaceResolutionPorts[K] {
  return ports?.raceResolution?.[key] ?? DEFAULT_RACE_PORTS[key];
}

/**
 * Resolve a narrative port function, falling back to the default.
 *
 * @param ports - The injected ports (may be undefined).
 * @param key - Which function within the narrative group.
 * @returns The injected function if available, otherwise the core default.
 */
export function resolveNarrativePort<K extends keyof NarrativePorts>(
  ports: PipelinePorts | undefined,
  key: K,
): NarrativePorts[K] {
  return ports?.narrative?.[key] ?? DEFAULT_NARRATIVE_PORTS[key];
}

/**
 * Generic port resolver (for cases where the group is dynamic).
 *
 * @param ports - The injected ports (may be undefined).
 * @param group - Which port group to look up.
 * @param key - Which function within the group.
 * @returns The injected function if available, otherwise the core default.
 */
export function resolvePort(
  ports: PipelinePorts | undefined,
  group: "raceResolution",
  key: keyof RaceResolutionPorts,
): RaceResolutionPorts[keyof RaceResolutionPorts];
export function resolvePort(
  ports: PipelinePorts | undefined,
  group: "narrative",
  key: keyof NarrativePorts,
): NarrativePorts[keyof NarrativePorts];
export function resolvePort(
  ports: PipelinePorts | undefined,
  group: "raceResolution" | "narrative",
  key: string,
): unknown {
  if (group === "raceResolution") {
    return resolveRacePort(ports, key as keyof RaceResolutionPorts);
  }
  return resolveNarrativePort(ports, key as keyof NarrativePorts);
}
