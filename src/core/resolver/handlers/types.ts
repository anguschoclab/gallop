/**
 * handlers/types.ts - Handler types
 *
 * This file provides base interface for impact handlers.
 *
 * Dependencies: @/game/types (GameState), ../impacts (AnyImpact), immer (WritableDraft)
 * Related files: ../resolver.ts (uses handlers), ./index.ts (exports handlers)
 */

import type {
  GameState,
  Horse,
  Race,
  Stable,
  Jockey,
  HorseCampaign,
  AuctionSale,
} from "@/game/types";
import type { Facility } from "@/core/facilities/facilityTypes";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { AnyImpact } from "../impacts";
import type { WritableDraft } from "immer";

/**
 * Pre-indexed lookup maps for O(1) entity access during impact resolution.
 * Each map is keyed by entity ID (or facility type for facilityMap).
 */
export interface LookupMaps {
  horseMap: Map<string, WritableDraft<Horse>>;
  stableMap: Map<string, WritableDraft<Stable>>;
  campaignMap: Map<string, WritableDraft<HorseCampaign>>;
  raceMap: Map<string, WritableDraft<Race>>;
  jockeyMap: Map<string, WritableDraft<Jockey>>;
  auctionMap: Map<string, WritableDraft<AuctionSale>>;
  facilityMap: Map<string, WritableDraft<Facility>>;
  staffMap: Map<string, WritableDraft<StaffMember>>;
}

/**
 * Base interface for impact handlers
 */
export interface ImpactHandler {
  /**
   * Handle an impact by mutating the draft state
   */
  handle(draft: WritableDraft<GameState>, impact: AnyImpact, lookupMaps?: LookupMaps): void;

  /**
   * Returns true if this handler can process the given impact type
   */
  canHandle(type: string): boolean;
}
