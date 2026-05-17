// Transportation Types - Travel costs and logistics for horse transport
import { generateUUIDWithValidation } from "../uuid";

/**
 * Transport mode types
 */
export type TransportMode = "road" | "air" | "rail";

/**
 * Transport status
 */
export type TransportStatus = "idle" | "in_transit" | "arrived";

/**
 * Transport request for moving horses
 */
export interface TransportRequest {
  id: string;
  horseId: string;
  fromLocation: string;
  toLocation: string;
  mode: TransportMode;
  status: TransportStatus;
  cost: number;
  duration: number; // Days in transit
  startDay: number;
  arrivalDay: number;
}

/**
 * Transport configuration by mode
 */
export interface TransportConfig {
  mode: TransportMode;
  baseCostPerMile: number;
  speed: number; // Miles per day
  capacity: number; // Horses per trip
  minDistance: number;
  maxDistance: number;
}

/**
 * Default transport configurations
 */
export const TRANSPORT_CONFIGS: Record<TransportMode, TransportConfig> = {
  road: {
    mode: "road",
    baseCostPerMile: 0.5,
    speed: 200, // 200 miles/day
    capacity: 6,
    minDistance: 10,
    maxDistance: 500,
  },
  air: {
    mode: "air",
    baseCostPerMile: 2.0,
    speed: 2000, // 2000 miles/day
    capacity: 2,
    minDistance: 200,
    maxDistance: 5000,
  },
  rail: {
    mode: "rail",
    baseCostPerMile: 0.3,
    speed: 400, // 400 miles/day
    capacity: 12,
    minDistance: 50,
    maxDistance: 2000,
  },
};

/**
 * Calculate transport cost based on distance and mode.
 *
 * @param distance - Trip distance in miles
 * @param mode - Transport mode (road, air, rail)
 * @param horseCount - Number of horses being shipped (defaults to 1)
 * @returns Total shipping cost in dollars
 */
export function calculateTransportCost(
  distance: number,
  mode: TransportMode,
  horseCount: number = 1,
): number {
  const config = TRANSPORT_CONFIGS[mode];
  const baseCost = distance * config.baseCostPerMile;
  return Math.round(baseCost * horseCount);
}

/**
 * Calculate transport duration in days.
 *
 * @param distance - Trip distance in miles
 * @param mode - Transport mode
 * @returns Estimated travel time in days
 */
export function calculateTransportDuration(distance: number, mode: TransportMode): number {
  const config = TRANSPORT_CONFIGS[mode];
  return Math.ceil(distance / config.speed);
}

/**
 * Get appropriate transport mode for distance.
 *
 * Defaults to road, air for long distance, rail for medium.
 *
 * @param distance - Trip distance in miles
 * @returns Selected TransportMode
 */
export function getTransportModeForDistance(distance: number): TransportMode {
  if (distance >= 200 && distance <= 5000) return "air";
  if (distance >= 50 && distance <= 2000) return "rail";
  return "road";
}

/**
 * Create a transport request.
 *
 * @param horseId - Unique identifier for the horse to ship
 * @param fromLocation - Starting location name
 * @param toLocation - Destination location name
 * @param distance - Trip distance in miles
 * @param currentDay - Current game day
 * @param mode - Optional mode override
 * @returns Complete TransportRequest object
 */
export function createTransportRequest(
  horseId: string,
  fromLocation: string,
  toLocation: string,
  distance: number,
  currentDay: number,
  mode?: TransportMode,
): TransportRequest {
  const transportMode = mode ?? getTransportModeForDistance(distance);
  const cost = calculateTransportCost(distance, transportMode);
  const duration = calculateTransportDuration(distance, transportMode);

  return {
    id: generateUUIDWithValidation("transport_request"),
    horseId,
    fromLocation,
    toLocation,
    mode: transportMode,
    status: "idle",
    cost,
    duration,
    startDay: currentDay,
    arrivalDay: currentDay + duration,
  };
}

/**
 * Format transport mode for display.
 *
 * @param mode - Transport mode to format
 * @returns Human-readable label
 */
export function formatTransportMode(mode: TransportMode): string {
  const labels: Record<TransportMode, string> = {
    road: "Road Transport",
    air: "Air Charter",
    rail: "Rail Transport",
  };
  return labels[mode];
}
