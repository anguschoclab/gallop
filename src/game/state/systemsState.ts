// Systems State - Optional subsystems and advanced features
// Includes NPC stables, jockeys, awards, campaigns, leaderboards, facilities, and pending intents

import type { Stable, ScoutReport, Jockey, HorseCampaign, TripleCrownProgress } from "../types";
import type { RegionalAward, AwardRegion } from "../awards/types";
import type { Leaderboard, SireTrendData } from "@/core/breeding/leaderboardTypes";
import type { AnyIntent } from "@/core/resolver/intents";
import type { PlayerFacilities } from "@/core/facilities";
import type { UserSettings } from "@/core/settings/settingsTypes";
import type { Expense } from "@/core/expenses";
import type { Transaction } from "@/core/transactions";
import type { RaceReplay } from "@/core/replays";
import type { ManagerReputation } from "@/core/reputation";
import type { TransportRequest } from "@/core/transportation";
import { createDefaultPlayerFacilities } from "@/core/facilities";
import { createDefaultUserSettings } from "@/core/settings/settingsTypes";
import { getReputationTier } from "@/core/reputation";

/**
 * Systems state for optional subsystems and advanced features.
 * Most properties are optional as these systems may not be initialized yet.
 */
export interface SystemsState {
  // NPC stable system
  /** All NPC-controlled stables */
  npcStables: Stable[];

  // Jockey system (optional - may not be initialized yet)
  /** Available and contracted jockeys */
  jockeys?: Jockey[];

  // Regional awards system (optional)
  /** Year-end awards by region */
  awards: RegionalAward[];
  /** Last year awards were given per region */
  lastAwardYear?: Record<AwardRegion, number>;
  /** Queue of pending award ceremonies */
  pendingAwardCeremonies?: {
    region: AwardRegion;
    year: number;
    awards: RegionalAward[];
  }[];
  /** Index of current ceremony being displayed */
  currentCeremonyIndex?: number;

  // Industry analytics (optional - computed periodically)
  /** Rolling average of foal-aged horse earnings for AEI calculation */
  industryMeanEarnings?: number;
  /** Day when industry mean was last updated */
  industryEarningsUpdatedDay?: number;

  // Sire leaderboards system (optional)
  /** Leaderboards by category (earnings, winners, etc.) */
  sireLeaderboards?: Record<string, Leaderboard>;
  /** Historical trend data for sire analytics */
  sireTrendHistory?: SireTrendData[];
  /** Day when leaderboards were last updated */
  leaderboardsUpdatedDay?: number;

  // Campaign planner system (optional)
  /** Active horse campaign plans */
  campaigns?: HorseCampaign[];
  /** Historical Triple Crown attempts */
  triplecrownHistory?: TripleCrownProgress[];

  // Facility/infrastructure system (optional)
  /** Player's stable facilities - affects training, recovery, and operations */
  facilities?: PlayerFacilities;
  /** NPC stable facilities by stable ID */
  npcFacilities?: Record<string, PlayerFacilities>;

  // User settings (optional)
  /** Player preferences and game configuration */
  userSettings?: UserSettings;

  // Expense tracking (optional)
  /** Historical expense records by category */
  expenses?: Expense[];

  // Transaction tracking (optional)
  /** Complete cash flow transaction history */
  transactions?: Transaction[];

  // Race replay storage (optional)
  /** Stored race replays for viewing past races */
  replays?: RaceReplay[];

  // Manager reputation (optional)
  /** Player's stable prestige and reputation */
  reputation?: ManagerReputation;

  // Transportation (optional)
  /** Active transport requests and history */
  transports?: TransportRequest[];

  // Intent/impact resolver system (optional)
  /** Pending intents to be resolved */
  pendingIntents?: AnyIntent[];

  // Multi-day advance system
  /** Set when a player race interrupts auto-advance */
  pendingPlayerRaceId?: string;
}

/**
 * Default systems state for new games
 */
export function createDefaultSystemsState(): SystemsState {
  return {
    npcStables: [],
    awards: [],
    facilities: createDefaultPlayerFacilities(1),
    npcFacilities: {},
    userSettings: createDefaultUserSettings(1),
    expenses: [],
    transactions: [],
    replays: [],
    reputation: {
      score: 0,
      tier: "unknown",
      events: [],
      gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
      totalWins: 0,
      yearsActive: 0,
    },
    transports: [],
  };
}
