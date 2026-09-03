/**
 * types.ts - Stable types
 *
 * This file provides stable-related types including StableTier, StablePersonality,
 * Stable, BackstoryId, and PlayerProfile.
 *
 * Dependencies: @/core/jockey/types (JockeySilk), @/core/breeding/archetypes (Archetype)
 * Related files: stableConfig.ts (uses types), personalityModifiers.ts (uses types)
 */

import type { JockeySilk } from "@/core/jockey/types";
import type { Archetype } from "@/core/breeding/archetypes";
import type { Outpost } from "@/core/facilities/outpostTypes";
import type { StableId } from "@/core/types/branded";

export type StableTier = "elite" | "mid" | "budget";

export type StablePersonality =
  | "aggressive"
  | "conservative"
  | "developer"
  | "win-now"
  | "specialist"
  | "breeder"
  | "trader"
  | "prestige";

export type Stable = {
  id: StableId;
  name: string;
  owner: string;
  tier: StableTier;
  reputation: number;
  founded: number;
  cash: number;
  horses: string[];
  isMajor: boolean;
  colors: { primary: string; secondary: string };
  description?: string;
  country?: string;
  /** Named training yard the stable operates from. */
  yard?: import("./stableYard").StableYard;

  personality: StablePersonality;
  preferredDistance?: number;
  preferredSurface?: "Turf" | "Dirt" | "Synthetic";
  breedingArchetype?: Archetype["id"];
  staff: Record<import("@/core/staff/staffTypes").StaffRole, string | null>;

  // Imperial Expansion: Outposts
  outposts: Outpost[];
};

export type BackstoryId = "inheritor" | "bloodstock_heir" | "claiming_trainer" | "bootstrapper";

export interface PlayerProfile {
  stableName: string;
  ownerName: string;
  silk: JockeySilk;
  backstoryId: BackstoryId;
  founded: number;
  country?: string;
}
