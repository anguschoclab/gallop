/**
 * impacts/horseImpacts.ts - Horse impact types
 *
 * This file provides horse-related impact types including stat changes, energy changes,
 * form changes, fame changes, horse creation, horse transfer, gelding, renaming,
 * aging, health status changes, pasture retirement, horse death, injury, and season history.
 *
 * Dependencies: ./base (Impact), @/game/types (Horse, HealthStatus), ../../history/historyTypes (SeasonRecord, HallOfFameEntry)
 * Related files: ../handlers/HorseHandler.ts (handles impacts), ./index.ts (exports types)
 */

import type { Impact } from "./base";
import type { Horse, HealthStatus } from "@/game/types";
import type { SeasonRecord, HallOfFameEntry } from "../../history/historyTypes";

// Horse stat impact
export interface HorseStatImpact extends Impact {
  type: "horse_stat_change";
  horseId: string;
  stat: "speed" | "stamina" | "acceleration" | "consistency";
  delta: number;
  reason: string;
}

// Energy impact
export interface EnergyImpact extends Impact {
  type: "energy_change";
  horseId: string;
  delta: number;
  reason: string;
}

// Form impact
export interface FormImpact extends Impact {
  type: "form_change";
  horseId: string;
  delta: number;
  reason: string;
}

// Fame impact
export interface FameImpact extends Impact {
  type: "fame_change";
  horseId: string;
  delta: number;
  reason: string;
}

// Horse creation impact
export interface HorseCreationImpact extends Impact {
  type: "horse_creation";
  horse: Horse;
  reason: string;
}

// Horse transfer impact
export interface HorseTransferImpact extends Impact {
  type: "horse_transfer";
  horseId: string;
  fromStableId?: string;
  toStableId?: string;
  price: number;
  reason: string;
}

// Horse deletion impact (for filler horses that should be removed)
export interface HorseDeletionImpact extends Impact {
  type: "horse_deletion";
  horseId: string;
  reason: string;
}

// Gelding impact
export interface GeldingImpact extends Impact {
  type: "gelding";
  horseId: string;
  reason: string;
}

// Rename impact
export interface RenameImpact extends Impact {
  type: "rename";
  horseId: string;
  newName: string;
  reason: string;
}

// Aging impact
export interface AgingImpact extends Impact {
  type: "aging";
  horseId: string;
  previousAge: number;
  newAge: number;
  reason: string;
}

// Health status impact - for injuries and health changes
export interface HealthStatusImpact extends Impact {
  type: "health_status_change";
  horseId: string;
  status: HealthStatus;
  previousStatus: HealthStatus;
  recoveryDay?: number; // When horse will return to healthy (for recovering status)
  reason: string;
}

// Injury impact
export interface InjuryImpact extends Impact {
  type: "injury";
  horseId: string;
  severity: "minor" | "moderate" | "major" | "career-ending";
  injuryType: string;
  recoveryDays: number;
  reason: string;
}

// Pasture retirement impact
export interface PastureRetirementImpact extends Impact {
  type: "pasture_retirement";
  horseId: string;
  retiredOnDay: number;
  reason: string;
}

// Horse death impact
export interface HorseDeathImpact extends Impact {
  type: "horse_death";
  horseId: string;
  cause: string;
  deceasedOnDay: number;
  reason: string;
}

// Hall of Fame induction impact
export interface HallOfFameInductionImpact extends Impact {
  type: "hall_of_fame_induction";
  entry: HallOfFameEntry;
  reason: string;
}

// Season history record impact
export interface SeasonHistoryImpact extends Impact {
  type: "season_history_record";
  record: SeasonRecord;
}

// Blue hen status impact
export interface BlueHenImpact extends Impact {
  type: "blue hen_status";
  horseId: string;
  blueHenStatus: {
    isBlueHen: boolean;
    stakesWinnersProduced: number;
    group1WinnersProduced: number;
    blueHenScore: number;
    foalsProduced?: number;
  };
  reason: string;
}

export type HorseImpact =
  | HorseStatImpact
  | EnergyImpact
  | FormImpact
  | FameImpact
  | HorseCreationImpact
  | HorseTransferImpact
  | HorseDeletionImpact
  | GeldingImpact
  | RenameImpact
  | AgingImpact
  | HealthStatusImpact
  | InjuryImpact
  | PastureRetirementImpact
  | HorseDeathImpact
  | HallOfFameInductionImpact
  | SeasonHistoryImpact
  | BlueHenImpact;
