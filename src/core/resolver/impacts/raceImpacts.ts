/**
 * impacts/raceImpacts.ts - Race impact types
 *
 * This file provides race-related impact types including race entry, race withdrawal,
 * race results, race history, jockey contracts, jockey assignments, jockey silks,
 * jockey stats, claiming, triple crown progress, and tactics.
 *
 * Dependencies: ./base (Impact), @/core/race/engine/raceSnapshotTypes (RaceSnapshot), @/core/race/sharedTypes (RaceClass)
 * Related files: ../handlers/RacingHandler.ts (handles impacts), ./index.ts (exports types)
 */

import type { Impact } from "./base";
import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";
import type { RaceClass } from "@/core/race/sharedTypes";

// Race entry impact
export interface RaceEntryImpact extends Impact {
  type: "race_entry";
  raceId: string;
  horseId: string;
  jockeyId?: string;
  weight?: number;
  entryFee: number;
  ridingFee?: number;
  reason: string;
}

// Race withdrawal impact
export interface RaceWithdrawalImpact extends Impact {
  type: "race_withdrawal";
  raceId: string;
  horseId: string;
  refundAmount: number;
  reason: string;
}

// Race result impact
export interface RaceResultImpact extends Impact {
  type: "race_result";
  raceId: string;
  results: { horseId: string; position: number; time: number }[];
  snapshots?: RaceSnapshot[];
  reason: string;
}

// Race history impact
export interface RaceHistoryImpact extends Impact {
  type: "race_history";
  horseId: string;
  raceHistoryEntry: {
    raceId: string;
    raceName: string;
    position: number;
    day: number;
    beyer?: number;
    grade?: "G1" | "G2" | "G3";
    distance?: number;
    surface?: string;
    purse?: number;
    fieldSize?: number;
    raceClass?: RaceClass;
    barrier?: number;
    lane?: number;
    winAndYouInQualified?: { year: number; raceId: string; raceKey: string };
    pacePositions?: number[]; // Position at each quarter (1-indexed)
    courseVisitCount?: number; // Visit count at time of race
  };
  reason: string;
}

// Claiming impact
export interface ClaimingImpact extends Impact {
  type: "claiming";
  raceId: string;
  horseId: string;
  fromStableId?: string;
  toStableId?: string;
  claimingPrice: number;
  reason: string;
}

// Claim resolution impact
export interface ClaimResolutionImpact extends Impact {
  type: "claimResolution";
  raceId: string;
  horseId: string;
  winningClaimId: string;
  losingClaimIds: string[];
}

// Tactics impact
export interface TacticsImpact extends Impact {
  type: "tactics";
  raceId: string;
  horseId: string;
  tactics: "lead" | "rail" | "outside" | "save" | "late_kick" | "default";
  reason: string;
}

// Pace sample impact
export interface PaceSampleImpact extends Impact {
  type: "pace_sample";
  distance: number;
  time: number;
  reason: string;
}

// Jockey feedback impact
export interface JockeyFeedbackImpact extends Impact {
  type: "jockey_feedback";
  raceId: string;
  horseId: string;
  feedback: string;
  position: number;
  reason: string;
}

export type RaceImpact =
  | RaceEntryImpact
  | RaceWithdrawalImpact
  | RaceResultImpact
  | RaceHistoryImpact
  | ClaimingImpact
  | ClaimResolutionImpact
  | TacticsImpact
  | PaceSampleImpact
  | JockeyFeedbackImpact;
