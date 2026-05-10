/**
 * handlers/types.ts - Handler types
 *
 * This file provides base interface for impact handlers.
 *
 * Dependencies: @/game/types (GameState), ../impacts (AnyImpact), immer (WritableDraft)
 * Related files: ../resolver.ts (uses handlers), ./index.ts (exports handlers)
 */

import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { WritableDraft } from "immer";

/**
 * Base interface for impact handlers
 */
export interface ImpactHandler {
  /**
   * Handle an impact by mutating the draft state
   */
  handle(
    draft: WritableDraft<GameState>,
    impact: AnyImpact,
    lookupMaps?: {
      horseMap: Map<string, WritableDraft<any>>;
      stableMap: Map<string, WritableDraft<any>>;
      campaignMap: Map<string, WritableDraft<any>>;
      raceMap: Map<string, WritableDraft<any>>;
      jockeyMap: Map<string, WritableDraft<any>>;
      auctionMap: Map<string, WritableDraft<any>>;
      facilityMap: Map<string, WritableDraft<any>>;
      staffMap: Map<string, WritableDraft<any>>;
    },
  ): void;

  /**
   * Returns true if this handler can process the given impact type
   */
  canHandle(type: string): boolean;
}
