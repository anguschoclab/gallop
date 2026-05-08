import type { JockeySilk } from "@/core/jockey/types";
import type { Archetype } from "@/core/breeding/archetypes";

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
  id: string;
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
  personality: StablePersonality;
  preferredDistance?: number;
  preferredSurface?: "Turf" | "Dirt" | "Synthetic";
  breedingArchetype?: Archetype["id"];
  staff: Record<import("@/core/staff/staffTypes").StaffRole, string | null>;
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
