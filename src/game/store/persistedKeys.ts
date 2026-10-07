/**
 * store/persistedKeys.ts - Canonical persisted-state key lists
 *
 * Single source of truth for which GameState fields are persisted.
 *
 * - PERSISTED_KEYS drives `partialize` (which fields enter the saved payload).
 * - META_KEYS drives the IDB "meta" bucket (everything except the dedicated
 *   horses/races/npcStables buckets). It is DERIVED from PERSISTED_KEYS so a
 *   newly persisted field can never again pass partialize yet be silently
 *   dropped before the IDB write (the bug class behind storageMetaKeys.test).
 *
 * Dependencies: @/game/types (GameState)
 * Related files: store/index.ts (partialize), store/storage.ts (meta bucket)
 */

import type { GameState } from "@/game/types";

/**
 * Keys routed to their own IDB buckets instead of the meta bucket.
 * `storeVersion` is written into meta explicitly by saveGameStateToIDB.
 */
export const DEDICATED_BUCKET_KEYS: ReadonlySet<PropertyKey> = new Set([
  "horses",
  "races",
  "npcStables",
  "storeVersion",
]);

/**
 * List of state keys that should be persisted to storage.
 * NOTE: "horses" is handled specially by the storage adapter (split into
 * player horses + NPC summaries). It remains here so partialize includes it
 * in the state passed to setItem, where the splitting occurs.
 */
export const PERSISTED_KEYS: (keyof GameState | "storeVersion")[] = [
  "day",
  "cash",
  "horses",
  "market",
  "races",
  "trainingUsed",
  "log",
  "news",
  "archive",
  "pregnancies",
  "activeBreedingProgram",
  "triplecrownHistory",
  "paceSamples",
  "calibratedPars",
  "lastCalibrationDay",
  "npcStables",
  "npcAIManager",
  "scoutReports",
  "scoutingAssignments",

  "auctions",
  "jockeys",
  "awards",
  "campaigns",
  "expenses",
  "transactions",
  "replays",
  "reputation",
  "transports",
  "userSettings",
  "facilities",
  "npcFacilities",
  "playerProfile",
  "privateSaleOffers",
  "claims",
  "breedingPrograms",
  "usedHorseNames",
  "usedJockeyNames",
  "reservedHorseNames",
  "seasonRecords",
  "hallOfFame",
  "trackRecords",
  "trackLedger" as keyof GameState,
  "horseLeaderboards",
  "founders",
  "lastFounderUpdateDay",
  "syndicates",
  "staffPool",
  "hiredStaff",
  // Phase 3 — dynamic weather sim per track
  "weather" as keyof GameState,
  // Inbox / Message Centre — must persist so unread counts survive reloads
  "inbox" as keyof GameState,
  // Stewards inquiry system
  "stewardsInquiries" as keyof GameState,
  // Tutorial / guided first-session coach
  "tutorial" as keyof GameState,
  // Stakes nomination system
  "playerNominations" as keyof GameState,
  // Player-facing syndication investors
  "syndicateInvestors" as keyof GameState,
  // Persisted state format version — used to detect incompatible stored data
  "storeVersion" as keyof GameState,
  // Season standings — last top-10 rank for change detection
  "lastTopTenRank" as keyof GameState,
  // Share transaction history for syndicates
  "shareTransactions" as keyof GameState,
  "shareActivityFeed" as keyof GameState,
  // Imperial Expansion: player outposts
  "outposts" as keyof GameState,
  // Sire leaderboards and trend data
  "sireLeaderboards" as keyof GameState,
  "sireTrendHistory" as keyof GameState,
  "leaderboardsUpdatedDay" as keyof GameState,
  "damsireLeaderboard" as keyof GameState,
  "blueHenLeaderboard" as keyof GameState,
  // Regional awards tracking
  "lastAwardYear" as keyof GameState,
  "pendingAwardCeremonies" as keyof GameState,
  "awardCeremonyInvitations" as keyof GameState,
  "currentCeremonyIndex" as keyof GameState,
  // Industry analytics for AEI calculation
  "industryMeanEarnings" as keyof GameState,
  "industryEarningsUpdatedDay" as keyof GameState,
  // Career arc narrative tracking
  "narrativeArcs" as keyof GameState,
  // Solvency / fail-state tracking
  "consecutiveDaysInDebt" as keyof GameState,
  "solvencyTier" as keyof GameState,
  "runEnded" as keyof GameState,
  "runEndSnapshot" as keyof GameState,
  "solvencyAuditLog" as keyof GameState,
  // Saved mating plans for breeding season planner
  "savedMatingPlans" as keyof GameState,
  // World size selection for entity count regulation
  "worldSize" as keyof GameState,
  // Cash-pressure history snapshots (last 90 days per stable)
  "cashPressureHistory" as keyof GameState,
  "horseDailyProgress" as keyof GameState,
  "strategyJournal" as keyof GameState,
  "stableGoals" as keyof GameState,
  // Bloodstock exchange: open orders, trade tape and price history
  "exchange",
  // Player auction bidding history
  "playerBiddingHistory" as keyof GameState,
  // Auto-syndicate preference
  "autoSyndicateEnabled" as keyof GameState,
  // Market price alerts and pushed trade-notification keys
  "priceAlerts" as keyof GameState,
  "notifiedTradeKeys" as keyof GameState,
  // Player's market buying-strategy settings
  "marketStrategy" as keyof GameState,
];

/**
 * Keys that go into the "meta" bucket (everything except horses, races,
 * npcStables). Derived from PERSISTED_KEYS so the two lists cannot drift.
 */
export const META_KEYS = PERSISTED_KEYS.filter(
  (k) => !DEDICATED_BUCKET_KEYS.has(k),
) as (keyof GameState)[];
