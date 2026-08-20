/**
 * intentTypes.ts - Base intent type and core action intent definitions
 *
 * Extracted from intents.ts for modularity.
 */

import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";

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
  horseId: string;
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
  raceId: string;
  horseId: string;
  jockeyId?: string;
  jockeyInstructions?: JockeyInstructions;
  bumpEntryHorseId?: string;
}

export interface RaceWithdrawalIntent extends Intent {
  type: "race_withdrawal";
  raceId: string;
  horseId: string;
}

export interface BreedingIntent extends Intent {
  type: "breeding";
  sireId: string;
  damId: string;
  liveFoalGuarantee: boolean;
  fee?: number;
}

export interface StudRetirementIntent extends Intent {
  type: "stud_retirement";
  horseId: string;
  standingFee: number;
  bookSize: number;
}

export interface PurchaseIntent extends Intent {
  type: "purchase";
  horseId: string;
  price: number;
}

export interface JockeyContractIntent extends Intent {
  type: "jockey_contract";
  jockeyId: string;
  stableId?: string;
  contractUntil?: number;
  bonus?: number;
  stableAffinity?: number;
  isApprentice?: boolean;
  loyalty?: number;
}

export interface JockeyReleaseIntent extends Intent {
  type: "jockey_release";
  jockeyId: string;
}

export interface JockeyAssignmentIntent extends Intent {
  type: "jockey_assignment";
  raceId: string;
  horseId: string;
  jockeyId: string;
}

export interface ScoutIntent extends Intent {
  type: "scout";
  horseId: string;
  stableId: string;
}

export interface ConsignmentIntent extends Intent {
  type: "consignment";
  horseId: string;
  saleId: string;
  reservePrice: number;
}

export interface ConsignmentWithdrawalIntent extends Intent {
  type: "consignment_withdrawal";
  horseId: string;
  saleId: string;
}

export interface GeldingIntent extends Intent {
  type: "gelding";
  horseId: string;
}

export interface RerollSilkIntent extends Intent {
  type: "reroll_silk";
  jockeyId: string;
  cost: number;
}

export interface RenameIntent extends Intent {
  type: "rename";
  horseId: string;
  newName: string;
}

export interface TacticsIntent extends Intent {
  type: "tactics";
  raceId: string;
  horseId: string;
  jockeyInstructions: JockeyInstructions;
}
