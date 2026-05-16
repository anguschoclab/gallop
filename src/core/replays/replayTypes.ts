// Race Replay Types - Store and replay race simulations
import { generateUUID } from "../uuid";

/**
 * Position checkpoint for a horse during a race
 */
export interface RaceCheckpoint {
  horseId: string;
  position: number; // Position in the field (1 = leading)
  distance: number; // Distance covered in meters
  time: number; // Elapsed time in seconds
  speed: number; // Current speed in m/s
}

/**
 * Complete race replay data
 */
export interface RaceReplay {
  id: string;
  raceId: string;
  day: number;
  checkpoints: RaceCheckpoint[][];
  /** Array of checkpoints per time step (e.g., every 1 second) */
  /** checkpoints[i] contains all horse positions at time step i */
  winner: string; // horseId of the winner
  finalPositions: { horseId: string; position: number; time: number }[];
  trackId: string;
  distance: number;
}

/**
 * Create a race replay from simulation data.
 *
 * @param raceId - Unique identifier for the race
 * @param day - Game day the race occurred
 * @param checkpoints - Time-series data of all horse positions
 * @param winner - Horse ID of the race winner
 * @param finalPositions - Final positions and times for all runners
 * @param trackId - ID of the track where the race was run
 * @param distance - Total race distance in meters
 * @returns Complete RaceReplay object
 */
export function createRaceReplay(
  raceId: string,
  day: number,
  checkpoints: RaceCheckpoint[][],
  winner: string,
  finalPositions: { horseId: string; position: number; time: number }[],
  trackId: string,
  distance: number,
): RaceReplay {
  return {
    id: generateUUID(),
    raceId,
    day,
    checkpoints,
    winner,
    finalPositions,
    trackId,
    distance,
  };
}

/**
 * Get horse position at a specific time in the replay.
 *
 * @param replay - The race replay data to search
 * @param horseId - ID of the horse to find
 * @param time - Elapsed time in seconds
 * @returns RaceCheckpoint if found, otherwise null
 */
export function getHorsePositionAtTime(
  replay: RaceReplay,
  horseId: string,
  time: number,
): RaceCheckpoint | null {
  const timeIndex = Math.floor(time);
  if (timeIndex >= replay.checkpoints.length) {
    return null;
  }
  return replay.checkpoints[timeIndex].find((c) => c.horseId === horseId) ?? null;
}

/**
 * Get all horse positions at a specific time.
 *
 * @param replay - The race replay data
 * @param time - Elapsed time in seconds
 * @returns Array of checkpoints for all horses at that time step
 */
export function getAllPositionsAtTime(replay: RaceReplay, time: number): RaceCheckpoint[] {
  const timeIndex = Math.floor(time);
  if (timeIndex >= replay.checkpoints.length) {
    return [];
  }
  return replay.checkpoints[timeIndex];
}
