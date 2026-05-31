/**
 * koppenTypes.ts - Koppen climate classification types and interfaces
 */

import type { Hemisphere } from "./trackClimate";

/** Koppen climate codes used in the game */
export type KoppenCode =
  | "Cfb" // Temperate Oceanic - mild summers, cool winters, year-round rain
  | "Cfa" // Humid Subtropical - hot summers, mild winters, summer rain peak
  | "Csa" // Hot-Summer Mediterranean - hot dry summers, mild wet winters
  | "Csb" // Warm-Summer Mediterranean - warm dry summers, mild wet winters
  | "BWh" // Hot Desert - extreme heat, minimal precipitation
  | "Dfb" // Humid Continental - warm summers, cold snowy winters
  | "Dfa" // Hot-Summer Humid Continental - hot summers, cold snowy winters
  | "Aw" // Tropical Savanna - wet summers, dry winters, extreme humidity
  | "Af" // Tropical Rainforest - constant heat/humidity, year-round rain
  | "BSk" // Cold Semi-Arid - low precipitation, hot summers, cold winters
  | "ET"; // Tundra - reserved for future expansion

/** Monthly climate data for a Koppen code */
export interface MonthlyClimate {
  /** Average daily high temperature (°C) */
  avgHigh: number;
  /** Average daily low temperature (°C) */
  avgLow: number;
  /** Average days with measurable precipitation */
  precipDays: number;
  /** Average monthly rainfall (mm) */
  precipMm: number;
  /** Average relative humidity (0-1) */
  humidity: number;
  /** Average thunderstorm days for storm modeling */
  thunderstormDays?: number;
  /** Average snowfall days for snow modeling */
  snowfallDays?: number;
}

/** Complete climate profile for a Koppen code */
export interface ClimateProfile {
  code: KoppenCode;
  hemisphere: Hemisphere;
  /** Monthly data indexed 1-12 */
  monthly: Record<number, MonthlyClimate>;
  /** Regional pattern identifiers */
  seasonalPatterns: string[];
  /** Wind characteristics */
  wind: {
    baselineMin: number; // km/h
    baselineMax: number; // km/h
    prevailing?: string;
  };
}

/** All Koppen codes as array for iteration */
export const ALL_KOPPEN_CODES: KoppenCode[] = [
  "Cfb", "Cfa", "Csa", "Csb", "BWh", "Dfb", "Dfa", "Aw", "Af", "BSk", "ET",
];

/** Human-readable descriptions */
export const KOPPEN_DESCRIPTIONS: Record<KoppenCode, string> = {
  Cfb: "Temperate Oceanic - mild summers, cool winters, year-round rain",
  Cfa: "Humid Subtropical - hot summers, mild winters, summer rain peak",
  Csa: "Hot-Summer Mediterranean - hot dry summers, mild wet winters",
  Csb: "Warm-Summer Mediterranean - warm dry summers, mild wet winters",
  BWh: "Hot Desert - extreme heat, minimal precipitation",
  Dfb: "Humid Continental - warm summers, cold snowy winters",
  Dfa: "Hot-Summer Humid Continental - hot summers, cold snowy winters",
  Aw: "Tropical Savanna - wet summers, dry winters, extreme humidity",
  Af: "Tropical Rainforest - constant heat/humidity, year-round rain",
  BSk: "Cold Semi-Arid - low precipitation, hot summers, cold winters",
  ET: "Tundra - cold, short summers, long winters",
};
