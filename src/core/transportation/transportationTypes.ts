// Transportation Types - Travel costs and logistics for horse transport

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
 * Calculate transport cost
 */
export function calculateTransportCost(
  distance: number,
  mode: TransportMode,
  horseCount: number = 1
): number {
  const config = TRANSPORT_CONFIGS[mode];
  const baseCost = distance * config.baseCostPerMile;
  return Math.round(baseCost * horseCount);
}

/**
 * Calculate transport duration in days
 */
export function calculateTransportDuration(
  distance: number,
  mode: TransportMode
): number {
  const config = TRANSPORT_CONFIGS[mode];
  return Math.ceil(distance / config.speed);
}

/**
 * Get appropriate transport mode for distance
 */
export function getTransportModeForDistance(distance: number): TransportMode {
  if (distance >= 200 && distance <= 5000) return "air";
  if (distance >= 50 && distance <= 2000) return "rail";
  return "road";
}

/**
 * Create a transport request
 */
export function createTransportRequest(
  horseId: string,
  fromLocation: string,
  toLocation: string,
  distance: number,
  currentDay: number,
  mode?: TransportMode
): TransportRequest {
  const transportMode = mode ?? getTransportModeForDistance(distance);
  const cost = calculateTransportCost(distance, transportMode);
  const duration = calculateTransportDuration(distance, transportMode);

  return {
    id: crypto.randomUUID(),
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
 * Format transport mode for display
 */
export function formatTransportMode(mode: TransportMode): string {
  const labels: Record<TransportMode, string> = {
    road: "Road Transport",
    air: "Air Charter",
    rail: "Rail Transport",
  };
  return labels[mode];
}
