/**
 * types.ts - Stable types
 *
 * This file provides stable-related types including StableTier, StablePersonality,
 * Stable, BackstoryId, and PlayerProfile.
 *
 * Dependencies: @/core/jockey/types (JockeySilk), @/core/breeding/archetypes (Archetype)
 * Related files: stableConfig.ts (uses types), personalityModifiers.ts (uses types)
 */

import type { JockeySilk } from "@/domains/jockey/model/types";
import type { Archetype } from "@/domains/breeding/simulation/archetypes";
import type { Outpost } from "@/domains/facilities/model/outpostTypes";
import type { StableId } from "@/shared/types/branded";
import type { PersonIdentity } from "@/domains/person/model/types";

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
  owner: PersonIdentity;
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
  yard?: import("@/domains/stable/simulation/stableYard").StableYard;

  personality: StablePersonality;
  preferredDistance?: number;
  preferredSurface?: "Turf" | "Dirt" | "Synthetic";
  breedingArchetype?: Archetype["id"];

  // Imperial Expansion: Outposts
  outposts: Outpost[];

  /** @deprecated Legacy test-fixture field. Stables no longer persist a staff roster map. */
  staff?: Partial<Record<import("@/domains/staff/model/staffTypes").StaffRole, string | null>>;
};

export type BackstoryId = "inheritor" | "bloodstock_heir" | "claiming_trainer" | "bootstrapper";

export interface PlayerProfile {
  stableName: string;
  owner: PersonIdentity;
  /** @deprecated Legacy test-fixture field. Prefer `owner.biography.displayName`. */
  ownerName?: string;
  silk: JockeySilk;
  backstoryId: BackstoryId;
  founded: number;
  country?: string;
}
