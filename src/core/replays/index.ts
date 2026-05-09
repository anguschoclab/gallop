/**
 * replays/index.ts - Race replay module
 *
 * This module provides functionality to store and replay race simulations.
 *
 * Dependencies: ./replayTypes (types and functions)
 * Related files: replayTypes.ts (provides types and functions)
 */

// Race Replay Module - Store and replay race simulations

export type { RaceReplay, RaceCheckpoint } from "./replayTypes";
export { createRaceReplay, getHorsePositionAtTime, getAllPositionsAtTime } from "./replayTypes";
