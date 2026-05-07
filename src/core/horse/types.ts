import type { Genotype } from "@/core/genetics/types";

export type HorseStats = {
  speed: number;
  stamina: number;
  acceleration: number;
  consistency: number;
};

export type Conformation = "excellent" | "good" | "fair" | "poor";
export type Temperament = "excellent" | "good" | "fair" | "poor";

export type RunningStyle = "E" | "EP" | "P" | "S";

export type HealthStatus = "healthy" | "covering_sickness" | "recovering" | "other_illness";

export interface BlueHenStatus {
  isBlueHen: boolean;
  stakesWinnersProduced: number;
  group1WinnersProduced: number;
  blueHenScore: number;
  foalsProduced?: number;
}

export interface GeneticMarkers {
  leopardComplex?: "dominant" | "recessive" | "heterozygous";
  csnbRisk?: "high" | "low";
  sensoryPerception?: "excellent" | "good" | "fair" | "poor";
  signalTransduction?: "excellent" | "good" | "fair" | "poor";
  immunity?: "excellent" | "good" | "fair" | "poor";
  geneticDiversity?: number;
  lethalCarriers?: { csnb?: boolean; hypp?: boolean; olws?: boolean; ffs1?: boolean };
}

export type Pedigree = {
  sireId?: string;
  damId?: string;
  sireName?: string;
  damName?: string;
  sirePedigree?: Pedigree;
  damPedigree?: Pedigree;
  sireFromFoundation?: boolean;
  damFromFoundation?: boolean;
};

export type StudCareer = {
  atStud: boolean;
  standingFee: number;
  bookSize: number;
  seasonBookings: number;
  lifetimeFoals: number;
  lifetimeStakesFoals: number;
  lifetimeG1Foals: number;
  retiredOnDay: number;
};

export type HorseGender = "colt" | "filly" | "horse" | "mare" | "gelding";
export type Hemisphere = "Northern" | "Southern";

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

export type SockHeight = "none" | "sock" | "stocking";
export type FaceWhite = "none" | "star" | "blaze" | "bald";

export type HorseMarkings = {
  socks: SockHeight;
  face: FaceWhite;
  silverDapple: boolean;
  sabino: boolean;
  splashWhite: boolean;
};

export type AppearanceDNA = {
  seed: number;
  headTilt: number;
  headLength: number;
  earSpread: number;
  eyeY: number;
  forelockSweep: number;
  maneWaves: number[];
  bodyLength: number;
  bodyDepth: number;
  legLength: number;
  tailSweep: number;
  tailFullness: number;
  socks: [SockHeight, SockHeight, SockHeight, SockHeight];
  dapples: { x: number; y: number; r: number }[];
  flecks: { x: number; y: number; r: number }[];
};

export type Horse = {
  id: string;
  name: string;
  age: number;
  gender: HorseGender;
  hemisphere: Hemisphere;
  silk: string;
  stats: HorseStats;
  genotype: Genotype;
  energy: number;
  form: number;
  potential: number;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raceClass?: any; // Avoiding circular dep for now
    barrier?: number;
    lane?: number;
  }[];
  owned: boolean;
  sireName?: string;
  damName?: string;
  conformation?: Conformation;
  temperament?: Temperament;
  geneticMarkers?: GeneticMarkers;
  healthStatus?: HealthStatus;
  healthStatusDay?: number;
  blueHenStatus?: BlueHenStatus;
  foalsProduced?: string[];
  coatColor?: CoatColor;
  lastFoaledDay?: number;
  runningStyle?: RunningStyle;
  stableId?: string;
  fame: number;
  scoutedStats?: Partial<HorseStats>;
  lastScoutedDay?: number;
  consignedSaleId?: string;
  pedigree?: Pedigree;
  stud?: StudCareer;
  bruceLoweFamily?: number;
  distanceAptitude: number;
  surfaceAptitude: Record<"Turf" | "Dirt" | "Synthetic", number>;
  climbingAptitude: number;
  corneringAptitude: number;
  injuryProneness: number;
  height: number;
  weight: number;
  lifetimeEarnings: number;
  careerStarts: number;
  careerWins: number;
  winAndYouInQualified?: { raceKey: string; year: number }[];
  heartScore: number;
  fiberBias: "sprinter" | "balanced" | "stayer";
  strideType: "short" | "balanced" | "long";
  trackPreference: "left" | "balanced" | "right";
  mudAptitude: number;
  trainability: number;
  peakAge: number;
  recoveryRate: number;
  fertility: number;
  foalingEase: number;
  markings: HorseMarkings;
  bleederRisk: number;
  roarerRisk: number;
  ocdRisk: number;
  bloodline?: string;
  heterozygosity?: number;
  coefficientOfInbreeding?: number;
  ancestralHistoryCoefficient?: number;
  inbreedingTier?: "outcross" | "linebreeding" | "close-inbreeding";
  prepotency?: number;
  racingViable: boolean;
  lifecycleStatus: "active" | "retired" | "deceased";
  retiredOnDay?: number;
  deceasedOnDay?: number;
  causeOfDeath?: string;
  appearance?: AppearanceDNA;
};
