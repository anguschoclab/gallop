/**
 * types.ts - Horse type definitions
 *
 * This file provides type definitions for horse-related concepts including stats,
 * conformation, temperament, running style, health status, injuries, blue hen status,
 * genetic markers, phenotype metrics, and the core Horse interface.
 *
 * Dependencies: @/core/genetics/types (Genotype, AppearanceDNA, Hemisphere)
 * Related files: stats.ts (uses types), healthTypes.ts (injury types)
 */

import type { Genotype, AppearanceDNA } from "@/core/genetics/types";
import type { InsurancePolicy } from "../insurance/insuranceTypes";
import type { PedigreeNode } from "../breeding/types";
import type { InjurySeverity } from "@/core/health/healthSystem";

export type Hemisphere = "Northern" | "Southern";

export type CoatColor =
  | "bay"
  | "dark-bay"
  | "black"
  | "chestnut"
  | "liver-chestnut"
  | "seal-brown"
  | "gray"
  | "white"
  | "roan"
  | "palomino"
  | "buckskin"
  | "dun"
  | "grulla"
  | "champagne";

export type SockHeight = "none" | "sock" | "stocking";
export type FaceWhite = "none" | "star" | "blaze" | "bald";

export interface BlueHenStatus {
  isBlueHen: boolean;
  stakesWinnersProduced: number;
  group1WinnersProduced: number;
  blueHenScore: number;
  foalsProduced: number;
}

export type HealthStatus = "healthy" | "covering_sickness" | "recovering" | "other_illness";
export type HorseGender = "colt" | "filly" | "horse" | "mare" | "gelding";

export interface HorseMarkings {
  socks: SockHeight;
  face: FaceWhite;
  silverDapple?: boolean;
  sabino?: boolean;
  splashWhite?: boolean;
}

export interface GeneticMarkers {
  leopardComplex: "dominant" | "recessive" | "heterozygous";
  csnbRisk: "high" | "low";
  sensoryPerception: "excellent" | "good" | "fair" | "poor";
  signalTransduction: "excellent" | "good" | "fair" | "poor";
  immunity: "excellent" | "good" | "fair" | "poor";
  geneticDiversity: number;
  lethalCarriers: { csnb: boolean; hypp: boolean; olws: boolean; ffs1: boolean };
}

export type ActiveInjury = {
  type: string;
  severity: InjurySeverity;
  recoveryDays: number;
  onsetDay: number;
};

export type StudCareer = {
  atStud: boolean;
  standingFee: number;
  previousStandingFee?: number;
  lifetimeStakesFoals: number;
  lifetimeG1Foals: number;
  bookSize: number;
  seasonBookings: number;
  lifetimeFoals: number;
  retiredOnDay?: number;
};

// AppearanceDNA is now imported from genetics/types

// Horse Type Definitions

/**
 * Horse physical and mental statistics (0-100 scale)
 */
export interface HorseStats {
  speed: number;
  stamina: number;
  acceleration: number;
  temperament: number;
  conformation: number;
  consistency: number;
}

/**
 * Racing styles
 * E: Early runner (prefers to lead)
 * EP: Early/Presser (prefers to track the leader)
 * P: Presser (prefers to stay in the middle of the pack)
 * S: Sustainer/Closer (prefers to stay at the back and close late)
 */
export type RunningStyle = "E" | "EP" | "P" | "S";

/**
 * Core Horse interface - represents a horse in the game population
 */
export interface HorseRaceHistoryEntry {
  raceId: string;
  raceName: string;
  position: number;
  day: number;
  beyer?: number;
  grade?: string;
  distance?: number;
  surface?: string;
  purse?: number;
  purseEarned?: number;
  fieldSize?: number;
  raceClass?: string;
  barrier?: number;
  lane?: number;
  winAndYouInQualified?: { year: number; raceId: string; raceKey: string };
  pacePositions?: number[]; // Position at each quarter (1-indexed)
  courseVisitCount?: number; // Visit count at time of race
  jockeyId?: string; // Jockey that rode the horse in this race
  stableId?: string; // Owner stable at time of race
}

export type Horse = {
  id: string;
  name: string;
  sireId?: string;
  damId?: string;
  sireName: string;
  damName: string;
  pedigree: PedigreeNode;
  birthDay: number;
  age: number;
  gender: HorseGender;
  hemisphere: Hemisphere;
  silk: string;
  stats: HorseStats;
  genotype: Genotype;
  energy: number;
  fitness: number; // Chronic training load (Banister model)
  fatigue: number; // Acute training load (Banister model)
  peakingIndex: number; // Form (Fitness - Fatigue)
  form: number;
  outpostId?: string; // Current location (Imperial Expansion)
  potential: number;
  recoveryPoints: number; // Dynamic form: 0-100, represents horse's physical condition
  lastBeyer?: number; // Track last race performance for bounce calculation
  lastRaceDay?: number; // Track when horse last raced for recovery calculation
  bruceLoweFamily?: number;
  lastFoaledDay?: number;
  lifetimeEarnings: number;
  careerStarts: number;
  careerWins: number;
  healthStatusDay: number; // Day current health status was set
  isBlueHen: boolean;
  gelded: boolean;
  foalingEase: number;
  heterozygosity: number;
  foalsProduced?: string[]; // IDs of foals produced by this mare
  ancestralHistoryCoefficient?: number;
  progenyCount?: number;
  geneticMarkers?: GeneticMarkers;
  fertility?: number;
  coefficientOfInbreeding?: number;
  genomeModifiers?: {
    prepotency: number;
    depressionPenalty: number;
    vigorBonus: number;
    longevityBonus: number;
    ffs1RiskMultiplier: number;
  };
  raceHistory: HorseRaceHistoryEntry[];
  fame: number;
  owned: boolean;
  stableId?: string;
  /** True if this horse was foaled while its dam was owned by the player's stable. Set at birth, never mutated. */
  bredByPlayer?: boolean;
  consignedSaleId?: string;
  stud?: StudCareer;
  distanceAptitude: number;
  surfaceAptitude: Record<"Turf" | "Dirt" | "Synthetic", number>;
  mudAptitude: number;
  corneringAptitude: number;
  climbingAptitude: number;
  peakAge: number;
  strideType: "long" | "short" | "average";
  trackPreference: "left" | "right" | "balanced";
  /** Climate/weather preference: dry, wet, or unaffected ("all"). */
  weatherPreference?: "dry" | "wet" | "all";
  runningStyle: RunningStyle;
  winAndYouInQualified?: { year: number; raceId: string; raceKey: string }[];
  bleederRisk: number;
  roarerRisk: number;
  ocdRisk: number;
  recoveryRate: number;
  trainability: number;
  heartScore: number;
  bloodline: string;
  fiberBias: string;
  coatColor?: CoatColor;
  markings?: HorseMarkings;
  height?: number;
  weight?: number;
  injuryProneness?: number;
  lastScoutedDay?: number;
  conformation?: number;
  temperament?: number;
  healthStatus: HealthStatus;
  blueHenStatus?: BlueHenStatus;
  racingViable: boolean;
  lifecycleStatus: "active" | "retired" | "deceased";
  retiredOnDay?: number;
  deceasedOnDay?: number;
  createdAtDay?: number;
  causeOfDeath?: string;

  insurancePolicy?: InsurancePolicy;

  appearance?: AppearanceDNA;
  activeInjury?: ActiveInjury;
  courseVisits: Record<string, number>; // trackId -> visit count
  phenotypeResolved?: boolean;

  /** Foal-to-racehorse development arc; set on birth via resolveFoaling. */
  developmentArc?: import("./foalDevelopment").FoalDevelopmentArc;
};
