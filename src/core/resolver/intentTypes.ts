/**
 * intentTypes.ts - Base intent type and core action intent definitions
 *
 * Extracted from intents.ts for modularity.
 */

import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";
import type { HorseId, JockeyId, RaceId, StableId } from "@/core/types/branded";

export interface Intent {
  id: string;
  entityId: string;
  source: "player" | "npc" | "system";
  sourceId?: string;
  day: number;
  priority: number;
}

export interface TrainingIntent extends Intent {
  type: "training";
  horseId: HorseId;
  trainingType:
    | "speed"
    | "stamina"
    | "acceleration"
    | "rest"
    | "bullet"
    | "breeze"
    | "gate_work"
    | "swimming"
    | "gallop"
    | "treadmill";
}

export interface RaceEntryIntent extends Intent {
  type: "race_entry";
  raceId: RaceId;
  horseId: HorseId;
  jockeyId?: JockeyId;
  jockeyInstructions?: JockeyInstructions;
  bumpEntryHorseId?: HorseId;
}

export interface RaceWithdrawalIntent extends Intent {
  type: "race_withdrawal";
  raceId: RaceId;
  horseId: HorseId;
}

export interface BreedingIntent extends Intent {
  type: "breeding";
  sireId: HorseId;
  damId: HorseId;
  liveFoalGuarantee: boolean;
  fee?: number;
}

export interface StudRetirementIntent extends Intent {
  type: "stud_retirement";
  horseId: HorseId;
  standingFee: number;
  bookSize: number;
}

export interface PurchaseIntent extends Intent {
  type: "purchase";
  horseId: HorseId;
  price: number;
}

export interface JockeyContractIntent extends Intent {
  type: "jockey_contract";
  jockeyId: JockeyId;
  stableId?: StableId;
  contractUntil?: number;
  bonus?: number;
  stableAffinity?: number;
  isApprentice?: boolean;
  loyalty?: number;
}

export interface JockeyReleaseIntent extends Intent {
  type: "jockey_release";
  jockeyId: JockeyId;
}

export interface JockeyAssignmentIntent extends Intent {
  type: "jockey_assignment";
  raceId: RaceId;
  horseId: HorseId;
  jockeyId: JockeyId;
}

export interface ScoutIntent extends Intent {
  type: "scout";
  horseId: HorseId;
  stableId: StableId;
}

export interface ConsignmentIntent extends Intent {
  type: "consignment";
  horseId: HorseId;
  saleId: string;
  reservePrice: number;
}

export interface ConsignmentWithdrawalIntent extends Intent {
  type: "consignment_withdrawal";
  horseId: HorseId;
  saleId: string;
}

export interface GeldingIntent extends Intent {
  type: "gelding";
  horseId: HorseId;
}

export interface RerollSilkIntent extends Intent {
  type: "reroll_silk";
  jockeyId: JockeyId;
  cost: number;
}

export interface RenameIntent extends Intent {
  type: "rename";
  horseId: HorseId;
  newName: string;
}

export interface TacticsIntent extends Intent {
  type: "tactics";
  raceId: RaceId;
  horseId: HorseId;
  jockeyInstructions: JockeyInstructions;
}
