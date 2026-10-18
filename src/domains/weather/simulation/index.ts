/**
 * weather/index.ts — Public weather module API.
 */

export * from "@/domains/weather/model/weatherTypes";
export * from "@/domains/weather/simulation/weatherSim";
export * from "@/domains/weather/simulation/trackClimate";
export * from "@/domains/weather/model/koppenTypes";
export * from "@/domains/weather/simulation/koppenProfiles";
export * from "@/domains/weather/simulation/trackKoppenMappings";
export * from "@/domains/weather/simulation/seasonalModifiers";

// Re-export getTrackKoppen as the primary climate lookup function
export { getTrackKoppen } from "@/domains/weather/simulation/trackKoppenMappings";
