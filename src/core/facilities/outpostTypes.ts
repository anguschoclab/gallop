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
  id: import("@/core/types/branded").OutpostId;
  name: string;
  region: OutpostRegion;
  totalSlots: number;
  facilities: Record<number, Facility & { branch: FacilityBranch }>; // slotIndex -> Facility
  headTrainerId?: string;
  acclimatizationDays: Record<string, number>; // horseId -> days remaining
}

import { OUTPOST_BASE_SLOTS, TRANSPORT_FATIGUE_SPIKE, ACCLIMATIZATION_PERIOD } from "@/constants";

export const OUTPOST_CONSTANTS = {
  BASE_SLOTS: OUTPOST_BASE_SLOTS,
  TRANSPORT_FATIGUE_SPIKE,
  ACCLIMATIZATION_PERIOD,

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
 * @param outpost - The outpost to check
 * @returns The facility branch type (turf, dirt, or neutral)
 */
export function getOutpostSpecialty(outpost: Outpost): FacilityBranch {
  const track = Object.values(outpost.facilities).find((f) => f.type === "main_track");
  return track?.branch || "neutral";
}
