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
} from "@/platform/game/types";
import type { Facility } from "@/domains/facilities/model/facilityTypes";
import type { StaffMember } from "@/domains/staff/model/staffTypes";
import type { AnyImpact } from "@/platform/resolver/impacts";
import type { WritableDraft } from "immer";
import type { HorseId, JockeyId, RaceId, StableId, StaffId } from "@/shared/types/branded";
import type { CampaignId } from "@/shared/types/branded";
import type { AuctionSaleId } from "@/shared/types/branded";
import type { FacilityId } from "@/shared/types/branded";

/**
 * Pre-indexed lookup maps for O(1) entity access during impact resolution.
 * Each map is keyed by entity ID (or facility type for facilityMap).
 */
export interface LookupMaps {
  horseMap: Map<HorseId, WritableDraft<Horse>>;
  stableMap: Map<StableId, WritableDraft<Stable>>;
  campaignMap: Map<CampaignId, WritableDraft<HorseCampaign>>;
  raceMap: Map<RaceId, WritableDraft<Race>>;
  jockeyMap: Map<JockeyId, WritableDraft<Jockey>>;
  auctionMap: Map<AuctionSaleId, WritableDraft<AuctionSale>>;
  facilityMap: Map<FacilityId, WritableDraft<Facility>>;
  staffMap: Map<StaffId, WritableDraft<StaffMember>>;
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

/**
 * Standard function signature for impact handling functions used in handler dictionaries.
 */
export type ImpactHandlerFunction = (
  draft: WritableDraft<GameState>,
  impact: AnyImpact,
  lookupMaps?: LookupMaps,
) => void;
