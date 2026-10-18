/**
 * state/systemsState.ts - Systems state management
 *
 * This file provides systems state for optional subsystems and advanced features,
 * including NPC stables, breeding programs, jockeys, awards, campaigns, leaderboards,
 * facilities, user settings, replays, reputation, transportation,
 * staff, and pending intents.
 *
 * Dependencies: ../types (Stable, ScoutReport, Jockey, HorseCampaign, TripleCrownProgress, PlayerProfile), @/core/breeding/programs (BreedingProgram), ../awards/types (RegionalAward, AwardRegion), @/core/breeding/leaderboardTypes (Leaderboard, SireTrendData), @/core/resolver/intents (AnyIntent), @/core/facilities (FacilityType, FacilityLevel, PlayerFacilities), @/core/settings/settingsTypes (UserSettings), @/core/replays (RaceReplay), @/core/reputation (ManagerReputation), @/core/transportation (TransportRequest), @/domains/agents/simulation/npcCycleAI (NpcAIManager), @/core/staff/staffTypes (StaffMember), @/core/facilities/facilityDefaults (createFacility, createDefaultPlayerFacilities), @/core/settings/settingsTypes (createDefaultUserSettings), @/core/reputation (getReputationTier), ./index (NewGameOptions)
 * Related files: store.ts (uses systems state), npcStables.ts (NPC stable logic)
 */

// Systems State - Optional subsystems and advanced features
// Includes NPC stables, jockeys, awards, campaigns, leaderboards, facilities, and pending intents

import type { Stable, PlayerProfile } from "@/domains/stable/simulation/types";
import type { Jockey } from "@/domains/jockey/model/types";
import type { HorseCampaign } from "@/domains/calendar/model/campaignTypes";
import type { BreedingProgram } from "@/domains/breeding/simulation/programs";
import type { RegionalAward, AwardRegion } from "@/domains/awards/model/types";
import type { AwardCeremonyInvitation } from "@/domains/awards/simulation/invitations";
import type {
  Leaderboard,
  SireTrendData,
  ProgenyLeaderboard,
  DamsireLeaderboard,
  BlueHenLeaderboard,
} from "@/domains/breeding/model/leaderboardTypes";
import type { AnyIntent } from "@/platform/resolver/intents";
import type { FacilityType, FacilityLevel } from "@/domains/facilities/simulation";
import type { PlayerFacilities } from "@/domains/facilities/simulation";
import type { UserSettings } from "@/domains/settings/model/settingsTypes";
import type { RaceReplay } from "@/domains/replays/model/replayTypes";
import type { ManagerReputation } from "@/domains/reputation/simulation";
import type { TransportRequest } from "@/domains/transportation/model/transportationTypes";
import type { NpcAIManager } from "@/domains/agents/simulation/npcCycleAI";
import type { StaffMember } from "@/domains/staff/model/staffTypes";
import type { TrackRecord, FounderRecord } from "@/domains/history/model/historyTypes";
import type { TrackLedgerEntry } from "@/domains/history/simulation/trackLedger";
import type { ReservedNameEntry } from "@/domains/horse/simulation/naming/reservedNames";
import type { StewardsInquiry } from "@/domains/stewards/model/stewardTypes";
import type { Outpost } from "@/domains/facilities/model/outpostTypes";
import type { WeatherState } from "@/domains/weather/model/weatherTypes";
import type { CareerArcState } from "@/domains/narrative/simulation/careerArcGenerator";
import type { CashPressureHistory } from "@/domains/stable/simulation/cashPressureHistory";
import type { TutorialState } from "@/domains/tutorial/model/tutorialTypes";
import { createDefaultTutorialState } from "@/domains/tutorial/model/tutorialTypes";
import {
  createFacility,
  createDefaultPlayerFacilities,
} from "@/domains/facilities/simulation/facilityDefaults";
import { createDefaultUserSettings } from "@/domains/settings/model/settingsTypes";
import { getReputationTier } from "@/domains/reputation/simulation";
import type { NewGameOptions } from "@/platform/game/store/state";
import type { WorldSize } from "@/domains/stable/simulation/worldSizeConfig";
import { DEFAULT_WORLD_SIZE } from "@/domains/stable/simulation/worldSizeConfig";

/**
 * Execution state machine for day advancement. One authoritative record of
 * the in-flight (or interrupted) advance command — replaces the old scattered
 * isAdvancing/pendingPlayerRaceId/pendingAdvanceRemaining flags.
 */
export type AdvanceStatus = "idle" | "running" | "interrupted" | "cancelling" | "failed";

export interface AdvanceExecution {
  status: AdvanceStatus;
  /** Engine command id for the in-flight command. */
  commandId?: string;
  /** Engine revision the command was issued against. */
  baseRevision?: number;
  /** Progress read-model: days simulated so far / total requested. */
  daysCompleted: number;
  totalDays: number;
  /** Race that interrupted the range (player must watch/resolve). */
  interruptRaceId?: import("@/shared/types/branded").RaceId;
  /** Days still owed after the interrupting race resolves (auto-resume). */
  remainingDays?: number;
  /** Terminal error message when status === "failed". */
  error?: string;
}

export const IDLE_EXECUTION: AdvanceExecution = {
  status: "idle",
  daysCompleted: 0,
  totalDays: 0,
};

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
  /** Per-stable cash-pressure snapshot history (last 90 days) for trend UI */
  cashPressureHistory?: CashPressureHistory;
  /** Per-horse end-of-day snapshots of stats, form and price (player horses) */
  /** Player-written race plans and reflections (Strategy Journal) */
  strategyJournal?: import("@/domains/tactics/simulation/strategyJournal").StrategyJournalEntry[];
  /** Player stable campaign goals (net worth + class wins) */
  stableGoals?: import("@/domains/stable/simulation/stableGoals").StableGoals;
  horseDailyProgress?: import("@/domains/horse/simulation/dailyProgress").HorseDailyProgress;
  /** Daily world-rankings snapshots (rank, points, reputation, price) per horse */
  rankingsHistory?: import("@/domains/market/simulation/rankingsHistory").RankingsHistory;
  /** Daily stable-rankings snapshots (rank, points, reputation, price) per stable incl. player */
  stableRankingsHistory?: import("@/domains/stable/simulation/stableRankings").StableRankingsHistory;

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
  npcFacilities?: Record<import("@/shared/types/branded").StableId, PlayerFacilities>;

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

  // Advance execution state machine — the single source of truth for
  // whether the engine is running, interrupted at a player race, or idle.
  /** Execution state for the current/last advance command. */
  execution?: AdvanceExecution;
  /** Monotonic engine commit revision — CAS guard against stale commits. */
  engineRevision?: number;
  /** Session-scoped generation — bumped on new game/load to invalidate
   *  in-flight results from a previous game instance. */
  engineGeneration?: number;

  // Global historical records (optional)
  /** Lifetime track records keyed by trackId_surface_distance */
  trackRecords?: Record<string, TrackRecord>;
  /** Cached progeny/horse leaderboards (Beyer, Earnings, etc.) */
  horseLeaderboards?: Record<string, ProgenyLeaderboard>;
  /** Multi-generational influence records */
  founders?: Record<string, FounderRecord>;
  /** Course-by-course ledger of every resolved race (winner, time, prestige movement) */
  trackLedger?: TrackLedgerEntry[];
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

  // Tutorial / guided first-session coach
  /** Tutorial state tracking the 5-beat onboarding sequence */
  tutorial?: TutorialState;

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
  narrativeArcs?: Record<import("@/shared/types/branded").HorseId, CareerArcState>;

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
      tutorial: createDefaultTutorialState(),
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
    tutorial: createDefaultTutorialState(),
  };
}
