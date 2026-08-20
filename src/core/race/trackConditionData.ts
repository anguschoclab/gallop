/**
 * trackConditionData.ts - Re-exports for track condition data
 *
 * This file re-exports terminology, maintenance, and climate data from
 * dedicated modules for backward compatibility.
 */

export {
  type RegionCode,
  CONDITION_TIERS,
  REGIONAL_TERMINOLOGY,
  TRACK_SPEED_MODIFIERS,
  STAMINA_DRAIN_MODIFIERS,
  SURFACE_COMPATIBILITY,
} from "./trackConditionTerminology";

export {
  type TurfRailPosition,
  DEFAULT_TURF_RAIL_POSITIONS,
  RAIL_POSITION_EXTRA_DISTANCE,
  type WeatherPattern,
  BASE_DETERIORATION_RATES,
  WEATHER_DETERIORATION_MODIFIERS,
  DAILY_RECOVERY_RATES,
  type MaintenanceAction,
  type MaintenanceConfig,
  MAINTENANCE_ACTIONS,
  type TrackBaseCharacteristics,
  TRACK_BASE_CHARACTERISTICS,
} from "./trackConditionMaintenance";

export {
  type ClimateZone,
  CLIMATE_CONDITION_BIAS,
  CLIMATE_DRYING_RATES,
  KOPPEN_CONDITION_BIAS,
  KOPPEN_DRYING_RATES,
} from "./trackConditionClimate";
