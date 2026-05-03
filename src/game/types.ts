export type HorseStats = {
  speed: number;
  stamina: number;
  acceleration: number;
  consistency: number;
};

export type Sex = "M" | "F";

export type Lineage = {
  sireId?: string;
  sireName?: string;
  damId?: string;
  damName?: string;
};

export type Pregnancy = {
  sireId: string;
  sireName: string;
  dueDay: number;
  expectedFoalPotential: number;
};

export type Horse = {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  silk: string; // hex color
  stats: HorseStats;
  energy: number; // 0-100
  form: number; // -10..+10
  potential: number; // 60-100, soft cap on stat growth
  raceHistory: { raceId: string; raceName: string; position: number; day: number }[];
  owned: boolean;
  lineage: Lineage;
  pregnancy?: Pregnancy;
  retired?: boolean;
  // For non-owned public studs available for breeding
  publicStud?: boolean;
  studFee?: number;
};

export type RaceClass = "Maiden" | "Allowance" | "Stakes" | "Group";

export type Race = {
  id: string;
  name: string;
  day: number; // scheduled day
  distance: number; // meters
  raceClass: RaceClass;
  entryFee: number;
  purse: number;
  minStat?: number;
  fieldSize: number;
  entries: { horseId: string; owned: boolean }[];
  resolved: boolean;
  result?: { horseId: string; position: number; time: number }[];
};

export type GameState = {
  day: number;
  cash: number;
  horses: Horse[];
  market: Horse[];
  races: Race[];
  studs: Horse[]; // public studs available for breeding
  trainingUsed: Record<string, number>; // horseId -> count today
  log: { day: number; text: string }[];
};
