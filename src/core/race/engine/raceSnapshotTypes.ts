/**
 * raceSnapshotTypes.ts - Race snapshot type definitions
 *
 * This file provides type definitions for race replay snapshots, capturing
 * horse positions and velocities at discrete time intervals for visualization
 * and replay purposes.
 *
 * Dependencies: None
 * Related files: simulation.ts (generates snapshots), race.ts (stores snapshots)
 */

/**
 * Horse state at a snapshot timestamp.
 */
export interface HorseSnapshot {
  horseId: string;
  position: number;
  lane: number;
  velocity: number;
}

/**
 * Race state at a snapshot timestamp.
 */
export interface RaceSnapshot {
  t: number;
  horses: HorseSnapshot[];
}

/**
 * Complete race replay data.
 */
export interface RaceReplay {
  raceId: string;
  snapshots: RaceSnapshot[];
  distance: number;
  trackType?: "Turf" | "Dirt" | "Synthetic";
  trackHandedness?: "left" | "right" | "straight";
}
