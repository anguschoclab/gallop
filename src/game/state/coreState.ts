// Core State - Essential game loop properties
// These fields are always present and the game cannot run without them

import type { Horse, Race, PlayerProfile } from "../types";

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
  /** Player identity — set when the new-game wizard completes. Undefined means the wizard has not yet run. */
  playerProfile?: PlayerProfile;
}

/**
 * Default core state for new games
 * When options are provided, uses the backstory to customize starting resources
 */
export function createDefaultCoreState(options?: NewGameOptions): CoreState {
  if (options) {
    const { profile, backstory } = options;
    const setupRng = createRng(hashStr(profile.stableName));

    // Generate player horses from backstory spec
    const playerHorses: Horse[] = [];
    for (const spec of backstory.horses) {
      for (let i = 0; i < spec.count; i++) {
        const horse = generateHorse({ tier: spec.tier, owned: true }, setupRng);
        // Set horse silk to player's primary color for visual identification
        horse.silk = profile.silk.primary;
        playerHorses.push(horse);
      }
    }

    return {
      day: 1,
      cash: backstory.startingCash,
      horses: playerHorses,
      races: [],
      log: [
        {
          day: 1,
          text: `${profile.stableName} opens its doors. Welcome, ${profile.ownerName}.`,
        },
      ],
    };
  }

  // Default behavior when no options provided (backward compatibility)
  return {
    day: 1,
    cash: 50000,
    horses: [],
    races: [],
    log: [{ day: 1, text: "Welcome to Gallop! Your stable is now open for business." }],
  };
}
