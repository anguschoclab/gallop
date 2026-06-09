/**
 * state/types.ts - Shared state types
 *
 * This file provides shared types for state initialization and management,
 * helping to resolve circular dependencies between state modules.
 */

import type { PlayerProfile } from "../types";
import type { Backstory } from "@/core/common/backstories";

/**
 * Options for initializing a new game, including player profile and chosen backstory.
 */
export interface NewGameOptions {
  profile: PlayerProfile;
  backstory: Backstory;
}
