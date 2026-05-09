/**
 * impacts/breedingImpacts.ts - Breeding impact types
 *
 * This file provides breeding-related impact types including pregnancy creation/update/deletion,
 * stud career updates, blue hen status, and stud fee updates.
 *
 * Dependencies: ./base (Impact), @/game/types (Pregnancy)
 * Related files: ../handlers/BreedingHandler.ts (handles impacts), ./index.ts (exports types)
 */

import type { Impact } from "./base";
import type { Pregnancy } from "@/game/types";

// Pregnancy creation impact
export interface PregnancyCreationImpact extends Impact {
  type: "pregnancy_creation";
  pregnancy: Pregnancy;
  reason: string;
}

// Pregnancy update impact
export interface PregnancyUpdateImpact extends Impact {
  type: "pregnancy_update";
  pregnancyId: string;
  updates: Partial<Pregnancy>;
  reason: string;
}

// Pregnancy deletion impact
export interface PregnancyDeletionImpact extends Impact {
  type: "pregnancy_deletion";
  pregnancyId: string;
  reason: string;
}

// Stud career impact
export interface StudCareerImpact extends Impact {
  type: "stud_career";
  horseId: string;
  studCareer: {
    atStud: boolean;
    standingFee: number;
    previousStandingFee?: number;
    bookSize: number;
    seasonBookings: number;
    lifetimeFoals: number;
    lifetimeStakesFoals: number;
    lifetimeG1Foals: number;
    retiredOnDay: number;
  };
  reason: string;
}

export type BreedingImpact =
  | PregnancyCreationImpact
  | PregnancyUpdateImpact
  | PregnancyDeletionImpact
  | StudCareerImpact;
