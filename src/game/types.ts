import type { RegionalAward, AwardRegion } from "./awards/types";
import type { CourseSpecification } from "./tracks";
import type { Rng } from "./rng";

export type { CourseSpecification, Rng };

export type HorseStats = {
  speed: number;
  stamina: number;
  acceleration: number;
  consistency: number;
};

export type Conformation = "excellent" | "good" | "fair" | "poor";
export type Temperament = "excellent" | "good" | "fair" | "poor";

// DNA System Types
export type Allele = number; // 1-10 for stats, or encoded for color
export type Locus = [Allele, Allele];

export type ColorGenotype = {
  extension: Locus; // E (black) or e (chestnut)
  agouti: Locus; // A (bay) or a (black)
  gray: Locus; // G (gray) or g (non-gray)
  cream: Locus; // Cr (dilute) or n (normal)
};

export type StatGenotype = {
  speed: Locus[]; // 10 loci
  stamina: Locus[]; // 10 loci
  acceleration: Locus[]; // 10 loci
  consistency: Locus[]; // 10 loci
};

export type PreferenceGenotype = {
  distance: Locus; // Maps to 800-3200m range
  surface: Locus; // Maps to Turf/Dirt/Synthetic bias
  climbing: Locus; // Hill power
  cornering: Locus; // Turn agility
};

export type MarkerGenotype = {
  leopardComplex: "dominant" | "recessive" | "heterozygous";
  csnbRisk: "high" | "low";
  sensoryPerception: "excellent" | "good" | "fair" | "poor";
  signalTransduction: "excellent" | "good" | "fair" | "poor";
  immunity: "excellent" | "good" | "fair" | "poor";
  geneticDiversity: number; // 0.5–1.0
  // Lethal recessives. Both parents carrier → 25% homozygous foal lost at the
  // day-60 (CSNB/HYPP/OLWS) or day-14 (FFS1) checkpoint. FFS1 is real-world
  // ~2% prevalence in TBs. Listed alongside the others so the existing
  // both-carrier screen handles them uniformly.
  lethalCarriers: { csnb: boolean; hypp: boolean; olws: boolean; ffs1: boolean };
};

// Cosmetic markings — purely visual, no gameplay effect, but breeders care.
// All resolved from independent loci so they segregate Mendelian-style.
export type SockHeight = "none" | "sock" | "stocking";
export type FaceWhite = "none" | "star" | "blaze" | "bald";
export type CoatModifier = "silver-dapple" | "sabino" | "splash-white" | null;

export type HorseMarkings = {
  socks: SockHeight;
  face: FaceWhite;
  silverDapple: boolean; // dilute on black-pigmented coats
  sabino: boolean; // irregular white spotting
  splashWhite: boolean; // ventral white pattern
};

export type MarkingsGenotype = {
  socks: Locus;
  face: Locus;
  silverDapple: Locus;
  sabino: Locus;
  splashWhite: Locus;
};

// Health-susceptibility loci. Each resolves to a 0–1 risk score consumed by
// race-sim and lifecycle code. Distinct from `markers` (which are
// fitness/diversity flags) and from `durability` (general injury proneness).
export type HealthGenotype = {
  bleeder: Locus; // EIPH — exercise-induced pulmonary hemorrhage
  roarer: Locus; // laryngeal hemiplegia / wind issues
  ocd: Locus; // osteochondritis dissecans, esp. in 2yo training
  // EFNA5 chromosome-14 haplotype: cartilage/skeletal-development gene.
  // Homozygous-negative carriers have ~32% lower probability of ever racing
  // (real-world Genomic finding). Modeled as a hidden taint locus that gates
  // the resolved `racingViable` flag at horse generation.
  efna5: Locus;
};

export type Genotype = {
  color: ColorGenotype;
  stats: StatGenotype;
  preferences: PreferenceGenotype;
  style: Locus; // Running style bias
  mental: Locus; // Temperament locus
  physical: Locus; // Conformation locus
  durability: Locus; // Injury proneness locus
  size: Locus; // Height/Mass locus
  markers: MarkerGenotype;
  // --- Performance loci (Tier 1+2) ---
  heart: Locus[]; // 5 polygenic loci → cardiovascular efficiency multiplier
  fiberType: Locus; // muscle fiber bias — sprint vs. stayer
  stride: Locus; // long-stride (straights) vs short-stride (turns)
  trackBias: Locus; // left-handed vs right-handed track preference
  mudAptitude: Locus; // performance on soft/heavy going
  // --- Development & training loci (Tier 1) ---
  trainability: Locus; // training-gain probability multiplier
  peakAge: Locus; // when the horse hits peak (early developer vs. late bloomer)
  recovery: Locus; // daily energy regen multiplier
  // --- Reproduction loci (Tier 3) ---
  fertility: Locus; // mare conception % / stallion book-completion %
  foalingEase: Locus; // mare-only — bias on term complication rate
  // --- Cosmetic markings (Tier 4) ---
  markings: MarkingsGenotype;
  // --- Health susceptibility (Tier 6) ---
  health: HealthGenotype;
};

// Running style — preferred position and pace shape during a race.
// E (Early) - Vies for the early lead. Does not rate well behind a pace setter.
// EP (Early/Presser) - Runs 2nd or 3rd early. Can successfully rate behind a leader.
// P (Presser) - Runs in the middle-of-the-pack early. Rarely challenges for lead early.
// S (Sustain/Closer) - Runs from the rear of the pack, surges late.
export type RunningStyle = "E" | "EP" | "P" | "S";
export type JockeyArchetype = "front_runner" | "closer" | "clinical" | "finisher" | "versatile";

export type JockeyStats = {
  pacing: number; // Ability to maintain optimal pace / stamina management
  positioning: number; // Finding the rail, avoiding traffic
  vigor: number; // Final stretch push
  gateSkill: number; // Start of the race
  temperament: number; // Handling nervous horses
};

export type JockeyTrait =
  | "bullring_expert" // Mitigates turn speed loss
  | "hill_specialist" // Reduces stamina drain on gradients
  | "long_straight_pro" // Bonus surge on 500m+ straights
  | "gate_master"; // Higher chance of clean break

// Racing silk colors and pattern for visual identification
export type JockeySilkPattern =
  | "solid"
  | "stripes"
  | "halves"
  | "quarters"
  | "chevron"
  | "diamond"
  | "star"
  | "sash"
  | "hoops";

export type JockeySilk = {
  pattern: JockeySilkPattern;
  primary: string; // hex color (jacket main)
  secondary: string; // hex color (pattern accent)
  cap: string; // hex color (cap)
};

export type BackstoryId = "inheritor" | "bloodstock_heir" | "claiming_trainer" | "bootstrapper";

export interface PlayerProfile {
  stableName: string;
  ownerName: string;
  silk: JockeySilk;
  backstoryId: BackstoryId;
  founded: number;
  country?: string;
}

export type Jockey = {
  id: string;
  name: string;
  age: number;
  archetype: JockeyArchetype;
  stats: JockeyStats;
  traits: JockeyTrait[];
  silk: JockeySilk; // Racing silks (jacket colors and pattern)
  stableId?: string; // If retained by a stable
  contractUntil?: number; // Day the contract ends
  careerStarts: number;
  careerWins: number;
  fame: number; // 0-100, affects hiring cost
  ridingFee: number; // Base fee per race mount
  lastRaceDay?: number; // Day of the last race (to prevent double-booking)
};

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
  lethalCarriers?: { csnb?: boolean; hypp?: boolean; olws?: boolean; ffs1?: boolean };
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
  bookSize: number; // hard cap on coverings per breeding season
  seasonBookings: number; // resets at season start
  lifetimeFoals: number;
  lifetimeStakesFoals: number;
  lifetimeG1Foals: number;
  retiredOnDay: number;
};

export type HorseGender = "colt" | "filly" | "horse" | "mare" | "gelding";

export type Hemisphere = "Northern" | "Southern";

// Weather conditions for races
export type Weather = "sunny" | "cloudy" | "rainy" | "sunset" | "night";

// Track condition affects race performance (5-tier system)
export type TrackCondition = "fast" | "good" | "soft" | "heavy" | "yielding";

// Horse coat colors (for sprite selection)
// Common Thoroughbred colors: bay variants, chestnut variants, dilutes, grays
export type CoatColor =
  | "bay"
  | "black"
  | "chestnut"
  | "dark-bay"
  | "gray"
  | "roan"
  | "palomino"
  | "white"
  | "seal-brown"
  | "liver-chestnut"
  | "buckskin"
  | "dun"
  | "grulla"
  | "champagne";

export type Horse = {
  id: string;
  name: string;
  age: number;
  gender: HorseGender;
  hemisphere: Hemisphere;
  silk: string; // hex color
  stats: HorseStats;
  genotype: Genotype;
  energy: number; // 0-100
  form: number; // -10..+10
  potential: number; // 60-100, soft cap on stat growth
  raceHistory: {
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
  }[];
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
  distanceAptitude: number; // Preferred distance in meters (800..3200)
  surfaceAptitude: Record<"Turf" | "Dirt" | "Synthetic", number>; // 0.8..1.0 multiplier
  climbingAptitude: number; // 0.8..1.2 multiplier for uphill stamina drain
  corneringAptitude: number; // 0.8..1.2 multiplier for turn speed maintenance
  injuryProneness: number; // 0-1 scale, chance of injury per training/race session
  height: number; // Hands (14.0 - 18.0)
  weight: number; // kg (400 - 600)
  lifetimeEarnings: number;
  careerStarts: number;
  careerWins: number;
  winAndYouInQualified?: { raceKey: string; year: number }[]; // Array of {raceKey, year} for Win and You're In qualifications
  // --- Resolved DNA traits (Tier 1+2) ---
  heartScore: number; // 0.85-1.15 multiplier on late-race stamina
  fiberBias: "sprinter" | "balanced" | "stayer";
  strideType: "short" | "balanced" | "long";
  trackPreference: "left" | "balanced" | "right";
  mudAptitude: number; // 0.85-1.15 multiplier on soft/heavy ground
  // --- Resolved DNA traits (development & training) ---
  trainability: number; // 0.5-1.4 multiplier on training-gain probability
  peakAge: number; // 3-7 — age at which the horse hits peak ability
  recoveryRate: number; // 0.7-1.4 multiplier on daily energy regen
  // --- Resolved DNA traits (reproduction) ---
  fertility: number; // 0.7-0.99 conception probability
  foalingEase: number; // 0.7-1.0 multiplier on dam complication risk (lower = easier)
  // --- Cosmetic markings ---
  markings: HorseMarkings;
  // --- Health susceptibility (Tier 6) ---
  bleederRisk: number; // 0-0.15 chance of mid-race fade in long races
  roarerRisk: number; // 0-0.10 chance of stamina collapse at top speed
  ocdRisk: number; // 0-0.10 chance of bone-development injury during 2yo training
  // --- Population-genetics derived ---
  bloodline?: string; // sire-line founder tag (e.g. "Northern Dancer line")
  heterozygosity?: number; // computed at birth/generation; 0-1 fitness modifier
  coefficientOfInbreeding?: number; // Wright's F at conception (0..0.25 typical)
  ancestralHistoryCoefficient?: number; // AHC — quality of ancestor purging (0..1)
  inbreedingTier?: "outcross" | "linebreeding" | "close-inbreeding"; // derived from COI
  prepotency?: number; // 0..1 — heightened ability to transmit traits (high COI = high prepotency)
  // Skeletal viability — homozygous-negative for EFNA5 → never races.
  // When false, the horse is permanently retired before its first race.
  racingViable: boolean;
  // Lifecycle status — tracks retirement and death
  lifecycleStatus: "active" | "retired" | "deceased";
  retiredOnDay?: number; // Day horse was retired to pasture
  deceasedOnDay?: number; // Day horse died
  causeOfDeath?: string; // Description of death cause
};

export type RaceClass =
  // Base classes
  | "Maiden"
  | "MaidenSpecialWeight" // MSW - non-claiming maidens
  | "MaidenClaiming" // MCL - maidens eligible to be claimed
  | "MaidenOptionalClaiming" // MOC - maidens with optional claiming tag
  | "MaidenStakes" // MST - stakes race for non-winners
  | "Allowance"
  | "OptionalClaiming" // OCL/OCH - hybrid allowance/claiming
  | "StarterAllowance" // STR - for horses from claiming company, not eligible to be claimed
  | "StarterHandicap" // SHP - for horses from claiming company with handicap weights
  | "Stakes"
  | "Claiming"
  | "Handicap"
  | "Listed" // Below graded/group level
  | "Group"
  | "Graded";

// Claiming price tiers (in USD)
export type ClaimingPrice =
  | 5000
  | 10000
  | 12500
  | 16000
  | 20000
  | 25000
  | 32000
  | 40000
  | 50000
  | 62500
  | 75000
  | 100000;

// Win condition codes for allowance/condition races
export type WinCondition =
  | "none"
  | "N1X" // Non-winners of 1 allowance race (other than maiden/claiming)
  | "N2X" // Non-winners of 2 allowance races
  | "N3L" // Non-winners of 3 races lifetime
  | "NW1" // Non-winners of 1 race
  | "NW2" // Non-winners of 2 races
  | "NW3"; // Non-winners of 3 races

// Regional classification system
export type RegionalSystem = "north_america" | "europe" | "australia" | "asia" | "south_america";

// Grade level for graded/group/listed stakes
export type GradeLevel = "G1" | "G2" | "G3" | "Listed";

// NPC Stable tier - determines quality of horses and reputation
export type StableTier = "elite" | "mid" | "budget";

// NPC Stable personality - affects AI decision-making
export type StablePersonality =
  | "aggressive" // High risk, enter many races, spend freely
  | "conservative" // Low risk, careful entries, save money
  | "developer" // Focus on young horses, patient growth
  | "win-now" // Focus on proven horses, immediate results
  | "specialist" // Focus on specific distances/surfaces
  | "breeder" // Focus on breeding, keep mares
  | "trader" // Buy/sell frequently, claiming focus
  | "prestige"; // Target graded stakes, reputation over profit

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

// Player Profile - represents the player's stable identity
// (BackstoryId and PlayerProfile are declared earlier in this file.)

// Scout report - player's intelligence on an NPC horse
export type ScoutReport = {
  horseId: string;
  stableId: string;
  day: number;
  accuracy: number; // 0-1, how accurate the scout was
  revealedStats: Partial<HorseStats>;
  notes: string; // flavortext about the horse
  geneticInsight?: {
    distanceMarker?: string;
    surfaceMarker?: string;
    hiddenColorCarrier?: string;
    abilityMarkers?: string[];
  };
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
  entries: {
    horseId: string;
    owned: boolean;
    stableId?: string;
    npc?: boolean;
    barrier?: number;
    jockeyId?: string;
    weight?: number;
    withdrawnFromClaiming?: boolean;
  }[];
  resolved: boolean;
  result?: { horseId: string; position: number; time: number }[];
  graded?: {
    key: string;
    grade: "G1" | "G2" | "G3";
    track: string; // Track name for display
    trackId: string; // Track UUID reference
    surface: "Turf" | "Dirt" | "Synthetic";
    winAndYouInTarget?: string; // Target race for automatic qualification (e.g., "bc-classic")
  };
  // New fields for expanded race types
  claimingPrice?: ClaimingPrice; // For claiming and optional claiming races
  winCondition?: WinCondition; // For allowance and condition races
  stateBred?: string; // Country or state code for restricted races (e.g., "CA", "NY", "Canada")
  handicapWeights?: { horseId: string; weight: number }[]; // Assigned weights for handicap races
  isHandicap?: boolean; // Flag for handicap races
  trackId?: string; // Track UUID reference for all races (not just graded)
  surface?: "Turf" | "Dirt" | "Synthetic"; // Surface for all races
  handedness?: "left" | "right" | "balanced"; // Track handedness for genetic trackPreference integration
  restrictions?: {
    minAge?: number;
    maxAge?: number;
    gender?:
      | "colt"
      | "filly"
      | "horse"
      | "mare"
      | "fillies"
      | "mares"
      | "colts"
      | "fillies-and-mares"
      | "colts-and-fillies";
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
  earlyChecked?: boolean; // day 14
  midChecked?: boolean; // day 60
  twin?: boolean; // 5% twin conception, auto-reduced at early stage
  liveFoalGuarantee?: boolean; // Whether live foal guarantee was purchased
  reBreedingAttempts?: number; // Number of re-breeding attempts used
  refunded?: boolean; // True once Live Foal Guarantee has paid out for this pregnancy — prevents double refunds
};

export type AuctionBidRecord = {
  stableId?: string; // undefined = player
  amount: number;
  tick: number; // monotonic per-lot index
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
  bidHistory?: AuctionBidRecord[];
  breezeSeconds?: number; // 2YO-in-training breeze time (1/8 mile)
};

export type AuctionSaleKind =
  | "weanling"
  | "yearling"
  | "weanling_south"
  | "yearling_south"
  | "mixed"
  | "broodmare"
  | "2yo_training"
  | "racing_age";

export type AuctionSale = {
  id: string;
  name: string;
  day: number;
  kind: AuctionSaleKind;
  lots: AuctionLot[];
  resolved: boolean;
};

// GameState type is now defined in ./state/ for better maintainability
// Re-export from state module for backward compatibility
export type { GameState } from "./state";

// ============= Campaign Planner Types =============

export type CampaignGoalType =
  | "chase_g1"
  | "chase_g2"
  | "chase_g3"
  | "chase_major_race"
  | "maximize_earnings"
  | "develop_maiden"
  | "free_run";

export type CampaignRaceSlot = {
  dayTarget: number;
  dayWindow: number;
  raceId?: string;
  raceKey?: string;
  role: "target" | "prep" | "comeback";
  constraintDistance?: number;
  constraintSurface?: "Turf" | "Dirt" | "Synthetic";
  constraintGradeMin?: "G1" | "G2" | "G3" | "Stakes" | "Allowance";
  notes?: string;
  status: "planned" | "entered" | "completed" | "skipped" | "cancelled";
};

export type CampaignFlag = {
  day: number;
  type:
    | "poor_form"
    | "low_energy"
    | "health_issue"
    | "class_mismatch"
    | "upgrade_available"
    | "trait_confirmed";
  message: string;
  dismissed: boolean;
  suggestion?: Partial<CampaignRaceSlot>;
};

export type ConfirmedAptitudes = {
  surfaceStarts: Record<"Turf" | "Dirt" | "Synthetic", number>;
  distanceBandStarts: Record<"sprint" | "mile" | "intermediate" | "staying", number>;
  surfaceConfirmed?: "Turf" | "Dirt" | "Synthetic";
  distanceBandConfirmed?: "sprint" | "mile" | "intermediate" | "staying";
};

export type HorseCampaign = {
  horseId: string;
  goalType: CampaignGoalType;
  targetRaceKey?: string;
  slots: CampaignRaceSlot[];
  flags: CampaignFlag[];
  restWindowStart?: number;
  restWindowEnd?: number;
  autoManaged: boolean;
  confirmedAptitudes: ConfirmedAptitudes;
  createdDay: number;
  lastReviewedDay: number;
};

export type TripleCrownProgress = {
  horseId: string;
  triplecrownKey: string;
  year: number;
  legs: { raceKey: string; position: number; day: number }[];
  won: boolean;
};
