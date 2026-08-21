/**
 * impacts/horseImpacts.ts - Horse impact types
 *
 * This file provides horse-related impact types including stat changes, energy changes,
 * form changes, fame changes, horse creation, horse transfer, gelding, renaming,
 * aging, health status changes, pasture retirement, horse death, injury, and season history.
 *
 * Dependencies: ./base (Impact), @/game/types (Horse, HealthStatus), ../../history/historyTypes (SeasonRecord, HallOfFameEntry, TrackRecord)
 * Related files: ../handlers/HorseHandler.ts (handles impacts), ../handlers/SystemHandler.ts (handles impacts), ./index.ts (exports types)
 */

import type { Impact } from "./base";
import type { Horse, HealthStatus, BlueHenStatus } from "@/game/types";
import type { SeasonRecord, HallOfFameEntry } from "../../history/historyTypes";
import type { HorseId, StableId } from "@/core/types/branded";

// Horse stat impact
export interface HorseStatImpact extends Impact {
  type: "horse_stat_change";
  horseId: HorseId;
  stat: "speed" | "stamina" | "acceleration" | "consistency" | "temperament" | "conformation";
  delta: number;
  reason: string;
}

// Energy impact
export interface EnergyImpact extends Impact {
  type: "energy_change";
  horseId: HorseId;
  delta: number;
  reason: string;
}

// Form impact
export interface FormImpact extends Impact {
  type: "form_change";
  horseId: HorseId;
  delta: number;
  reason: string;
}

// Fame impact
export interface FameImpact extends Impact {
  type: "fame_change";
  horseId: HorseId;
  delta: number;
  reason: string;
}

// Fan count impact
export interface FanCountImpact extends Impact {
  type: "fan_count_change";
  horseId: HorseId;
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
  horseId: HorseId;
  fromStableId?: StableId;
  toStableId?: StableId;
  price: number;
  reason: string;
}

// Horse deletion impact (for filler horses that should be removed)
export interface HorseDeletionImpact extends Impact {
  type: "horse_deletion";
  horseId: HorseId;
  reason: string;
}

// Gelding impact
export interface GeldingImpact extends Impact {
  type: "gelding";
  horseId: HorseId;
  reason: string;
}

// Rename impact
export interface RenameImpact extends Impact {
  type: "rename";
  horseId: HorseId;
  newName: string;
  reason: string;
}

// Aging impact
export interface AgingImpact extends Impact {
  type: "aging";
  horseId: HorseId;
  previousAge: number;
  newAge: number;
  reason: string;
}

// Health status impact - for injuries and health changes
export interface HealthStatusImpact extends Impact {
  type: "health_status_change";
  horseId: HorseId;
  status: HealthStatus;
  previousStatus: HealthStatus;
  recoveryDay?: number; // When horse will return to healthy (for recovering status)
  reason: string;
}

// Injury impact
export interface InjuryImpact extends Impact {
  type: "injury";
  horseId: HorseId;
  severity: "minor" | "moderate" | "major" | "career-ending";
  injuryType: string;
  recoveryDays: number;
  reason: string;
}

// Pasture retirement impact
export interface PastureRetirementImpact extends Impact {
  type: "pasture_retirement";
  horseId: HorseId;
  retiredOnDay: number;
  reason: string;
}

// Horse death impact
export interface HorseDeathImpact extends Impact {
  type: "horse_death";
  horseId: HorseId;
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
  type: "blue_hen_status";
  horseId: HorseId;
  blueHenStatus: BlueHenStatus;
  reason: string;
}

// Recovery impact - for dynamic form mechanic
export interface RecoveryImpact extends Impact {
  type: "recovery_change";
  horseId: HorseId;
  delta: number;
  reason: string;
}

// Fitness impact - for Banister model
export interface FitnessImpact extends Impact {
  type: "fitness_change";
  horseId: HorseId;
  delta: number;
  reason: string;
}

// Fatigue impact - for Banister model
export interface FatigueImpact extends Impact {
  type: "fatigue_change";
  horseId: HorseId;
  delta: number;
  reason: string;
}

// Peaking index impact - for Banister model
export interface PeakingIndexImpact extends Impact {
  type: "peaking_index_update";
  horseId: HorseId;
  value: number;
  reason: string;
}

// Beyer impact - for tracking last race performance
export interface BeyerImpact extends Impact {
  type: "beyer_update";
  horseId: HorseId;
  beyer: number;
  raceDay: number;
  reason: string;
}

// Distance aptitude shift - drift toward races the horse actually runs
export interface DistanceAptitudeImpact extends Impact {
  type: "distance_aptitude_shift";
  horseId: HorseId;
  delta: number;
  newValue: number;
  reason: string;
  preferredDistance?: number;
  raceDistance?: number;
  distanceRatio?: number;
  distanceDeviation?: number;
  distanceMod?: number;
  distanceStaminaMul?: number;
}

export type HorseImpact =
  | HorseStatImpact
  | EnergyImpact
  | FormImpact
  | FameImpact
  | FanCountImpact
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
  | BlueHenImpact
  | RecoveryImpact
  | FitnessImpact
  | FatigueImpact
  | PeakingIndexImpact
  | BeyerImpact
  | DistanceAptitudeImpact;
