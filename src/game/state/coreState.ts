// Core State - Essential game loop properties
// These fields are always present and the game cannot run without them

import type { Horse, Race } from "../types";

/**
 * Core game state that is always present and required for the game to function.
 * These represent the fundamental simulation state.
 */
export interface CoreState {
  /** Current day in the simulation */
  day: number;
  /** Player's current cash balance */
  cash: number;
  /** All horses in the game (player owned and NPC owned) */
  horses: Horse[];
  /** All scheduled races */
  races: Race[];
  /** Game log for significant events */
  log: { day: number; text: string }[];
}

/**
 * Default core state for new games
 */
export function createDefaultCoreState(): CoreState {
  return {
    day: 1,
    cash: 50000,
    horses: [],
    races: [],
    log: [{ day: 1, text: "Welcome to Gallop! Your stable is now open for business." }],
  };
}
