/**
 * outpostTypes.ts - Imperial Expansion Outpost and Branching Facility types
 */

import type { Facility, FacilityType, FacilityLevel } from "./facilityTypes";

export type OutpostRegion =
  | "North America (East)"
  | "North America (West)"
  | "Europe (UK)"
  | "Europe (France)"
  | "Asia (Japan)"
  | "Asia (Hong Kong)"
  | "Australia"
  | "South America";

export type FacilityBranch = "neutral" | "turf" | "dirt";

export interface Outpost {
  id: string;
  name: string;
  region: OutpostRegion;
  totalSlots: number;
  facilities: Record<number, Facility & { branch: FacilityBranch }>; // slotIndex -> Facility
  headTrainerId?: string;
  acclimatizationDays: Record<string, number>; // horseId -> days remaining
}

export const OUTPOST_CONSTANTS = {
  BASE_SLOTS: 12,
  TRANSPORT_FATIGUE_SPIKE: 40, // Spike in fatigue when shipping
  ACCLIMATIZATION_PERIOD: 7, // Days until transport fatigue decays fully

  BRANCH_REQUIREMENTS: {
    TIER_GATE: "premium" as FacilityLevel,
  },

  SLOT_FOOTPRINTS: {
    main_track: 4,
    barn: 2,
    exercise_pool: 2,
    treadmill: 1,
    veterinary_clinic: 2,
    starting_gates: 1,
    transport: 1,
    spa: 2,
    nutrition_lab: 1,
    rehab_center: 2,
    jockey_academy: 2, // New for Imperial
    museum: 2, // New for Imperial
  } as Record<string, number>,
};

/**
 * Check if an outpost is specialized.
 * @param outpost
 */
export function getOutpostSpecialty(outpost: Outpost): FacilityBranch {
  const track = Object.values(outpost.facilities).find((f) => f.type === "main_track");
  return track?.branch || "neutral";
}
