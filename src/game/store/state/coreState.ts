/**
 * state/coreState.ts - Core state management
 *
 * This file provides core game state that is always present and required for the game
 * to function, including day, cash, horses, races, log, news, season records, hall of
 * fame, and archive for historical data.
 *
 * Dependencies: ../types (Horse, Race), @/core/narrative/newsTypes (NewsItem), @/core/history/historyTypes (HallOfFameEntry, SeasonRecord), ../uuid (generateUUID), ../rng (createRng, hashStr)
 * Related files: store.ts (uses core state), types.ts (core types)
 */

// Core State - Essential game loop properties
// These fields are always present and the game cannot run without them

import type { Horse } from "@/core/horse/types";
import type { Race } from "@/core/race/types";
import type { Transaction } from "@/core/transactions/transactionTypes";
import type { Expense } from "@/core/expenses/expenseTypes";
import type { NewsItem } from "@/core/narrative/newsTypes";
import type { HallOfFameEntry, SeasonRecord } from "@/core/history/historyTypes";
import type { InboxMessage } from "@/core/inbox/inboxTypes";
import { generateUUID } from "@/core/uuid";
import { createRng, hashStr } from "@/core/common/rng";
import { generateHorse } from "@/core/horse/horseFactory";
import type { NewGameOptions } from "./types";

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
  /** Optimized lookup map for horses by ID */
  horseMap: Map<string, Horse>;
  /** All scheduled races */
  races: Race[];
  /** Game log for significant events */
  log: { day: number; text: string }[];
  /** Structured news items for the Gallop Gazette */
  news: NewsItem[];
  /** Player's central inbox for critical notifications */
  inbox: InboxMessage[];
  /** Historical records of major race winners */
  seasonRecords: SeasonRecord[];
  /** Legendary horses preserved for history */
  hallOfFame: HallOfFameEntry[];
  /** Historical data moved out of active state for performance */
  archive: {
    horses: Horse[];
    races: Race[];
    pregnancies: any[];
    news: NewsItem[];
  };
  /** Comprehensive ledger of all financial events */
  transactions: Transaction[];
  /** Detailed record of fixed and recurring costs */
  expenses: Expense[];
}

/**
 * Create default core state for new games.
 *
 * When options are provided, uses the backstory to customize starting resources
 * including player horses, cash, and initial news items.
 *
 * @param options - Optional new game options including profile and backstory
 * @returns Core game state with day, cash, horses, races, log, news, season records, hall of fame, and archive
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
      horseMap: new Map(playerHorses.map((h) => [h.id, h])),
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
      inbox: [],
      seasonRecords: [],
      hallOfFame: [],
      archive: {
        horses: [],
        races: [],
        pregnancies: [],
        news: [],
      },
      transactions: [],
      expenses: [],
    };
  }

  // Default behavior when no options provided (backward compatibility)
  return {
    day: 1,
    cash: 50000,
    horses: [],
    horseMap: new Map(),
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
    inbox: [],
    seasonRecords: [],
    hallOfFame: [],
    archive: {
      horses: [],
      races: [],
      pregnancies: [],
      news: [],
    },
    transactions: [],
    expenses: [],
  };
}
