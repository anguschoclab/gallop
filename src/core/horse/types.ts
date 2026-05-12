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

import type { Genotype } from "@/core/genetics/types";
import type { InsurancePolicy } from "../insurance/insuranceTypes";

export type Hemisphere = "Northern" | "Southern";

export type ActiveInjury = {
  type: string;
  severity: number;
  recoveryDays: number;
  onsetDay: number;
};

/**
 * Per-horse procedural portrait DNA. All numeric fields are dimensionless
 * shape modifiers consumed by ProceduralHorsePortrait. Optional everywhere
 * so legacy saves with partial DNA still type-check; renderers should fall
 * back to defaults when a field is missing.
 */
/**
 * Per-horse procedural portrait DNA. Numeric fields are dimensionless shape
 * modifiers consumed by ProceduralHorsePortrait. All fields are required —
 * generateAppearanceDNA always populates them. Legacy saves missing this
 * data should be re-derived (the portrait cache does this automatically).
 */
export type AppearanceDNA = {
  seed: number;
  headTilt: number;
  headLength: number;
  earSpread: number;
  eyeY: number;
  forelockSweep: number;
  /** Mane wave offsets (4 values along the neck). */
  maneWaves: number[];
  bodyLength: number;
  bodyDepth: number;
  legLength: number;
  tailSweep: number;
  tailFullness: number;
  /** Sock height per leg (front-left, front-right, rear-left, rear-right). */
  socks: Array<"none" | "sock" | "stocking">;
  dapples: Array<{ x: number; y: number; r: number }>;
  flecks: Array<{ x: number; y: number; r: number }>;
  /** Optional face marking variant. */
  face?: string;
  // Forward-compat: allow extra fields without losing checking on the rest.
  [key: string]: unknown;
};

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
export type Horse = {
  id: string;
  name: string;
  sireId?: string;
  damId?: string;
  sireName: string;
  damName: string;
  pedigree: { sireId?: string; damId?: string };
  birthDay: number;
  age: number;
  gender: "colt" | "filly" | "horse" | "mare" | "gelding";
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
  raceHistory: {
    raceId: string;
    raceName: string;
    position: number;
    day: number;
    beyer?: number;
    grade?: string;
    distance?: number;
    surface?: string;
    purse?: number;
    fieldSize?: number;
    raceClass?: string;
    barrier?: number;
    lane?: number;
    winAndYouInQualified?: { year: number; raceId: string; raceKey: string };
  }[];
  fame: number;
  owned: boolean;
  stableId?: string;
  consignedSaleId?: string;
  stud?: {
    atStud: boolean;
    standingFee: number;
    previousStandingFee?: number;
    lifetimeStakesFoals: number;
    lifetimeG1Foals: number;
  };
  distanceAptitude: number;
  surfaceAptitude: Record<"Turf" | "Dirt" | "Synthetic", number>;
  mudAptitude: number;
  peakAge: number;
  strideType: "long" | "short" | "average";
  trackPreference: "left" | "right" | "balanced";
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
  coatColor?: string;
  markings?: string;
  height?: number;
  weight?: number;
  injuryProneness?: number;
  lastScoutedDay?: number;
  conformation?: number;
  temperament?: number;
  healthStatus: "healthy" | "covering_sickness" | "recovering" | "other_illness";
  healthStatusDay: number;
  isBlueHen: boolean;
  blueHenStatus?: {
    isBlueHen: boolean;
    stakesWinnersProduced: number;
    group1WinnersProduced: number;
    blueHenScore: number;
    foalsProduced: number;
  };
  gelded: boolean;
  lifecycleStatus: "active" | "retired" | "deceased";
  retiredOnDay?: number;
  deceasedOnDay?: number;
  createdAtDay?: number;
  causeOfDeath?: string;

  insurancePolicy?: InsurancePolicy;

  appearance?: AppearanceDNA;
  activeInjury?: ActiveInjury;
};
