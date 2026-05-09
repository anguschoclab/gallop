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
