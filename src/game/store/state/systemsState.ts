/**
 * state/systemsState.ts - Systems state management
 *
 * This file provides systems state for optional subsystems and advanced features,
 * including NPC stables, breeding programs, jockeys, awards, campaigns, leaderboards,
 * facilities, user settings, replays, reputation, transportation,
 * staff, and pending intents.
 *
 * Dependencies: ../types (Stable, ScoutReport, Jockey, HorseCampaign, TripleCrownProgress, PlayerProfile), @/core/breeding/programs (BreedingProgram), ../awards/types (RegionalAward, AwardRegion), @/core/breeding/leaderboardTypes (Leaderboard, SireTrendData), @/core/resolver/intents (AnyIntent), @/core/facilities (FacilityType, FacilityLevel, PlayerFacilities), @/core/settings/settingsTypes (UserSettings), @/core/replays (RaceReplay), @/core/reputation (ManagerReputation), @/core/transportation (TransportRequest), @/core/ai/npcCycleAI (NpcAIManager), @/core/staff/staffTypes (StaffMember), @/core/facilities/facilityDefaults (createFacility, createDefaultPlayerFacilities), @/core/settings/settingsTypes (createDefaultUserSettings), @/core/reputation (getReputationTier), ./index (NewGameOptions)
 * Related files: store.ts (uses systems state), npcStables.ts (NPC stable logic)
 */

// Systems State - Optional subsystems and advanced features
// Includes NPC stables, jockeys, awards, campaigns, leaderboards, facilities, and pending intents

import type { Stable, PlayerProfile } from "@/core/stable/types";
import type { ScoutReport } from "@/core/market/types";
import type { Jockey } from "@/core/jockey/types";
import type { HorseCampaign } from "@/core/calendar/campaignTypes";
import type { BreedingProgram } from "@/core/breeding/programs";
import type { RegionalAward, AwardRegion } from "@/core/awards/types";
import type { AwardCeremonyInvitation } from "@/core/awards/invitations";
import type {
  Leaderboard,
  SireTrendData,
  ProgenyLeaderboard,
  ProgenyLeaderboardType,
  DamsireLeaderboard,
  BlueHenLeaderboard,
} from "@/core/breeding/leaderboardTypes";
import type { AnyIntent } from "@/core/resolver/intents";
import type { FacilityType, FacilityLevel } from "@/core/facilities";
import type { PlayerFacilities } from "@/core/facilities";
import type { UserSettings } from "@/core/settings/settingsTypes";
import type { RaceReplay } from "@/core/replays";
import type { ManagerReputation } from "@/core/reputation";
import type { TransportRequest } from "@/core/transportation";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { TrackRecord, FounderRecord } from "@/core/history/historyTypes";
import type { ReservedNameEntry } from "@/core/horse/naming/reservedNames";
import type { StewardsInquiry } from "@/core/stewards/stewardTypes";
import type { Outpost } from "@/core/facilities/outpostTypes";
import type { WeatherState } from "@/core/weather/weatherTypes";
import type { CareerArcState } from "@/services/narrative/careerArcGenerator";
import { createFacility, createDefaultPlayerFacilities } from "@/core/facilities/facilityDefaults";
import { createDefaultUserSettings } from "@/core/settings/settingsTypes";
import { getReputationTier } from "@/core/reputation";
import type { NewGameOptions } from "./index";
import type { WorldSize } from "@/core/stable/worldSizeConfig";
import { DEFAULT_WORLD_SIZE } from "@/core/stable/worldSizeConfig";

/**
 * Systems state for optional subsystems and advanced features.
 * Most properties are optional as these systems may not be initialized yet.
 */
export interface SystemsState {
  /** Selected world size controlling entity counts (stables, horses, jockeys) */
  worldSize?: WorldSize;

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
  /** Invitations to upcoming regional award ceremonies (player qualified via G1 top-3) */
  awardCeremonyInvitations?: AwardCeremonyInvitation[];

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
  /** Damsire (broodmare sire) leaderboard */
  damsireLeaderboard?: DamsireLeaderboard;
  /** Blue Hen mare leaderboard */
  blueHenLeaderboard?: BlueHenLeaderboard;

  // Campaign planner system (optional)
  /** Active horse campaign plans */
  campaigns?: HorseCampaign[];

  // Facility/infrastructure system (optional)
  /** Player's stable facilities - affects training, recovery, and operations */
  facilities?: PlayerFacilities;
  /** NPC stable facilities by stable ID */
  npcFacilities?: Record<string, PlayerFacilities>;

  // User settings (optional)
  /** Player preferences and game configuration */
  userSettings?: UserSettings;

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

  // Global historical records (optional)
  /** Lifetime track records keyed by trackId_surface_distance */
  trackRecords?: Record<string, TrackRecord>;
  /** Cached progeny/horse leaderboards (Beyer, Earnings, etc.) */
  horseLeaderboards?: Record<string, ProgenyLeaderboard>;
  /** Multi-generational influence records */
  founders?: Record<string, FounderRecord>;
  /** Day of last founder analysis update */
  lastFounderUpdateDay?: number;
  // Player profile (optional - set after completing new game wizard)
  /** Player's stable identity from the new game wizard */
  playerProfile?: PlayerProfile;

  // Name tracking system
  /** Set of all horse names currently in use to ensure uniqueness */
  usedHorseNames: string[];
  /** Set of all jockey names currently in use to ensure uniqueness */
  usedJockeyNames: string[];
  /** Names reserved due to deceased horses (25-year reservation) */
  reservedHorseNames: ReservedNameEntry[];

  // Stewards inquiry system
  /** Active and resolved stewards inquiries */
  stewardsInquiries: StewardsInquiry[];

  // Staff system
  /** Pool of staff available for hire */
  staffPool: StaffMember[];
  /** All staff currently hired by any stable (player or NPC) */
  hiredStaff: StaffMember[];

  // Imperial Expansion: Player outposts
  /** Player-owned outposts for international operations */
  outposts?: Outpost[];

  // Weather system (per-track Markov sim)
  /** Per-track rolling weather history and forecast */
  weather?: {
    byTrack: Record<string, WeatherState[]>;
    forecast: Record<string, WeatherState[]>;
  };

  // Career arc system (optional)
  /** Per-horse career arc states for narrative tracking */
  narrativeArcs?: Record<string, CareerArcState>;

  // Season standings notification system
  /** Player's rank in the top 10 at last check (for change detection) */
  lastTopTenRank?: number;

  // Solvency / fail-state system
  /** Days the player has spent below zero cash without recovering. */
  consecutiveDaysInDebt?: number;
  /** Most recently derived solvency tier (healthy/warning/forced_sale/insolvent). */
  solvencyTier?: "healthy" | "warning" | "forced_sale" | "insolvent";
  /** Once true, the run is over — routes redirect to the epilogue. */
  runEnded?: boolean;
  /** Snapshot of legacy stats captured at insolvency for the epilogue screen. */
  runEndSnapshot?: {
    day: number;
    cash: number;
    horsesOwned: number;
    lifetimeEarnings: number;
    reputationTier: string;
    causeOfDeath: string;
    /** Details on the final creditor seizure, if any. */
    lastSeizure?: {
      horseName: string;
      assessedValue: number;
      salePrice: number;
      deficitAfter: number;
    };
  };
  /** Rolling audit trail of solvency-related cash movements (interest, seizures). */
  solvencyAuditLog?: Array<{
    day: number;
    tier: "healthy" | "warning" | "forced_sale" | "insolvent";
    cashBefore: number;
    cashAfter: number;
    delta: number;
    kind: "interest" | "seizure" | "escalation" | "recovered" | "repayment" | "voluntary_sale";
    detail: string;
  }>;
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
      worldSize: options.worldSize ?? DEFAULT_WORLD_SIZE,
      npcStables: [],
      npcAIManager: {
        stableStates: {},
        globalDay: 1,
        regionalKings: {},
      },
      breedingPrograms: [],
      jockeys: [],
      awards: [],
      campaigns: [],
      facilities: facilities as PlayerFacilities,
      npcFacilities: {},
      userSettings: createDefaultUserSettings(1),
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
      trackRecords: {},
      horseLeaderboards: {},
      founders: {},
      usedHorseNames: [],
      usedJockeyNames: [],
      reservedHorseNames: [],
      stewardsInquiries: [],
      staffPool: [],
      hiredStaff: [],
      outposts: [],
      weather: { byTrack: {}, forecast: {} },
    };
  }

  // Default behavior when no options provided (backward compatibility)
  return {
    worldSize: DEFAULT_WORLD_SIZE,
    npcStables: [],
    npcAIManager: {
      stableStates: {},
      globalDay: 1,
      regionalKings: {},
    },
    breedingPrograms: [],
    jockeys: [],
    awards: [],
    campaigns: [],
    facilities: createDefaultPlayerFacilities(1),
    npcFacilities: {},
    userSettings: createDefaultUserSettings(1),
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
    trackRecords: {},
    horseLeaderboards: {},
    founders: {},
    usedHorseNames: [],
    usedJockeyNames: [],
    reservedHorseNames: [],
    stewardsInquiries: [],
    staffPool: [],
    hiredStaff: [],
    outposts: [],
    weather: { byTrack: {}, forecast: {} },
  };
}
