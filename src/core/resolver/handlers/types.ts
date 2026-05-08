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
  handle(draft: WritableDraft<GameState>, impact: AnyImpact): void;
  
  /**
   * Returns true if this handler can process the given impact type
   */
  canHandle(type: string): boolean;
}
