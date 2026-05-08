// Core State - Essential game loop properties
// These fields are always present and the game cannot run without them

import type { Horse, Race } from "../types";
import type { NewsItem } from "@/core/narrative/newsTypes";
import type { HallOfFameEntry, SeasonRecord } from "@/core/history/historyTypes";
import { generateUUID } from "@/game/uuid";

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
  /** Structured news items for the Gallop Gazette */
  news: NewsItem[];
  /** Historical records of major race winners */
  seasonRecords: SeasonRecord[];
  /** Legendary horses preserved for history */
  hallOfFame: HallOfFameEntry[];
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
      news: [
        {
          id: generateUUID(),
          day: 1,
          category: "milestone",
          importance: "high",
          headline: `${profile.stableName} Opens for Business!`,
          body: `The local racing community is abuzz as ${profile.ownerName} officially registers ${profile.stableName}. "We're here to make history," the new owner stated at the morning trials.`,
        },
      ],
      seasonRecords: [],
      hallOfFame: [],
    };
  }

  // Default behavior when no options provided (backward compatibility)
  return {
    day: 1,
    cash: 50000,
    horses: [],
    races: [],
    log: [{ day: 1, text: "Welcome to Gallop! Your stable is now open for business." }],
    news: [
      {
        id: generateUUID(),
        day: 1,
        category: "milestone",
        importance: "high",
        headline: "Welcome to Gallop!",
        body: "Your stable is now open for business. Good luck on the road to the Triple Crown!",
      },
    ],
    seasonRecords: [],
    hallOfFame: [],
  };
}
