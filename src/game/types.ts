export type HorseStats = {
  speed: number;
  stamina: number;
  acceleration: number;
  consistency: number;
};

export type Horse = {
  id: string;
  name: string;
  age: number;
  silk: string; // hex color
  stats: HorseStats;
  energy: number; // 0-100
  form: number; // -10..+10
  potential: number; // 60-100, soft cap on stat growth
  raceHistory: { raceId: string; raceName: string; position: number; day: number }[];
  owned: boolean;
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
  restrictions?: { minAge?: number; maxAge?: number };
};

export type GameState = {
  day: number;
  cash: number;
  horses: Horse[];
  market: Horse[];
  races: Race[];
  trainingUsed: Record<string, number>; // horseId -> count today
  log: { day: number; text: string }[];
};
