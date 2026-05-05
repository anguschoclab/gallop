// Systems State - Optional subsystems and advanced features
// Includes NPC stables, jockeys, awards, campaigns, leaderboards, facilities, and pending intents

import type { Stable, ScoutReport, Jockey, HorseCampaign, TripleCrownProgress } from "../types";
import type { RegionalAward, AwardRegion } from "../awards/types";
import type { Leaderboard, SireTrendData } from "@/core/breeding/leaderboardTypes";
import type { AnyIntent } from "@/core/resolver/intents";
import type { PlayerFacilities } from "@/core/facilities";
import { createDefaultPlayerFacilities } from "@/core/facilities";

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
  awards?: RegionalAward[];
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
    facilities: createDefaultPlayerFacilities(1),
    npcFacilities: {},
  };
}
