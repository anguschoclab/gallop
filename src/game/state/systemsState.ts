/**
 * state/systemsState.ts - Systems state management
 *
 * This file provides systems state for optional subsystems and advanced features,
 * including NPC stables, breeding programs, jockeys, awards, campaigns, leaderboards,
 * facilities, user settings, expenses, transactions, replays, reputation, transportation,
 * staff, and pending intents.
 *
 * Dependencies: ../types (Stable, ScoutReport, Jockey, HorseCampaign, TripleCrownProgress, PlayerProfile), @/core/breeding/programs (BreedingProgram), ../awards/types (RegionalAward, AwardRegion), @/core/breeding/leaderboardTypes (Leaderboard, SireTrendData), @/core/resolver/intents (AnyIntent), @/core/facilities (FacilityType, FacilityLevel, PlayerFacilities), @/core/settings/settingsTypes (UserSettings), @/core/expenses (Expense), @/core/transactions (Transaction), @/core/replays (RaceReplay), @/core/reputation (ManagerReputation), @/core/transportation (TransportRequest), @/core/ai/npcCycleAI (NpcAIManager), @/core/staff/staffTypes (StaffMember), @/core/facilities/facilityDefaults (createFacility, createDefaultPlayerFacilities), @/core/settings/settingsTypes (createDefaultUserSettings), @/core/reputation (getReputationTier), ./index (NewGameOptions)
 * Related files: store.ts (uses systems state), npcStables.ts (NPC stable logic)
 */

// Systems State - Optional subsystems and advanced features
// Includes NPC stables, jockeys, awards, campaigns, leaderboards, facilities, and pending intents

import type {
  Stable,
  ScoutReport,
  Jockey,
  HorseCampaign,
  TripleCrownProgress,
  PlayerProfile,
} from "../types";
import type { BreedingProgram } from "@/core/breeding/programs";
import type { RegionalAward, AwardRegion } from "../awards/types";
import type { Leaderboard, SireTrendData } from "@/core/breeding/leaderboardTypes";
import type { AnyIntent } from "@/core/resolver/intents";
import type { FacilityType, FacilityLevel } from "@/core/facilities";
import type { PlayerFacilities } from "@/core/facilities";
import type { UserSettings } from "@/core/settings/settingsTypes";
import type { Expense } from "@/core/expenses";
import type { Transaction } from "@/core/transactions";
import type { RaceReplay } from "@/core/replays";
import type { ManagerReputation } from "@/core/reputation";
import type { TransportRequest } from "@/core/transportation";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { HallOfFameEntry } from "@/core/history/historyTypes";
import { createFacility, createDefaultPlayerFacilities } from "@/core/facilities/facilityDefaults";
import { createDefaultUserSettings } from "@/core/settings/settingsTypes";
import { getReputationTier } from "@/core/reputation";
import type { NewGameOptions } from "./index";

/**
 * Systems state for optional subsystems and advanced features.
 * Most properties are optional as these systems may not be initialized yet.
 */
export interface SystemsState {
  // NPC stable system
  /** All NPC-controlled stables */
  npcStables: Stable[];
  /** NPC AI state manager for learning and personality-driven decisions */
  npcAIManager?: NpcAIManager;

  // Breeding programs system
  /** Breeding programs for stables targeting specific archetypes */
  breedingPrograms: BreedingProgram[];

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

  // Hall of Fame system (optional)
  /** Legendary horses inducted into Hall of Fame */
  hallOfFame?: HallOfFameEntry[];

  // Player profile (optional - set after completing new game wizard)
  /** Player's stable identity from the new game wizard */
  playerProfile?: PlayerProfile;

  // Name tracking system
  /** Set of all horse names currently in use to ensure uniqueness */
  usedHorseNames: string[];
  /** Set of all jockey names currently in use to ensure uniqueness */
  usedJockeyNames: string[];
  
  // Staff system
  /** Pool of staff available for hire */
  staffPool: StaffMember[];
  /** All staff currently hired by any stable (player or NPC) */
  hiredStaff: StaffMember[];
}

/**
 * Create default systems state for new games.
 *
 * When options are provided, uses the backstory to customize facilities and reputation.
 * Otherwise uses default facilities and zero reputation.
 *
 * @param options - Optional new game options including profile and backstory
 * @returns Default systems state with NPC stables, facilities, reputation, and other subsystems initialized
 */
export function createDefaultSystemsState(options?: NewGameOptions): SystemsState {
  if (options) {
    const { profile, backstory } = options;

    // Build facilities from backstory spec (complete replace, not merge)
    const facilities: Partial<PlayerFacilities> = {};
    for (const [type, level] of Object.entries(backstory.facilityUpgrades)) {
      const facilityType = type as FacilityType;
      const facilityLevel = level as FacilityLevel;
      facilities[facilityType] = createFacility(facilityType, facilityLevel, 1);
    }

    return {
      npcStables: [],
      npcAIManager: {
        stableStates: new Map(),
        globalDay: 1,
      },
      breedingPrograms: [],
      awards: [],
      facilities: facilities as PlayerFacilities,
      npcFacilities: {},
      userSettings: createDefaultUserSettings(1),
      expenses: [],
      transactions: [],
      replays: [],
      reputation: {
        score: backstory.reputationScore,
        tier: getReputationTier(backstory.reputationScore),
        events: [],
        gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
        totalWins: 0,
        yearsActive: 0,
      },
      transports: [],
      playerProfile: profile,
      hallOfFame: [],
      usedHorseNames: [],
      usedJockeyNames: [],
      staffPool: [],
      hiredStaff: [],
    };
  }

  // Default behavior when no options provided (backward compatibility)
  return {
    npcStables: [],
    npcAIManager: {
      stableStates: new Map(),
      globalDay: 1,
    },
    breedingPrograms: [],
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
    hallOfFame: [],
    usedHorseNames: [],
    usedJockeyNames: [],
    staffPool: [],
    hiredStaff: [],
  };
}
