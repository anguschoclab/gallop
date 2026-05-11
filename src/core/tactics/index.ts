/**
 * tactics/index.ts - Tactics module
 *
 * This module provides race day jockey instructions functionality.
 *
 * Dependencies: ./tacticsTypes (types and functions)
 * Related files: tacticsTypes.ts (provides types and functions)
 */

// Tactics Module - Race day jockey instructions

export type { RidingStyle, EarlyPosition, MoveTiming, JockeyInstructions } from "./tacticsTypes";

export {
  createDefaultInstructions,
  getRidingStyleDescription,
  getEarlyPositionDescription,
  getMoveTimingDescription,
  calculateStyleBonus,
  formatAggressiveness,
} from "./tacticsTypes";
