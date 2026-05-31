/**
 * weather/index.ts — Public weather module API.
 */

export * from "./weatherTypes";
export * from "./weatherSim";
export * from "./trackClimate";
export * from "./koppenTypes";
export * from "./koppenProfiles";
export * from "./trackKoppenMappings";
export * from "./seasonalModifiers";

// Re-export getTrackKoppen as the primary climate lookup function
export { getTrackKoppen } from "./trackKoppenMappings";
