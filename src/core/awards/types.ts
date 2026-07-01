/**
 * awards/types.ts - Regional awards type definitions and constants
 *
 * This file provides type definitions for regional awards (North America, Europe,
 * Asia-Pacific, South America) based on real-world horse racing awards like Eclipse,
 * Cartier, Australian, Sovereign, and JRA awards.
 *
 * Dependencies: @/core/data/gradedRaces (Continent)
 * Related files: scoring.ts (uses these types for calculation), index.ts (re-exports)
 */

// Regional Awards System - Types and Constants
// Based on real-world horse racing awards: Eclipse (USA), Cartier (Europe), Australian, Sovereign (Canada), JRA (Japan)

export type AwardRegion = "north_america" | "europe" | "asia_pacific" | "south_america";

// North American Categories (Eclipse Awards style)
export type NorthAmericanCategory =
  | "horse_of_the_year"
  | "champion_2yo_male"
  | "champion_2yo_female"
  | "champion_3yo_male"
  | "champion_3yo_female"
  | "champion_older_dirt_male"
  | "champion_older_dirt_female"
  | "champion_sprint_male"
  | "champion_sprint_female"
  | "champion_turf_male"
  | "champion_turf_female"
  | "champion_steeplechase";

// European Categories (Cartier Awards style)
export type EuropeanCategory =
  | "horse_of_the_year"
  | "champion_2yo_colt"
  | "champion_2yo_filly"
  | "champion_3yo_colt"
  | "champion_3yo_filly"
  | "champion_older_horse" // Combined gender - unique to Europe
  | "champion_sprinter_eu"
  | "champion_stayer"
  | "award_of_merit";

// Asia-Pacific Categories (Australian/JRA style)
export type AsiaPacificCategory =
  | "horse_of_the_year"
  | "champion_2yo"
  | "champion_3yo"
  | "champion_sprinter_apac"
  | "champion_middle_distance" // 1400-2000m - unique
  | "champion_stayer"
  | "champion_filly_or_mare" // Combined - unique
  | "champion_international" // Best performer outside home country
  | "champion_trainer"; // Human award

// South American Categories (Gran Premio style)
export type SouthAmericanCategory =
  | "horse_of_the_year"
  | "potrillo_del_ano" // 2YO colt
  | "potranca_del_ano" // 2YO filly
  | "campeon_3yo_macho"
  | "campeona_3yo_hembras"
  | "campeon_mayor"
  | "campeon_velocidad" // Sprint
  | "campeon_fondo"; // Stayer

export type RegionalAwardCategory =
  | NorthAmericanCategory
  | EuropeanCategory
  | AsiaPacificCategory
  | SouthAmericanCategory;

export interface RegionalAward {
  id: string;
  year: number;
  region: AwardRegion;
  category: RegionalAwardCategory;
  horseId: string;
  horseName: string;
  stableId?: string; // undefined = player horse
  points: number;
  runnerUpId?: string;
  runnerUpPoints: number;
  margin: number; // Points difference
  qualifyingRaces: string[]; // Race IDs that contributed
  isHistoric?: boolean; // Particularly dominant win
  ceremonyDay: number; // Day of year when awarded
}

export interface RegionalAwardsConfig {
  region: AwardRegion;
  name: string;
  displayName: string;
  ceremonyDay: number;
  categories: readonly RegionalAwardCategory[];
  countryEligibility: readonly string[];
  scoringWeights: AwardScoringWeights;
  surfaceBonuses: Record<string, number>;
  specialRules: string[];
}

export interface AwardScoringWeights {
  G1_WIN: number;
  G2_WIN: number;
  G3_WIN: number;
  GRADED_PLACE: number;
  STAKES_WIN: number;
  BEYER_100_PLUS: number;
  BEYER_110_PLUS: number;
}

// Country to Region mapping (matches gradedRaces.ts)
export const COUNTRY_TO_REGION: Record<string, AwardRegion> = {
  // North America
  USA: "north_america",
  Canada: "north_america",

  // Europe/Middle East
  "Great Britain": "europe",
  Ireland: "europe",
  France: "europe",
  Germany: "europe",
  Italy: "europe",
  Spain: "europe",
  UAE: "europe",
  "Saudi Arabia": "europe",
  Turkey: "europe",
  Austria: "europe",
  Belgium: "europe",
  "Czech Republic": "europe",
  Hungary: "europe",
  Sweden: "europe",
  Norway: "europe",
  Denmark: "europe",

  // Asia-Pacific
  Japan: "asia_pacific",
  "Hong Kong": "asia_pacific",
  Australia: "asia_pacific",
  "New Zealand": "asia_pacific",
  Singapore: "asia_pacific",

  // South America
  Argentina: "south_america",
  Brazil: "south_america",
  Chile: "south_america",
};

export const REGION_DISPLAY_NAMES: Record<AwardRegion, string> = {
  north_america: "North America",
  europe: "Europe & Middle East",
  asia_pacific: "Asia-Pacific",
  south_america: "South America",
};

export const REGION_AWARD_NAMES: Record<AwardRegion, string> = {
  north_america: "Eclipse Awards",
  europe: "Cartier Racing Awards",
  asia_pacific: "Australian Thoroughbred Awards",
  south_america: "Gran Premio Awards",
};

// Regional scoring weights (different regions value races differently)
export const REGIONAL_SCORING: Record<AwardRegion, AwardScoringWeights> = {
  north_america: {
    G1_WIN: 10,
    G2_WIN: 6,
    G3_WIN: 4,
    GRADED_PLACE: 2,
    STAKES_WIN: 2,
    BEYER_100_PLUS: 3,
    BEYER_110_PLUS: 6,
  },
  europe: {
    G1_WIN: 12, // G1s worth more (fewer, higher prestige)
    G2_WIN: 7,
    G3_WIN: 4,
    GRADED_PLACE: 3,
    STAKES_WIN: 2,
    BEYER_100_PLUS: 2, // Beyer less emphasized
    BEYER_110_PLUS: 4,
  },
  asia_pacific: {
    G1_WIN: 15, // Very high G1 weight
    G2_WIN: 8,
    G3_WIN: 5,
    GRADED_PLACE: 4,
    STAKES_WIN: 2,
    BEYER_100_PLUS: 3,
    BEYER_110_PLUS: 6,
  },
  south_america: {
    G1_WIN: 10,
    G2_WIN: 6,
    G3_WIN: 4,
    GRADED_PLACE: 2,
    STAKES_WIN: 2,
    BEYER_100_PLUS: 3,
    BEYER_110_PLUS: 6,
  },
};

// Surface bonuses by region (reflecting regional racing culture)
export const SURFACE_BONUSES: Record<AwardRegion, Record<string, number>> = {
  north_america: {
    dirt: 1.0,
    turf: 1.0,
    synthetic: 1.0,
  },
  europe: {
    turf: 1.2, // Turf emphasized (+20%)
    dirt: 0.8, // Dirt de-emphasized (-20%)
    synthetic: 1.0,
  },
  asia_pacific: {
    turf: 1.1, // Slight turf emphasis
    dirt: 0.9, // Slight dirt penalty
    synthetic: 1.0,
  },
  south_america: {
    dirt: 1.0, // Standard (most tracks dirt)
    turf: 1.0,
    synthetic: 1.0,
  },
};

// Category definitions for each region
export const NORTH_AMERICAN_CATEGORIES: readonly NorthAmericanCategory[] = [
  "horse_of_the_year",
  "champion_2yo_male",
  "champion_2yo_female",
  "champion_3yo_male",
  "champion_3yo_female",
  "champion_older_dirt_male",
  "champion_older_dirt_female",
  "champion_sprint_male",
  "champion_sprint_female",
  "champion_turf_male",
  "champion_turf_female",
  "champion_steeplechase",
];

export const EUROPEAN_CATEGORIES: readonly EuropeanCategory[] = [
  "horse_of_the_year",
  "champion_2yo_colt",
  "champion_2yo_filly",
  "champion_3yo_colt",
  "champion_3yo_filly",
  "champion_older_horse",
  "champion_sprinter_eu",
  "champion_stayer",
  "award_of_merit",
];

export const ASIA_PACIFIC_CATEGORIES: readonly AsiaPacificCategory[] = [
  "horse_of_the_year",
  "champion_2yo",
  "champion_3yo",
  "champion_sprinter_apac",
  "champion_middle_distance",
  "champion_stayer",
  "champion_filly_or_mare",
  "champion_international",
  "champion_trainer",
];

export const SOUTH_AMERICAN_CATEGORIES: readonly SouthAmericanCategory[] = [
  "horse_of_the_year",
  "potrillo_del_ano",
  "potranca_del_ano",
  "campeon_3yo_macho",
  "campeona_3yo_hembras",
  "campeon_mayor",
  "campeon_velocidad",
  "campeon_fondo",
];

// Complete regional configurations
export const REGIONAL_CONFIGS: Record<AwardRegion, RegionalAwardsConfig> = {
  north_america: {
    region: "north_america",
    name: "Eclipse Awards",
    displayName: "Eclipse Awards",
    ceremonyDay: 365, // December 31
    categories: NORTH_AMERICAN_CATEGORIES,
    countryEligibility: ["USA", "Canada"],
    scoringWeights: REGIONAL_SCORING.north_america,
    surfaceBonuses: SURFACE_BONUSES.north_america,
    specialRules: ["Sprint cutoff: 1400m", "Dirt and turf equally weighted"],
  },
  europe: {
    region: "europe",
    name: "Cartier Racing Awards",
    displayName: "Cartier Racing Awards",
    ceremonyDay: 314, // November 10
    categories: EUROPEAN_CATEGORIES,
    countryEligibility: [
      "Great Britain",
      "Ireland",
      "France",
      "Germany",
      "Italy",
      "Spain",
      "UAE",
      "Turkey",
      "Austria",
      "Belgium",
      "Czech Republic",
      "Hungary",
      "Sweden",
      "Norway",
      "Denmark",
    ],
    scoringWeights: REGIONAL_SCORING.europe,
    surfaceBonuses: SURFACE_BONUSES.europe,
    specialRules: ["Stayer: 2400m+", "Older Horse combined gender", "Turf emphasis"],
  },
  asia_pacific: {
    region: "asia_pacific",
    name: "Australian Thoroughbred Awards",
    displayName: "Australian Thoroughbred Awards",
    ceremonyDay: 212, // July 31
    categories: ASIA_PACIFIC_CATEGORIES,
    countryEligibility: ["Japan", "Hong Kong", "Australia", "New Zealand", "Singapore"],
    scoringWeights: REGIONAL_SCORING.asia_pacific,
    surfaceBonuses: SURFACE_BONUSES.asia_pacific,
    specialRules: ["Middle Distance: 1400-2000m", "International category for foreign wins"],
  },
  south_america: {
    region: "south_america",
    name: "Gran Premio Awards",
    displayName: "Gran Premio Awards",
    ceremonyDay: 120, // April 30
    categories: SOUTH_AMERICAN_CATEGORIES,
    countryEligibility: ["Argentina", "Brazil", "Chile"],
    scoringWeights: REGIONAL_SCORING.south_america,
    surfaceBonuses: SURFACE_BONUSES.south_america,
    specialRules: ["Spanish/Portuguese flavor naming", "Dirt-focused"],
  },
};

// Award ceremony schedule - 4 ceremonies per year
export const AWARD_CEREMONY_SCHEDULE: { dayOfYear: number; region: AwardRegion; name: string }[] = [
  { dayOfYear: 120, region: "south_america", name: "Gran Premio Awards" },
  { dayOfYear: 212, region: "asia_pacific", name: "Australian Thoroughbred Awards" },
  { dayOfYear: 314, region: "europe", name: "Cartier Racing Awards" },
  { dayOfYear: 365, region: "north_america", name: "Eclipse Awards" },
];

// Category display names (for UI)
export const CATEGORY_DISPLAY_NAMES: Record<RegionalAwardCategory, string> = {
  // North America
  horse_of_the_year: "Horse of the Year",
  champion_2yo_male: "Champion 2YO Male",
  champion_2yo_female: "Champion 2YO Filly",
  champion_3yo_male: "Champion 3YO Male",
  champion_3yo_female: "Champion 3YO Filly",
  champion_older_dirt_male: "Champion Older Dirt Male",
  champion_older_dirt_female: "Champion Older Dirt Female",
  champion_sprint_male: "Champion Sprint Male",
  champion_sprint_female: "Champion Sprint Female",
  champion_turf_male: "Champion Turf Male",
  champion_turf_female: "Champion Turf Female",
  champion_steeplechase: "Champion Steeplechase",
  // Europe
  champion_2yo_colt: "Best 2-year-old colt",
  champion_2yo_filly: "Best 2-year-old filly",
  champion_3yo_colt: "Best 3-year-old colt",
  champion_3yo_filly: "Best 3-year-old filly",
  champion_older_horse: "Best horse aged 4+ (combined gender)",
  champion_sprinter_eu: "Best sprinter (up to 1300m)",
  champion_stayer: "Best stayer (2400m+)",
  award_of_merit: "Special recognition for exceptional achievement",
  // Asia-Pacific
  champion_2yo: "Best 2-year-old (combined gender)",
  champion_3yo: "Best 3-year-old (combined gender)",
  champion_sprinter_apac: "Best sprinter",
  champion_middle_distance: "Best middle distance horse (1400-2000m)",
  champion_filly_or_mare: "Best filly or mare (all ages combined)",
  champion_international: "Best performer in races outside home country",
  champion_trainer: "Outstanding trainer of the year",
  // South America
  potrillo_del_ano: "Best 2-year-old colt",
  potranca_del_ano: "Best 2-year-old filly",
  campeon_3yo_macho: "Best 3-year-old colt",
  campeona_3yo_hembras: "Best 3-year-old filly",
  campeon_mayor: "Best horse aged 4+",
  campeon_velocidad: "Best sprinter",
  campeon_fondo: "Best stayer",
};

// Category descriptions (for tooltips)
export const CATEGORY_DESCRIPTIONS: Record<RegionalAwardCategory, string> = {
  horse_of_the_year: "The most prestigious award given to the overall champion horse of the season",
  champion_2yo_male: "Best 2-year-old male horse based on graded stakes performance",
  champion_2yo_female: "Best 2-year-old filly based on graded stakes performance",
  champion_3yo_male: "Best 3-year-old male horse - the classic age champion",
  champion_3yo_female: "Best 3-year-old filly - the classic age champion",
  champion_older_dirt_male: "Best male horse aged 4+ on dirt surface",
  champion_older_dirt_female: "Best female horse aged 4+ on dirt surface",
  champion_sprint_male: "Best male sprinter (up to 1400m)",
  champion_sprint_female: "Best female sprinter (up to 1400m)",
  champion_turf_male: "Best male turf horse",
  champion_turf_female: "Best female turf horse",
  champion_steeplechase: "Best horse in jump racing",
  // Europe
  champion_2yo_colt: "Best 2-year-old colt",
  champion_2yo_filly: "Best 2-year-old filly",
  champion_3yo_colt: "Best 3-year-old colt",
  champion_3yo_filly: "Best 3-year-old filly",
  champion_older_horse: "Best horse aged 4+ (combined gender)",
  champion_sprinter_eu: "Best sprinter (up to 1300m)",
  champion_stayer: "Best stayer (2400m+)",
  award_of_merit: "Special recognition for exceptional achievement",
  // Asia-Pacific
  champion_2yo: "Best 2-year-old (combined gender)",
  champion_3yo: "Best 3-year-old (combined gender)",
  champion_sprinter_apac: "Best sprinter",
  champion_middle_distance: "Best middle distance horse (1400-2000m)",
  champion_filly_or_mare: "Best filly or mare (all ages combined)",
  champion_international: "Best performer in races outside home country",
  champion_trainer: "Outstanding trainer of the year",
  potrillo_del_ano: "Best 2-year-old colt",
  potranca_del_ano: "Best 2-year-old filly",
  campeon_3yo_macho: "Best 3-year-old colt",
  campeona_3yo_hembras: "Best 3-year-old filly",
  campeon_mayor: "Best horse aged 4+",
  campeon_velocidad: "Best sprinter",
  campeon_fondo: "Best stayer",
};
