// Race Replay Types - Store and replay race simulations

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
 * Create a race replay from simulation data
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
    id: crypto.randomUUID(),
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
 * Get horse position at a specific time in the replay
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
 * Get all horse positions at a specific time
 */
export function getAllPositionsAtTime(replay: RaceReplay, time: number): RaceCheckpoint[] {
  const timeIndex = Math.floor(time);
  if (timeIndex >= replay.checkpoints.length) {
    return [];
  }
  return replay.checkpoints[timeIndex];
}
