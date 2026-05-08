export type RaceClass =
  | "Maiden"
  | "MaidenSpecialWeight"
  | "MaidenClaiming"
  | "MaidenOptionalClaiming"
  | "MaidenStakes"
  | "Allowance"
  | "OptionalClaiming"
  | "StarterAllowance"
  | "StarterHandicap"
  | "Stakes"
  | "Claiming"
  | "Handicap"
  | "Listed"
  | "Group"
  | "Graded";

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

export type WinCondition = "none" | "N1X" | "N2X" | "N3L" | "NW1" | "NW2" | "NW3";

export type Weather = "sunny" | "cloudy" | "rainy" | "sunset" | "night";

export type TrackCondition = "fast" | "good" | "soft" | "heavy" | "yielding";

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
    tactics?: "lead" | "rail" | "outside" | "save" | "late_kick" | "default";
  }[];
  resolved: boolean;
  result?: { horseId: string; position: number; time: number }[];
  graded?: {
    key: string;
    grade: "G1" | "G2" | "G3";
    track: string;
    trackId: string;
    surface: "Turf" | "Dirt" | "Synthetic";
    winAndYouInTarget?: string;
    triplecrownKey?: string; // e.g. "usa-tc", "canada-tc", "uk-classics" — groups Triple Crown legs
  };
  claimingPrice?: ClaimingPrice;
  winCondition?: WinCondition;
  stateBred?: string;
  handicapWeights?: { horseId: string; weight: number }[];
  isHandicap?: boolean;
  trackId?: string;
  surface?: "Turf" | "Dirt" | "Synthetic";
  handedness?: "left" | "right" | "balanced";
  restrictions?: {
    minAge?: number;
    maxAge?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gender?: any; // Avoiding deep nest for now
    minAgeNorthern?: number;
    minAgeSouthern?: number;
    nonWinnersOf?: number;
    otherThan?: string[];
  };
  weather?: Weather;
  trackCondition?: TrackCondition;
  claiming?: { price: number };
};

export type RegionalSystem = "north_america" | "europe" | "australia" | "asia" | "south_america";
export type GradeLevel = "G1" | "G2" | "G3" | "Listed";
