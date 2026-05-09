import type { GameState, Horse, Race, Stable } from "@/game/types";
import type { AnyIntent } from "../intents";

/**
 * Context for intent validation
 */
export interface ValidationCache {
  horseMap?: Map<string, Horse>;
  raceMap?: Map<string, Race>;
  stableMap?: Map<string, Stable>;
}

/**
 * Base interface for intent validators
 */
export interface IntentValidator {
  /**
   * Validate an intent against the state
   */
  validate(
    intent: AnyIntent,
    state: GameState,
    cache?: ValidationCache,
  ): { valid: boolean; reason?: string };

  /**
   * Returns true if this validator can process the given intent type
   */
  canValidate(type: AnyIntent["type"]): boolean;
}
