export type HorseStats = {
  speed: number;
  stamina: number;
  acceleration: number;
  consistency: number;
};

export type HorseGender = "colt" | "filly" | "horse" | "mare";

export type Hemisphere = "Northern" | "Southern";

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
    track: string;
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
