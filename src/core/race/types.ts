/**
 * types.ts - Race type definitions
 *
 * This file provides type definitions for race-related concepts including
 * claiming prices, win conditions, weather, track conditions, and the main Race type.
 *
 * Dependencies: ./engine/raceSnapshotTypes (RaceSnapshot), ./sharedTypes (RaceClass)
 * Related files: Used throughout the race module and game state
 */

import { RaceClass } from "./sharedTypes";
import type { RaceSnapshot, PaceSnapshot } from "./engine/raceSnapshotTypes";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";
import type { StewardsInquiry } from "@/core/stewards/stewardTypes";
import type { HorseId, JockeyId, RaceId } from "@/core/types/branded";
import type { HorseOwnership } from "@/core/horse/ownership";

// Re-export RaceClass for use in race generation modules
export { RaceClass };

export type ClaimingPrice =
  | 2000
  | 4000
  | 5000
  | 6000
  | 8000
  | 10000
  | 12000
  | 12500
  | 15000
  | 16000
  | 20000
  | 25000
  | 32000
  | 40000
  | 50000
  | 62500
  | 75000
  | 100000;

export type WinCondition = "none" | "N1X" | "N2X" | "N3L" | "NW1" | "NW2" | "NW3";

export type Weather = "sunny" | "cloudy" | "rainy" | "sunset" | "night";

export type TrackCondition = "fast" | "good" | "soft" | "heavy" | "yielding";

export type RaceEntry = {
  horseId: HorseId;
  ownership: HorseOwnership;
  gate?: number;
  jockeyId?: JockeyId;
  weight?: number;
  withdrawnFromClaiming?: boolean;
  jockeyInstructions?: JockeyInstructions;
};

export type RaceResult = {
  horseId: HorseId;
  position: number;
  time: number;
};

/**
 * Main Race type definition.
 *
 * Represents a complete race with entries, conditions, results, and
 * optional graded race information.
 */
export type Race = {
  id: RaceId;
  name: string;
  day: number;
  distance: number;
  raceClass: RaceClass;
  entryFee: number;
  purse: number;
  minStat?: number;
  fieldSize: number;
  entries: RaceEntry[];
  inquiries?: StewardsInquiry[];
  resolved: boolean;
  cancelled?: boolean;
  cancelledReason?: string;
  result?: RaceResult[];
  snapshots?: RaceSnapshot[];
  paceSnapshots?: PaceSnapshot[];
  graded?: {
    key: string;
    grade: "G1" | "G2" | "G3";
    track: string;
    trackId?: string;
    surface: "Turf" | "Dirt" | "Synthetic";
    country?: string;
    winAndYouInTarget?: string;
    triplecrownKey?: string; // e.g. "usa-tc", "canada-tc", "uk-classics" — groups Triple Crown legs
    requiresInvitation?: boolean;
    inviteDaysAhead?: number;
    invitedHorseIds?: string[];
  };
  /** Manual override for graded race metadata (used by tests and custom races). */
  graded_override?: Partial<{
    key: string;
    grade: "G1" | "G2" | "G3";
    track: string;
    trackId?: string;
    surface: "Turf" | "Dirt" | "Synthetic";
    country?: string;
  }>;

  invitedHorseIds?: string[];
  claimingPrice?: ClaimingPrice;
  winCondition?: WinCondition;
  stateBred?: string;
  handicapWeights?: { horseId: HorseId; weight: number }[];
  isHandicap?: boolean;
  trackId?: string;
  surface?: "Turf" | "Dirt" | "Synthetic";
  handedness?: "left" | "right" | "balanced";
  restrictions?: {
    minAge?: number;
    maxAge?: number;
    gender?:
      | "colt"
      | "filly"
      | "mare"
      | "gelding"
      | "stallion"
      | "horse"
      | "mares"
      | "fillies-and-mares"
      | "colts-and-fillies"
      | "colts"
      | "fillies";
    minAgeNorthern?: number;
    minAgeSouthern?: number;
    nonWinnersOf?: number;
    otherThan?: string[];
  };
  weather?: Weather;
  trackCondition?: TrackCondition;
  claiming?: { price: number };
  sectionalSplits?: SectionalSplit[]; // Computed quarter-mile splits from snapshots
};

// Sectional timing types
export type SectionalEntry = {
  horseId: string;
  splitTime: number; // seconds to run this segment (not cumulative)
  cumulativeTime: number; // seconds from gate to this marker
  rank: number; // field position at this marker (1 = leading)
  velocityMs: number; // average m/s during this segment
  avgSeekContribution?: number;
  avgSpurtContribution?: number;
};

export type SectionalSplit = {
  label: string; // "¼", "½", "¾", "Fin"
  distanceMeters: number; // absolute meters from start
  entries: SectionalEntry[];
};

export type RegionalSystem =
  "north_america" | "europe" | "australia" | "asia" | "south_america" | "japan";
export type GradeLevel = "G1" | "G2" | "G3" | "Listed";

export type RaceRunner = {
  horseId: HorseId;
  name: string;
  silk: string;
  ownership: HorseOwnership;
  jockeyId: JockeyId;
  jockeyName: string;
  gate?: number;
  lane?: number;
  runningStyle?: string;
  jockeyInstructions?: {
    ridingStyle?: string;
    earlyPosition?: string;
    moveTiming?: string;
    aggressiveness?: number;
  };
};
