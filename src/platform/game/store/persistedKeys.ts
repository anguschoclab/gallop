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

import type { GameState } from "@/platform/game/types";

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
export type PersistedStateKey = keyof GameState | "storeVersion";

/**
 * GameState fields that must remain session-local. They are engine-command,
 * pending-work, or in-flight execution records and must never enter either
 * persisted bucket. Adding a GameState field now requires an explicit choice:
 * PERSISTED_KEYS or this list.
 */
export const TRANSIENT_STATE_KEYS: (keyof GameState)[] = [
  "engineGeneration",
  "engineRevision",
  "execution",
  "pendingIntents",
];

export const PERSISTED_KEYS: PersistedStateKey[] = [
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
  "trackLedger",
  "horseLeaderboards",
  "founders",
  "lastFounderUpdateDay",
  "syndicates",
  "staffPool",
  "hiredStaff",
  // Phase 3 — dynamic weather sim per track
  "weather",
  // Inbox / Message Centre — must persist so unread counts survive reloads
  "inbox",
  // Stewards inquiry system
  "stewardsInquiries",
  // Tutorial / guided first-session coach
  "tutorial",
  // Stakes nomination system
  "playerNominations",
  // Player-facing syndication investors
  "syndicateInvestors",
  // Persisted state format version — used to detect incompatible stored data
  "storeVersion",
  // Season standings — last top-10 rank for change detection
  "lastTopTenRank",
  // Share transaction history for syndicates
  "shareTransactions",
  "shareActivityFeed",
  "syndicateValueSnapshots",
  // Player stakes in rival racehorses
  "rivalStakes",
  // Imperial Expansion: player outposts
  "outposts",
  // Sire leaderboards and trend data
  "sireLeaderboards",
  "sireTrendHistory",
  "leaderboardsUpdatedDay",
  "damsireLeaderboard",
  "blueHenLeaderboard",
  // Regional awards tracking
  "lastAwardYear",
  "pendingAwardCeremonies",
  "awardCeremonyInvitations",
  "currentCeremonyIndex",
  // Industry analytics for AEI calculation
  "industryMeanEarnings",
  "industryEarningsUpdatedDay",
  // Career arc narrative tracking
  "narrativeArcs",
  // Solvency / fail-state tracking
  "consecutiveDaysInDebt",
  "solvencyTier",
  "runEnded",
  "runEndSnapshot",
  "solvencyAuditLog",
  // Saved mating plans for breeding season planner
  "savedMatingPlans",
  // World size selection for entity count regulation
  "worldSize",
  // Cash-pressure history snapshots (last 90 days per stable)
  "cashPressureHistory",
  "horseDailyProgress",
  "rankingsHistory",
  "stableRankingsHistory",
  "strategyJournal",
  "stableGoals",
  // Bloodstock exchange: open orders, trade tape and price history
  "exchange",
  // Player auction bidding history
  "playerBiddingHistory",
  // Auto-syndicate preference
  "autoSyndicateEnabled",
  // Market price alerts and pushed trade-notification keys
  "priceAlerts",
  "notifiedTradeKeys",
  // Player's market buying-strategy settings
  "marketStrategy",
];

/**
 * Keys that go into the "meta" bucket (everything except horses, races,
 * npcStables). Derived from PERSISTED_KEYS so the two lists cannot drift.
 */
export const META_KEYS = PERSISTED_KEYS.filter(
  (k): k is Exclude<PersistedStateKey, "storeVersion"> => !DEDICATED_BUCKET_KEYS.has(k),
);
