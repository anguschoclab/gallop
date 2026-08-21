export type WorldSize = "small" | "medium" | "large";

export const DEFAULT_WORLD_SIZE: WorldSize = "large";

export interface WorldSizeStableConfig {
  elite: { count: number; reputationRange: [number, number] };
  mid: { count: number; reputationRange: [number, number] };
  budget: { count: number; reputationRange: [number, number] };
  filler: { count: number };
}

export interface WorldSizeHorseCounts {
  elite: [number, number];
  mid: [number, number];
  budget: [number, number];
  filler: number;
}

export interface WorldSizeConfig {
  stables: WorldSizeStableConfig;
  horseCounts: WorldSizeHorseCounts;
  jockeyCount: number;
  freeAgentMin: number;
}

export const WORLD_SIZE_CONFIGS: Record<WorldSize, WorldSizeConfig> = {
  small: {
    stables: {
      elite: { count: 3, reputationRange: [90, 98] },
      mid: { count: 5, reputationRange: [70, 86] },
      budget: { count: 2, reputationRange: [50, 65] },
      filler: { count: 15 },
    },
    horseCounts: {
      elite: [15, 20],
      mid: [10, 15],
      budget: [8, 12],
      filler: 5,
    },
    jockeyCount: 15,
    freeAgentMin: 10,
  },
  medium: {
    stables: {
      elite: { count: 5, reputationRange: [90, 98] },
      mid: { count: 10, reputationRange: [70, 86] },
      budget: { count: 4, reputationRange: [50, 65] },
      filler: { count: 50 },
    },
    horseCounts: {
      elite: [25, 30],
      mid: [15, 25],
      budget: [12, 18],
      filler: 8,
    },
    jockeyCount: 20,
    freeAgentMin: 15,
  },
  large: {
    stables: {
      elite: { count: 7, reputationRange: [90, 98] },
      mid: { count: 15, reputationRange: [70, 86] },
      budget: { count: 6, reputationRange: [50, 65] },
      filler: { count: 100 },
    },
    horseCounts: {
      elite: [30, 40],
      mid: [20, 30],
      budget: [15, 25],
      filler: 10,
    },
    jockeyCount: 25,
    freeAgentMin: 20,
  },
};

export function getWorldSizeConfig(size: WorldSize): WorldSizeConfig {
  return WORLD_SIZE_CONFIGS[size];
}

export function getStableConfig(size: WorldSize): WorldSizeStableConfig {
  return WORLD_SIZE_CONFIGS[size].stables;
}
