import type { Impact } from "./base";

// Jockey contract impact
export interface JockeyContractImpact extends Impact {
  type: "jockey_contract";
  jockeyId: string;
  stableId?: string;
  contractUntil?: number;
  reason: string;
}

// Jockey assignment impact
export interface JockeyAssignmentImpact extends Impact {
  type: "jockey_assignment";
  raceId: string;
  horseId: string;
  jockeyId: string;
  reason: string;
}

// Jockey silk impact
export interface JockeySilkImpact extends Impact {
  type: "jockey_silk";
  jockeyId: string;
  silk: string;
  reason: string;
}

// Jockey stats impact
export interface JockeyStatsImpact extends Impact {
  type: "jockey_stats";
  jockeyId: string;
  careerStarts: number;
  careerWins: number;
  fame: number;
  reason: string;
}

export type JockeyImpact =
  | JockeyContractImpact
  | JockeyAssignmentImpact
  | JockeySilkImpact
  | JockeyStatsImpact;
