export type HorseStats = {
  speed: number;
  stamina: number;
  acceleration: number;
  consistency: number;
};

export type Conformation = "excellent" | "good" | "fair" | "poor";
export type Temperament = "excellent" | "good" | "fair" | "poor";

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
}

export type HorseGender = "colt" | "filly" | "horse" | "mare";

export type Hemisphere = "Northern" | "Southern";

// Weather conditions for races
export type Weather = "sunny" | "cloudy" | "rainy" | "sunset" | "night";

// Track condition affects race performance
export type TrackCondition = "fast" | "good" | "soft" | "heavy";

// Horse coat colors (for sprite selection)
export type CoatColor = "bay" | "black" | "chestnut" | "dark-bay" | "gray" | "roan" | "palomino" | "white";

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
};

export type RaceClass = "Maiden" | "Allowance" | "Stakes" | "Group" | "Graded";

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
  entries: { horseId: string; owned: boolean }[];
  resolved: boolean;
  result?: { horseId: string; position: number; time: number }[];
  graded?: {
    key: string;
    grade: "G1" | "G2" | "G3";
    track: string; // Track name for display
    trackId: string; // Track UUID reference
    surface: "Turf" | "Dirt" | "Synthetic";
  };
  restrictions?: { 
    minAge?: number; 
    maxAge?: number; 
    gender?: "colt" | "filly" | "horse" | "mare" | "fillies" | "mares" | "colts" | "fillies-and-mares" | "colts-and-fillies";
    // Hemisphere-specific age restrictions (e.g., for Dubai races)
    minAgeNorthern?: number;
    minAgeSouthern?: number;
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
  liveFoalGuarantee?: boolean; // Whether live foal guarantee was purchased
  reBreedingAttempts?: number; // Number of re-breeding attempts used
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
};
