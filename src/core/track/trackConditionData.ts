import type { TrackCondition } from "@/game/types";

// =============================================================================
// 1. REGIONAL TERMINOLOGY MAPPINGS
// =============================================================================

/** Regional terminology variants for track conditions */
export type RegionCode = "us" | "europe" | "australia" | "asia" | "south_america";

/** Standard 5-tier condition system with regional variants */
export const CONDITION_TIERS: TrackCondition[] = ["fast", "good", "soft", "heavy", "yielding"];

/** Regional display terminology for track conditions */
export const REGIONAL_TERMINOLOGY: Record<
  RegionCode,
  Record<TrackCondition, { label: string; abbreviation: string; description: string }>
> = {
  us: {
    fast: { label: "Fast", abbreviation: "FT", description: "Dry, hard surface. Optimal speed." },
    good: { label: "Good", abbreviation: "GD", description: "Slightly loosened, still quick." },
    soft: { label: "Muddy", abbreviation: "MY", description: "Wet but firming. Challenging." },
    heavy: { label: "Sloppy", abbreviation: "SL", description: "Waterlogged, very testing." },
    yielding: {
      label: "Sealed",
      abbreviation: "SX",
      description: "Packed wet surface for stability.",
    },
  },
  europe: {
    fast: { label: "Firm", abbreviation: "FM", description: "Hard turf. Fast times expected." },
    good: { label: "Good", abbreviation: "GF", description: "Ideal racing surface." },
    soft: { label: "Soft", abbreviation: "SF", description: "Dampened, more stamina required." },
    heavy: { label: "Heavy", abbreviation: "HV", description: "Deep going. Tests endurance." },
    yielding: { label: "Yielding", abbreviation: "YD", description: "Slow surface, hard work." },
  },
  australia: {
    fast: { label: "Good", abbreviation: "G", description: "Hard, fast surface." },
    good: { label: "Good (3)", abbreviation: "G3", description: "Standard good going." },
    soft: { label: "Soft", abbreviation: "S", description: "Damp surface, slower pace." },
    heavy: { label: "Heavy", abbreviation: "H", description: "Very slow, demanding conditions." },
    yielding: { label: "Slow", abbreviation: "SLW", description: "Energy-sapping surface." },
  },
  asia: {
    fast: { label: "Good", abbreviation: "G", description: "Firm, fast racing surface." },
    good: { label: "Good to Firm", abbreviation: "GF", description: "Ideal conditions." },
    soft: { label: "Good to Soft", abbreviation: "GS", description: "Some cut in the ground." },
    heavy: { label: "Soft", abbreviation: "S", description: "Testing, stamina-sapping." },
    yielding: { label: "Heavy", abbreviation: "H", description: "Extremely demanding." },
  },
  south_america: {
    fast: { label: "Firme", abbreviation: "FR", description: "Firme y rápido." },
    good: { label: "Bueno", abbreviation: "BN", description: "Condiciones ideales." },
    soft: { label: "Blando", abbreviation: "BL", description: "Con algo de barro." },
    heavy: { label: "Pesado", abbreviation: "PS", description: "Muy exigente." },
    yielding: { label: "Muy Pesado", abbreviation: "MP", description: "Extremadamente difícil." },
  },
};

// =============================================================================
// 2. SURFACE-SPECIFIC SPEED MODIFIERS
// =============================================================================

/** Speed multiplier by track condition (lower = slower, more stamina drain) */
export const TRACK_SPEED_MODIFIERS: Record<TrackCondition, number> = {
  fast: 1.0, // Optimal speed
  good: 0.985, // Slightly slower
  soft: 0.95, // Noticeably slower
  heavy: 0.93, // Significantly slower
  yielding: 0.9, // Most demanding
};

/** Stamina drain multiplier (increases on softer ground) */
export const STAMINA_DRAIN_MODIFIERS: Record<TrackCondition, number> = {
  fast: 1.0, // Normal stamina use
  good: 1.05, // Slightly harder
  soft: 1.15, // Noticeably harder
  heavy: 1.3, // Significantly harder
  yielding: 1.5, // Maximum drain
};

/** Surface type compatibility with conditions */
export const SURFACE_COMPATIBILITY: Record<
  "dirt" | "turf" | "synthetic",
  { validConditions: TrackCondition[]; preferred: TrackCondition[] }
> = {
  dirt: {
    validConditions: ["fast", "good", "soft", "heavy", "yielding"],
    preferred: ["fast", "good"],
  },
  turf: {
    validConditions: ["fast", "good", "soft", "heavy", "yielding"],
    preferred: ["good", "soft"],
  },
  synthetic: {
    validConditions: ["fast", "good", "soft"], // All-weather surfaces rarely go heavy
    preferred: ["fast", "good"],
  },
};

// =============================================================================
// 3. TURF RAIL POSITIONS
// =============================================================================

/** Turf rail position (affects path distance and inside/outside bias) */
export type TurfRailPosition = "true" | "+10ft" | "+20ft" | "+30ft";

/** Default rail positions by condition (moved out to avoid cut-up ground) */
export const DEFAULT_TURF_RAIL_POSITIONS: Record<TrackCondition, TurfRailPosition> = {
  fast: "true",
  good: "true",
  soft: "+10ft",
  heavy: "+20ft",
  yielding: "+30ft",
};

/** Path distance added by rail position (in meters) */
export const RAIL_POSITION_EXTRA_DISTANCE: Record<TurfRailPosition, number> = {
  true: 0,
  "+10ft": 3,
  "+20ft": 6,
  "+30ft": 9,
};

// =============================================================================
// 4. CONDITION PROGRESSION MODELS
// =============================================================================

/** Weather impact on track conditions (temperature + precipitation) */
export type WeatherPattern = "dry" | "light_rain" | "heavy_rain" | "extreme_heat" | "frost";

/** Base deterioration rate per race (percentage points) */
export const BASE_DETERIORATION_RATES: Record<TrackCondition, number> = {
  fast: 2, // Firm/fast tracks cut up quickly
  good: 1.5,
  soft: 1,
  heavy: 0.5, // Already deep, doesn't worsen much
  yielding: 0.3, // At maximum
};

/** Weather modifier to deterioration rate */
export const WEATHER_DETERIORATION_MODIFIERS: Record<WeatherPattern, number> = {
  dry: -0.5, // Drying out (improves/clocks back)
  light_rain: 0.5, // Gradual worsening
  heavy_rain: 2, // Rapid deterioration
  extreme_heat: 1, // Baking/hardening can cause unevenness
  frost: 0, // Minimal change
};

/** Recovery rate per day without racing (percentage points) */
export const DAILY_RECOVERY_RATES: Record<TrackCondition, number> = {
  fast: 0, // Already at best
  good: 1, // Slow improvement with rest
  soft: 2,
  heavy: 3,
  yielding: 4, // Fastest recovery with time
};

// =============================================================================
// 5. MAINTENANCE ACTIONS
// =============================================================================

/** Available track maintenance actions */
export type MaintenanceAction =
  | "harrow"
  | "water"
  | "roll"
  | "seal"
  | "turf_cutter"
  | "rail_move"
  | "rest_day";

/** Maintenance action configuration */
export interface MaintenanceConfig {
  action: MaintenanceAction;
  cost: number; // Currency cost
  timeRequired: number; // Hours
  effectiveness: number; // 0-1 improvement to maintenanceLevel
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

// =============================================================================
// 6. BASE RATINGS FOR TRACK TYPES
// =============================================================================

/** Base performance characteristics by track surface type */
export interface TrackBaseCharacteristics {
  surface: "dirt" | "turf" | "synthetic";
  speedBias: "sprint" | "route" | "balanced";
  preferredConditions: TrackCondition[];
  conditionVolatility: number; // 0-1, how quickly conditions change
  maintenanceRequirement: number; // 0-1, maintenance intensity needed
}

export const TRACK_BASE_CHARACTERISTICS: Record<string, TrackBaseCharacteristics> = {
  dirt: {
    surface: "dirt",
    speedBias: "sprint",
    preferredConditions: ["fast", "good"],
    conditionVolatility: 0.7, // Changes quickly with weather
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
    conditionVolatility: 0.3, // Most consistent
    maintenanceRequirement: 0.4,
  },
};

// =============================================================================
// 7. CLIMATE ZONE PROFILES
// =============================================================================

/** Climate zones affecting track behavior */
export type ClimateZone = "arid" | "temperate" | "humid" | "tropical" | "continental";

/** Base probability distribution for track conditions by climate */
export const CLIMATE_CONDITION_BIAS: Record<ClimateZone, Record<TrackCondition, number>> = {
  arid: {
    // Desert/dry climates - predominantly fast
    fast: 0.7,
    good: 0.2,
    soft: 0.07,
    heavy: 0.02,
    yielding: 0.01,
  },
  temperate: {
    // Moderate climates - balanced distribution
    fast: 0.45,
    good: 0.35,
    soft: 0.15,
    heavy: 0.04,
    yielding: 0.01,
  },
  humid: {
    // Coastal/high humidity - softer bias
    fast: 0.25,
    good: 0.35,
    soft: 0.3,
    heavy: 0.08,
    yielding: 0.02,
  },
  tropical: {
    // Rainy/monsoon climates - very soft bias
    fast: 0.15,
    good: 0.25,
    soft: 0.35,
    heavy: 0.2,
    yielding: 0.05,
  },
  continental: {
    // Extreme seasonal variation
    fast: 0.5,
    good: 0.3,
    soft: 0.15,
    heavy: 0.04,
    yielding: 0.01,
  },
};

/** Drying rates by climate zone (multiplier to base recovery) */
export const CLIMATE_DRYING_RATES: Record<ClimateZone, number> = {
  arid: 2.0, // Very fast drying
  temperate: 1.0, // Standard
  humid: 0.7, // Slow drying
  tropical: 0.5, // Very slow drying
  continental: 1.2, // Seasonal swings
};
