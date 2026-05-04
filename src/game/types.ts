import type { RegionalAward, AwardRegion } from "./awards/types";

export type HorseStats = {
  speed: number;
  stamina: number;
  acceleration: number;
  consistency: number;
};

export type Conformation = "excellent" | "good" | "fair" | "poor";
export type Temperament = "excellent" | "good" | "fair" | "poor";

// Running style — preferred position and pace shape during a race.
// front-runner: pacesetter, controls or sets early pace
// stalker: sits 1-4 lengths off the leaders, most flexible
// mid-pack: settles in the middle, can go either way
// closer: held up at the back, surges late
export type RunningStyle = "front-runner" | "stalker" | "mid-pack" | "closer";

// Health status for horses
export type HealthStatus = "healthy" | "covering_sickness" | "recovering" | "other_illness";

// Blue hen status for exceptional broodmares
export interface BlueHenStatus {
  isBlueHen: boolean; // Whether the mare is considered a blue hen
  stakesWinnersProduced: number; // Number of stakes winners produced
  group1WinnersProduced: number; // Number of Group 1 winners produced
  blueHenScore: number; // 0-100 score based on offspring quality
  foalsProduced?: number; // Total number of foals produced
}

// Genetic markers based on horse genome research
export interface GeneticMarkers {
  // Leopard complex (Lp) - spotting pattern linked to TRPM1
  leopardComplex?: "dominant" | "recessive" | "heterozygous";
  // Risk for congenital stationary night blindness (CSNB) - homozygous for Lp
  csnbRisk?: "high" | "low";
  // Sensory perception genes (from genome research)
  sensoryPerception?: "excellent" | "good" | "fair" | "poor";
  // Signal transduction genes (from genome research)
  signalTransduction?: "excellent" | "good" | "fair" | "poor";
  // Immunity genes (from genome research)
  immunity?: "excellent" | "good" | "fair" | "poor";
  // Genetic diversity score (based on breed and pedigree)
  geneticDiversity?: number; // 0-1
  // Lethal recessive carrier flags. Both parents carrier → 25% homozygous foal
  // (auto-stillborn at the day-60 pregnancy checkpoint).
  lethalCarriers?: { csnb?: boolean; hypp?: boolean; olws?: boolean };
}

// Pedigree snapshot recorded on each horse at birth (or at horse generation
// for procedural horses). Recursive structure: a foal carries its sire's and
// dam's pedigrees one level deep — that's enough for a 3-generation walk
// (foal → parent → grandparent → great-grandparent) without recording the
// entire ancestral tree on every horse.
export type Pedigree = {
  sireId?: string;
  damId?: string;
  sireName?: string;
  damName?: string;
  sirePedigree?: Pedigree;
  damPedigree?: Pedigree;
  // True if this slot points to curated foundation stock that lives in
  // pedigreeData.ts rather than the live horses[] array. Lookup falls back
  // to findHorseByName for those.
  sireFromFoundation?: boolean;
  damFromFoundation?: boolean;
};

// Stud career state. Set once a stallion is retired to stud; immutable from
// then on (re-entering racing not supported by design — keeps state simple).
export type StudCareer = {
  atStud: boolean;
  standingFee: number;
  bookSize: number;             // hard cap on coverings per breeding season
  seasonBookings: number;       // resets at season start
  lifetimeFoals: number;
  lifetimeStakesFoals: number;
  lifetimeG1Foals: number;
  retiredOnDay: number;
};

export type HorseGender = "colt" | "filly" | "horse" | "mare";

export type Hemisphere = "Northern" | "Southern";

// Weather conditions for races
export type Weather = "sunny" | "cloudy" | "rainy" | "sunset" | "night";

// Track condition affects race performance
export type TrackCondition = "fast" | "good" | "soft" | "heavy";

// Horse coat colors (for sprite selection)
// Common Thoroughbred colors: bay variants, chestnut variants, dilutes, grays
export type CoatColor =
  | "bay" | "black" | "chestnut" | "dark-bay" | "gray"
  | "roan" | "palomino" | "white"
  | "seal-brown" | "liver-chestnut" | "buckskin" | "dun" | "grulla" | "champagne";

export type Horse = {
  id: string;
  name: string;
  age: number;
  gender: HorseGender;
  hemisphere: Hemisphere;
  silk: string; // hex color
  stats: HorseStats;
  energy: number; // 0-100
  form: number; // -10..+10
  potential: number; // 60-100, soft cap on stat growth
  raceHistory: { raceId: string; raceName: string; position: number; day: number; beyer?: number; grade?: "G1" | "G2" | "G3"; distance?: number; surface?: string; purse?: number; fieldSize?: number }[];
  owned: boolean;
  sireName?: string;
  damName?: string;
  conformation?: Conformation;
  temperament?: Temperament;
  geneticMarkers?: GeneticMarkers;
  healthStatus?: HealthStatus; // Health status of the horse
  healthStatusDay?: number; // Day when health status was set
  blueHenStatus?: BlueHenStatus; // Blue hen status for exceptional broodmares
  foalsProduced?: string[]; // IDs of foals produced by this mare
  coatColor?: CoatColor; // Coat color for race viewer sprites
  lastFoaledDay?: number; // Day the mare most recently foaled — gates re-breeding cooldown
  runningStyle?: RunningStyle; // Preferred race tactics — affects pace shape and stamina use
  // NPC stable system fields
  stableId?: string; // Reference to NPC stable (null for player horses)
  fame: number; // 0-100, affects scouting visibility (famous horses are well-known)
  scoutedStats?: Partial<HorseStats>; // Stats revealed through scouting (fog of war)
  lastScoutedDay?: number; // Day when last scouted
  consignedSaleId?: string; // ID of auction sale this horse is consigned to
  pedigree?: Pedigree; // Snapshot of this horse's parents at conception/generation
  stud?: StudCareer; // Set when stallion is retired to stud
  bruceLoweFamily?: number; // Tail-female family number, resolved & cached
};

export type RaceClass =
  // Base classes
  | "Maiden"
  | "MaidenSpecialWeight"  // MSW - non-claiming maidens
  | "MaidenClaiming"       // MCL - maidens eligible to be claimed
  | "MaidenOptionalClaiming" // MOC - maidens with optional claiming tag
  | "MaidenStakes"         // MST - stakes race for non-winners
  | "Allowance"
  | "OptionalClaiming"     // OCL/OCH - hybrid allowance/claiming
  | "StarterAllowance"     // STR - for horses from claiming company, not eligible to be claimed
  | "StarterHandicap"      // SHP - for horses from claiming company with handicap weights
  | "Stakes"
  | "Claiming"
  | "Handicap"
  | "Listed"               // Below graded/group level
  | "Group"
  | "Graded";

// Claiming price tiers (in USD)
export type ClaimingPrice =
  | 5000 | 10000 | 12500 | 16000 | 20000 | 25000
  | 32000 | 40000 | 50000 | 62500 | 75000 | 100000;

// Win condition codes for allowance/condition races
export type WinCondition =
  | "none"
  | "N1X"  // Non-winners of 1 allowance race (other than maiden/claiming)
  | "N2X"  // Non-winners of 2 allowance races
  | "N3L"  // Non-winners of 3 races lifetime
  | "NW1"  // Non-winners of 1 race
  | "NW2"  // Non-winners of 2 races
  | "NW3"; // Non-winners of 3 races

// Regional classification system
export type RegionalSystem = "north_america" | "europe" | "australia" | "asia" | "south_america";

// Grade level for graded/group/listed stakes
export type GradeLevel = "G1" | "G2" | "G3" | "Listed";

// NPC Stable tier - determines quality of horses and reputation
export type StableTier = "elite" | "mid" | "budget";

// NPC Stable personality - affects AI decision-making
export type StablePersonality = 
  | "aggressive"      // High risk, enter many races, spend freely
  | "conservative"    // Low risk, careful entries, save money
  | "developer"       // Focus on young horses, patient growth
  | "win-now"         // Focus on proven horses, immediate results
  | "specialist"      // Focus on specific distances/surfaces
  | "breeder"         // Focus on breeding, keep mares
  | "trader"          // Buy/sell frequently, claiming focus
  | "prestige";       // Target graded stakes, reputation over profit

// Dosage profile for pedigree analysis (aptitudinal points)
export type DosageProfile = {
  brilliant: number;
  intermediate: number;
  classic: number;
  solid: number;
  professional: number;
};

// Pedigree node for dosage calculation
export type PedigreeNode = {
  horseId?: string;
  name: string;
  generation: number; // 1=sire, 2=grandsire, etc.
  aptitudinalGroup?: string;
};

// NPC Stable - represents an AI-controlled racing operation
export type Stable = {
  id: string;
  name: string;
  owner: string;
  tier: StableTier;
  reputation: number; // 0-100, affects scouting difficulty
  founded: number; // game day founded
  cash: number;
  horses: string[]; // horse IDs belonging to this stable
  isMajor: boolean; // true for named stables, false for filler
  colors: { primary: string; secondary: string }; // stable racing colors
  description?: string; // lore/flavor text for major stables
  country?: string; // home country
  personality: StablePersonality; // AI decision-making style
  // Personality-specific preferences (set during generation)
  preferredDistance?: number; // For specialists (in meters)
  preferredSurface?: "Turf" | "Dirt" | "Synthetic"; // For specialists
};

// Scout report - player's intelligence on an NPC horse
export type ScoutReport = {
  horseId: string;
  stableId: string;
  day: number;
  accuracy: number; // 0-1, how accurate the scout was
  revealedStats: Partial<HorseStats>;
  notes: string; // flavortext about the horse
};

export type Race = {
  id: string;
  name: string;
  day: number;
  distance: number;
  raceClass: RaceClass;
  entryFee: number;
  purse: number;
  minStat?: number;
  fieldSize: number;
  entries: { horseId: string; owned: boolean; stableId?: string; npc?: boolean }[];
  resolved: boolean;
  result?: { horseId: string; position: number; time: number }[];
  graded?: {
    key: string;
    grade: "G1" | "G2" | "G3";
    track: string; // Track name for display
    trackId: string; // Track UUID reference
    surface: "Turf" | "Dirt" | "Synthetic";
  };
  // New fields for expanded race types
  claimingPrice?: ClaimingPrice; // For claiming and optional claiming races
  winCondition?: WinCondition; // For allowance and condition races
  stateBred?: string; // Country or state code for restricted races (e.g., "CA", "NY", "Canada")
  handicapWeights?: { horseId: string; weight: number }[]; // Assigned weights for handicap races
  isHandicap?: boolean; // Flag for handicap races
  trackId?: string; // Track UUID reference for all races (not just graded)
  surface?: "Turf" | "Dirt" | "Synthetic"; // Surface for all races
  restrictions?: {
    minAge?: number;
    maxAge?: number;
    gender?: "colt" | "filly" | "horse" | "mare" | "fillies" | "mares" | "colts" | "fillies-and-mares" | "colts-and-fillies";
    // Hemisphere-specific age restrictions (e.g., for Dubai races)
    minAgeNorthern?: number;
    minAgeSouthern?: number;
    // Win-based conditions for allowance races
    nonWinnersOf?: number; // Number of races horse must not have won
    otherThan?: ("maiden" | "claiming" | "restricted")[]; // Types of wins that don't count toward nonWinnersOf
  };
  weather?: Weather; // Race day weather
  trackCondition?: TrackCondition; // Track surface condition
};

export type Pregnancy = {
  id: string;
  sireId: string;
  damId: string;
  sireName: string;
  damName: string;
  conceivedDay: number;
  dueDay: number;
  resolved: boolean;
  foalId?: string;
  // Multi-checkpoint resolution. Stage advances early → mid → late → delivered
  // as `advanceDay` ticks forward. Each stage has its own loss roll, so a
  // pregnancy can fail at day 14, day 60, or term.
  stage?: "early" | "mid" | "late" | "delivered";
  earlyChecked?: boolean;  // day 14
  midChecked?: boolean;    // day 60
  twin?: boolean;          // 5% twin conception, auto-reduced at early stage
  liveFoalGuarantee?: boolean; // Whether live foal guarantee was purchased
  reBreedingAttempts?: number; // Number of re-breeding attempts used
  refunded?: boolean; // True once Live Foal Guarantee has paid out for this pregnancy — prevents double refunds
};

export type AuctionLot = {
  id: string;
  horseId: string;
  consignorStableId?: string; // undefined = player-consigned
  saleId: string;
  reservePrice: number;
  hammerPrice?: number;
  soldToStableId?: string; // undefined = player won
  passed: boolean;
  withdrawn: boolean;
};

export type AuctionSaleKind = "weanling" | "yearling" | "weanling_south" | "yearling_south";

export type AuctionSale = {
  id: string;
  name: string;
  day: number;
  kind: AuctionSaleKind;
  lots: AuctionLot[];
  resolved: boolean;
};

export type GameState = {
  day: number;
  cash: number;
  horses: Horse[];
  market: Horse[];
  races: Race[];
  trainingUsed: Record<string, number>; // horseId -> count today
  log: { day: number; text: string }[];
  pregnancies: Pregnancy[];
  // Pace samples per 200m distance bucket (winner finish times in seconds).
  paceSamples?: Record<number, number[]>;
  // Calibrated par times per bucket, recomputed each season.
  calibratedPars?: Record<number, number>;
  lastCalibrationDay?: number;
  // NPC stable system
  npcStables: Stable[];
  scoutReports: ScoutReport[];
  // Multi-day advance: set when a player race interrupts auto-advance
  pendingPlayerRaceId?: string;
  // Auction system
  auctions?: AuctionSale[];
  // Industry mean earnings (rolling avg of foal-aged horse career earnings)
  // recomputed once per season. Used for AEI (Average Earnings Index) on the
  // Sire Watch route. 0 until first recompute.
  industryMeanEarnings?: number;
  industryEarningsUpdatedDay?: number;
  // Regional awards system
  awards?: RegionalAward[];
  lastAwardYear?: Record<AwardRegion, number>;
  pendingAwardCeremonies?: {
    region: AwardRegion;
    year: number;
    awards: RegionalAward[];
  }[];
  currentCeremonyIndex?: number;
};
