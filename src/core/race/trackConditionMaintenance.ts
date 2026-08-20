/**
 * trackConditionMaintenance.ts - Rail positions, progression, maintenance, and base characteristics
 *
 * Extracted from trackConditionData.ts for modularity.
 */

import type { TrackCondition } from "@/game/types";

export type TurfRailPosition = "true" | "+10ft" | "+20ft" | "+30ft";

export const DEFAULT_TURF_RAIL_POSITIONS: Record<TrackCondition, TurfRailPosition> = {
  fast: "true",
  good: "true",
  soft: "+10ft",
  heavy: "+20ft",
  yielding: "+30ft",
};

export const RAIL_POSITION_EXTRA_DISTANCE: Record<TurfRailPosition, number> = {
  true: 0,
  "+10ft": 3,
  "+20ft": 6,
  "+30ft": 9,
};

export type WeatherPattern = "dry" | "light_rain" | "heavy_rain" | "extreme_heat" | "frost";

export const BASE_DETERIORATION_RATES: Record<TrackCondition, number> = {
  fast: 2,
  good: 1.5,
  soft: 1,
  heavy: 0.5,
  yielding: 0.3,
};

export const WEATHER_DETERIORATION_MODIFIERS: Record<WeatherPattern, number> = {
  dry: -0.5,
  light_rain: 0.5,
  heavy_rain: 2,
  extreme_heat: 1,
  frost: 0,
};

export const DAILY_RECOVERY_RATES: Record<TrackCondition, number> = {
  fast: 0,
  good: 1,
  soft: 2,
  heavy: 3,
  yielding: 4,
};

export type MaintenanceAction =
  "harrow" | "water" | "roll" | "seal" | "turf_cutter" | "rail_move" | "rest_day";

export interface MaintenanceConfig {
  action: MaintenanceAction;
  cost: number;
  timeRequired: number;
  effectiveness: number;
  applicableSurfaces: ("dirt" | "turf" | "synthetic")[];
}

export const MAINTENANCE_ACTIONS: MaintenanceConfig[] = [
  {
    action: "harrow",
    cost: 500,
    timeRequired: 2,
    effectiveness: 0.3,
    applicableSurfaces: ["dirt", "turf"],
  },
  {
    action: "water",
    cost: 300,
    timeRequired: 1,
    effectiveness: 0.2,
    applicableSurfaces: ["dirt", "turf", "synthetic"],
  },
  {
    action: "roll",
    cost: 400,
    timeRequired: 3,
    effectiveness: 0.4,
    applicableSurfaces: ["turf"],
  },
  {
    action: "seal",
    cost: 800,
    timeRequired: 4,
    effectiveness: 0.6,
    applicableSurfaces: ["dirt"],
  },
  {
    action: "turf_cutter",
    cost: 600,
    timeRequired: 2,
    effectiveness: 0.35,
    applicableSurfaces: ["turf"],
  },
  {
    action: "rail_move",
    cost: 200,
    timeRequired: 1,
    effectiveness: 0.15,
    applicableSurfaces: ["turf"],
  },
  {
    action: "rest_day",
    cost: 0,
    timeRequired: 24,
    effectiveness: 0.1,
    applicableSurfaces: ["dirt", "turf", "synthetic"],
  },
];

export interface TrackBaseCharacteristics {
  surface: "dirt" | "turf" | "synthetic";
  speedBias: "sprint" | "route" | "balanced";
  preferredConditions: TrackCondition[];
  conditionVolatility: number;
  maintenanceRequirement: number;
}

export const TRACK_BASE_CHARACTERISTICS: Record<string, TrackBaseCharacteristics> = {
  dirt: {
    surface: "dirt",
    speedBias: "sprint",
    preferredConditions: ["fast", "good"],
    conditionVolatility: 0.7,
    maintenanceRequirement: 0.6,
  },
  turf: {
    surface: "turf",
    speedBias: "route",
    preferredConditions: ["good", "soft"],
    conditionVolatility: 0.5,
    maintenanceRequirement: 0.8,
  },
  synthetic: {
    surface: "synthetic",
    speedBias: "balanced",
    preferredConditions: ["fast", "good"],
    conditionVolatility: 0.3,
    maintenanceRequirement: 0.4,
  },
};
