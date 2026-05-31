/**
 * koppenProfiles.ts - Historical climate data by Koppen code
 *
 * Data sources:
 * - UK Met Office (Cfb stations: London, Dublin)
 * - Japan Meteorological Agency (Cfa/Dfb)
 * - NOAA Climate Normals (Dfa)
 * - AEMET Spain (Csa)
 * - Chile Met Service (Csb)
 * - UAE NCM (BWh)
 * - DWD/ZAMG/CHMI (Dfb Europe)
 * - Australia BOM (Cfa/Cfb)
 */

import type { KoppenCode, ClimateProfile } from "./koppenTypes";

export const KOPPEN_PROFILES: Record<KoppenCode, ClimateProfile> = {
  Cfb: {
    code: "Cfb",
    hemisphere: "Northern",
    seasonalPatterns: ["atlantic_westerlies", "winter_storm_track"],
    wind: { baselineMin: 15, baselineMax: 40, prevailing: "westerly" },
    monthly: {
      1: { avgHigh: 7, avgLow: 2, precipDays: 11, precipMm: 55, humidity: 0.82, snowfallDays: 2 },
      2: { avgHigh: 8, avgLow: 2, precipDays: 9, precipMm: 45, humidity: 0.80, snowfallDays: 2 },
      3: { avgHigh: 11, avgLow: 4, precipDays: 10, precipMm: 40, humidity: 0.76 },
      4: { avgHigh: 14, avgLow: 6, precipDays: 9, precipMm: 45, humidity: 0.72 },
      5: { avgHigh: 18, avgLow: 9, precipDays: 9, precipMm: 50, humidity: 0.70 },
      6: { avgHigh: 21, avgLow: 12, precipDays: 9, precipMm: 45, humidity: 0.70 },
      7: { avgHigh: 23, avgLow: 14, precipDays: 8, precipMm: 45, humidity: 0.70 },
      8: { avgHigh: 23, avgLow: 14, precipDays: 9, precipMm: 50, humidity: 0.72 },
      9: { avgHigh: 20, avgLow: 11, precipDays: 9, precipMm: 50, humidity: 0.75 },
      10: { avgHigh: 16, avgLow: 8, precipDays: 11, precipMm: 65, humidity: 0.78 },
      11: { avgHigh: 11, avgLow: 5, precipDays: 11, precipMm: 65, humidity: 0.80 },
      12: { avgHigh: 8, avgLow: 3, precipDays: 11, precipMm: 60, humidity: 0.82, snowfallDays: 1 },
    },
  },

  Cfa: {
    code: "Cfa",
    hemisphere: "Northern",
    seasonalPatterns: ["summer_rain_peak", "thunderstorm_season"],
    wind: { baselineMin: 12, baselineMax: 35, prevailing: "variable" },
    monthly: {
      1: { avgHigh: 10, avgLow: 2, precipDays: 8, precipMm: 50, humidity: 0.65 },
      2: { avgHigh: 11, avgLow: 3, precipDays: 8, precipMm: 60, humidity: 0.65 },
      3: { avgHigh: 14, avgLow: 6, precipDays: 10, precipMm: 100, humidity: 0.68 },
      4: { avgHigh: 20, avgLow: 11, precipDays: 10, precipMm: 120, humidity: 0.70 },
      5: { avgHigh: 24, avgLow: 15, precipDays: 10, precipMm: 130, humidity: 0.72 },
      6: { avgHigh: 27, avgLow: 19, precipDays: 12, precipMm: 170, humidity: 0.78, thunderstormDays: 5 },
      7: { avgHigh: 31, avgLow: 23, precipDays: 11, precipMm: 150, humidity: 0.80, thunderstormDays: 6 },
      8: { avgHigh: 32, avgLow: 24, precipDays: 9, precipMm: 130, humidity: 0.78, thunderstormDays: 5 },
      9: { avgHigh: 28, avgLow: 20, precipDays: 11, precipMm: 180, humidity: 0.75, thunderstormDays: 3 },
      10: { avgHigh: 22, avgLow: 14, precipDays: 9, precipMm: 160, humidity: 0.70 },
      11: { avgHigh: 17, avgLow: 9, precipDays: 7, precipMm: 90, humidity: 0.68 },
      12: { avgHigh: 12, avgLow: 4, precipDays: 7, precipMm: 50, humidity: 0.65 },
    },
  },

  Csa: {
    code: "Csa",
    hemisphere: "Northern",
    seasonalPatterns: ["mediterranean_dry_summer", "winter_rain_peak"],
    wind: { baselineMin: 10, baselineMax: 25, prevailing: "thermal" },
    monthly: {
      1: { avgHigh: 15, avgLow: 5, precipDays: 8, precipMm: 45, humidity: 0.70 },
      2: { avgHigh: 16, avgLow: 6, precipDays: 7, precipMm: 40, humidity: 0.68 },
      3: { avgHigh: 19, avgLow: 8, precipDays: 7, precipMm: 45, humidity: 0.65 },
      4: { avgHigh: 22, avgLow: 10, precipDays: 6, precipMm: 35, humidity: 0.60 },
      5: { avgHigh: 26, avgLow: 14, precipDays: 4, precipMm: 20, humidity: 0.55 },
      6: { avgHigh: 31, avgLow: 18, precipDays: 2, precipMm: 8, humidity: 0.50 },
      7: { avgHigh: 34, avgLow: 21, precipDays: 1, precipMm: 3, humidity: 0.45 },
      8: { avgHigh: 33, avgLow: 20, precipDays: 1, precipMm: 5, humidity: 0.48 },
      9: { avgHigh: 29, avgLow: 17, precipDays: 3, precipMm: 20, humidity: 0.55 },
      10: { avgHigh: 24, avgLow: 13, precipDays: 5, precipMm: 50, humidity: 0.62 },
      11: { avgHigh: 19, avgLow: 9, precipDays: 6, precipMm: 55, humidity: 0.68 },
      12: { avgHigh: 16, avgLow: 6, precipDays: 7, precipMm: 50, humidity: 0.70 },
    },
  },

  Csb: {
    code: "Csb",
    hemisphere: "Southern",
    seasonalPatterns: ["mediterranean_dry_summer", "winter_rain_peak"],
    wind: { baselineMin: 10, baselineMax: 30, prevailing: "westerly" },
    monthly: {
      1: { avgHigh: 29, avgLow: 14, precipDays: 2, precipMm: 8, humidity: 0.50 },
      2: { avgHigh: 28, avgLow: 14, precipDays: 2, precipMm: 10, humidity: 0.52 },
      3: { avgHigh: 26, avgLow: 12, precipDays: 3, precipMm: 15, humidity: 0.55 },
      4: { avgHigh: 22, avgLow: 9, precipDays: 5, precipMm: 30, humidity: 0.62 },
      5: { avgHigh: 17, avgLow: 7, precipDays: 8, precipMm: 75, humidity: 0.72 },
      6: { avgHigh: 14, avgLow: 5, precipDays: 10, precipMm: 110, humidity: 0.78 },
      7: { avgHigh: 13, avgLow: 4, precipDays: 11, precipMm: 95, humidity: 0.80 },
      8: { avgHigh: 15, avgLow: 5, precipDays: 10, precipMm: 70, humidity: 0.75 },
      9: { avgHigh: 17, avgLow: 6, precipDays: 7, precipMm: 50, humidity: 0.70 },
      10: { avgHigh: 21, avgLow: 8, precipDays: 5, precipMm: 30, humidity: 0.62 },
      11: { avgHigh: 25, avgLow: 11, precipDays: 3, precipMm: 15, humidity: 0.55 },
      12: { avgHigh: 28, avgLow: 13, precipDays: 2, precipMm: 10, humidity: 0.50 },
    },
  },

  BWh: {
    code: "BWh",
    hemisphere: "Northern",
    seasonalPatterns: ["desert_extreme_heat", "minimal_precipitation"],
    wind: { baselineMin: 8, baselineMax: 25, prevailing: "thermal" },
    monthly: {
      1: { avgHigh: 24, avgLow: 14, precipDays: 2, precipMm: 15, humidity: 0.60 },
      2: { avgHigh: 26, avgLow: 15, precipDays: 2, precipMm: 12, humidity: 0.58 },
      3: { avgHigh: 30, avgLow: 18, precipDays: 1, precipMm: 8, humidity: 0.55 },
      4: { avgHigh: 35, avgLow: 22, precipDays: 1, precipMm: 3, humidity: 0.50 },
      5: { avgHigh: 40, avgLow: 26, precipDays: 0, precipMm: 1, humidity: 0.45 },
      6: { avgHigh: 42, avgLow: 28, precipDays: 0, precipMm: 0, humidity: 0.42 },
      7: { avgHigh: 43, avgLow: 30, precipDays: 0, precipMm: 0, humidity: 0.40 },
      8: { avgHigh: 43, avgLow: 30, precipDays: 0, precipMm: 0, humidity: 0.42 },
      9: { avgHigh: 40, avgLow: 27, precipDays: 0, precipMm: 0, humidity: 0.48 },
      10: { avgHigh: 36, avgLow: 23, precipDays: 0, precipMm: 1, humidity: 0.52 },
      11: { avgHigh: 30, avgLow: 19, precipDays: 1, precipMm: 5, humidity: 0.58 },
      12: { avgHigh: 26, avgLow: 16, precipDays: 2, precipMm: 10, humidity: 0.62 },
    },
  },

  Dfb: {
    code: "Dfb",
    hemisphere: "Northern",
    seasonalPatterns: ["continental_extremes", "winter_snow"],
    wind: { baselineMin: 12, baselineMax: 35, prevailing: "westerly" },
    monthly: {
      1: { avgHigh: 2, avgLow: -4, precipDays: 10, precipMm: 40, humidity: 0.80, snowfallDays: 8 },
      2: { avgHigh: 4, avgLow: -3, precipDays: 9, precipMm: 35, humidity: 0.78, snowfallDays: 6 },
      3: { avgHigh: 9, avgLow: 0, precipDays: 10, precipMm: 45, humidity: 0.72, snowfallDays: 3 },
      4: { avgHigh: 15, avgLow: 4, precipDays: 9, precipMm: 50, humidity: 0.65 },
      5: { avgHigh: 20, avgLow: 9, precipDays: 11, precipMm: 70, humidity: 0.65 },
      6: { avgHigh: 24, avgLow: 13, precipDays: 11, precipMm: 85, humidity: 0.68, thunderstormDays: 4 },
      7: { avgHigh: 26, avgLow: 15, precipDays: 10, precipMm: 90, humidity: 0.68, thunderstormDays: 5 },
      8: { avgHigh: 25, avgLow: 14, precipDays: 10, precipMm: 80, humidity: 0.70, thunderstormDays: 3 },
      9: { avgHigh: 20, avgLow: 10, precipDays: 9, precipMm: 60, humidity: 0.72 },
      10: { avgHigh: 14, avgLow: 5, precipDays: 9, precipMm: 50, humidity: 0.76 },
      11: { avgHigh: 7, avgLow: 1, precipDays: 10, precipMm: 50, humidity: 0.80, snowfallDays: 3 },
      12: { avgHigh: 3, avgLow: -2, precipDays: 11, precipMm: 45, humidity: 0.82, snowfallDays: 7 },
    },
  },

  Dfa: {
    code: "Dfa",
    hemisphere: "Northern",
    seasonalPatterns: ["continental_extremes", "summer_thunderstorms", "winter_snow"],
    wind: { baselineMin: 12, baselineMax: 40, prevailing: "westerly" },
    monthly: {
      1: { avgHigh: 1, avgLow: -9, precipDays: 12, precipMm: 60, humidity: 0.72, snowfallDays: 10 },
      2: { avgHigh: 3, avgLow: -7, precipDays: 10, precipMm: 55, humidity: 0.70, snowfallDays: 8 },
      3: { avgHigh: 9, avgLow: -2, precipDays: 11, precipMm: 75, humidity: 0.68, snowfallDays: 5 },
      4: { avgHigh: 16, avgLow: 4, precipDays: 11, precipMm: 90, humidity: 0.65 },
      5: { avgHigh: 22, avgLow: 10, precipDays: 12, precipMm: 100, humidity: 0.65 },
      6: { avgHigh: 27, avgLow: 16, precipDays: 10, precipMm: 100, humidity: 0.68, thunderstormDays: 6 },
      7: { avgHigh: 29, avgLow: 18, precipDays: 10, precipMm: 110, humidity: 0.70, thunderstormDays: 7 },
      8: { avgHigh: 28, avgLow: 17, precipDays: 9, precipMm: 90, humidity: 0.70, thunderstormDays: 5 },
      9: { avgHigh: 24, avgLow: 12, precipDays: 9, precipMm: 85, humidity: 0.70 },
      10: { avgHigh: 17, avgLow: 6, precipDays: 10, precipMm: 80, humidity: 0.72 },
      11: { avgHigh: 10, avgLow: 0, precipDays: 11, precipMm: 75, humidity: 0.74, snowfallDays: 3 },
      12: { avgHigh: 3, avgLow: -5, precipDays: 12, precipMm: 70, humidity: 0.75, snowfallDays: 8 },
    },
  },

  Aw: {
    code: "Aw",
    hemisphere: "Northern",
    seasonalPatterns: ["wet_summer", "dry_winter", "hurricane_season"],
    wind: { baselineMin: 15, baselineMax: 50, prevailing: "monsoon" },
    monthly: {
      1: { avgHigh: 24, avgLow: 16, precipDays: 5, precipMm: 40, humidity: 0.70 },
      2: { avgHigh: 25, avgLow: 17, precipDays: 5, precipMm: 45, humidity: 0.70 },
      3: { avgHigh: 27, avgLow: 19, precipDays: 6, precipMm: 60, humidity: 0.72 },
      4: { avgHigh: 29, avgLow: 21, precipDays: 6, precipMm: 70, humidity: 0.72 },
      5: { avgHigh: 31, avgLow: 23, precipDays: 10, precipMm: 150, humidity: 0.75 },
      6: { avgHigh: 32, avgLow: 24, precipDays: 14, precipMm: 220, humidity: 0.80, thunderstormDays: 8 },
      7: { avgHigh: 33, avgLow: 25, precipDays: 16, precipMm: 200, humidity: 0.82, thunderstormDays: 10 },
      8: { avgHigh: 33, avgLow: 25, precipDays: 17, precipMm: 210, humidity: 0.82, thunderstormDays: 12 },
      9: { avgHigh: 32, avgLow: 24, precipDays: 15, precipMm: 180, humidity: 0.80, thunderstormDays: 9 },
      10: { avgHigh: 30, avgLow: 22, precipDays: 11, precipMm: 140, humidity: 0.76 },
      11: { avgHigh: 27, avgLow: 19, precipDays: 7, precipMm: 80, humidity: 0.72 },
      12: { avgHigh: 25, avgLow: 17, precipDays: 5, precipMm: 50, humidity: 0.70 },
    },
  },

  Af: {
    code: "Af",
    hemisphere: "Northern",
    seasonalPatterns: ["constant_rain", "high_humidity"],
    wind: { baselineMin: 10, baselineMax: 30, prevailing: "convergence" },
    monthly: {
      1: { avgHigh: 30, avgLow: 24, precipDays: 15, precipMm: 240, humidity: 0.85 },
      2: { avgHigh: 31, avgLow: 24, precipDays: 13, precipMm: 180, humidity: 0.84 },
      3: { avgHigh: 32, avgLow: 25, precipDays: 14, precipMm: 200, humidity: 0.84 },
      4: { avgHigh: 32, avgLow: 25, precipDays: 16, precipMm: 220, humidity: 0.85 },
      5: { avgHigh: 32, avgLow: 25, precipDays: 16, precipMm: 200, humidity: 0.85 },
      6: { avgHigh: 31, avgLow: 25, precipDays: 14, precipMm: 160, humidity: 0.84 },
      7: { avgHigh: 31, avgLow: 25, precipDays: 14, precipMm: 160, humidity: 0.84 },
      8: { avgHigh: 31, avgLow: 25, precipDays: 14, precipMm: 170, humidity: 0.84 },
      9: { avgHigh: 31, avgLow: 25, precipDays: 14, precipMm: 180, humidity: 0.85 },
      10: { avgHigh: 31, avgLow: 25, precipDays: 16, precipMm: 210, humidity: 0.85 },
      11: { avgHigh: 31, avgLow: 24, precipDays: 18, precipMm: 280, humidity: 0.86 },
      12: { avgHigh: 30, avgLow: 24, precipDays: 18, precipMm: 300, humidity: 0.86 },
    },
  },

  BSk: {
    code: "BSk",
    hemisphere: "Northern",
    seasonalPatterns: ["low_precipitation", "continental"],
    wind: { baselineMin: 10, baselineMax: 35, prevailing: "variable" },
    monthly: {
      1: { avgHigh: 10, avgLow: 0, precipDays: 7, precipMm: 30, humidity: 0.65, snowfallDays: 2 },
      2: { avgHigh: 12, avgLow: 2, precipDays: 6, precipMm: 25, humidity: 0.62, snowfallDays: 1 },
      3: { avgHigh: 16, avgLow: 5, precipDays: 6, precipMm: 30, humidity: 0.58 },
      4: { avgHigh: 20, avgLow: 8, precipDays: 7, precipMm: 35, humidity: 0.55 },
      5: { avgHigh: 25, avgLow: 12, precipDays: 7, precipMm: 40, humidity: 0.52 },
      6: { avgHigh: 31, avgLow: 17, precipDays: 4, precipMm: 20, humidity: 0.45 },
      7: { avgHigh: 35, avgLow: 20, precipDays: 2, precipMm: 8, humidity: 0.38 },
      8: { avgHigh: 34, avgLow: 19, precipDays: 2, precipMm: 10, humidity: 0.40 },
      9: { avgHigh: 28, avgLow: 14, precipDays: 4, precipMm: 25, humidity: 0.50 },
      10: { avgHigh: 21, avgLow: 9, precipDays: 6, precipMm: 40, humidity: 0.58 },
      11: { avgHigh: 14, avgLow: 4, precipDays: 7, precipMm: 40, humidity: 0.65, snowfallDays: 1 },
      12: { avgHigh: 10, avgLow: 1, precipDays: 8, precipMm: 45, humidity: 0.68, snowfallDays: 2 },
    },
  },

  ET: {
    code: "ET",
    hemisphere: "Northern",
    seasonalPatterns: ["tundra_cold"],
    wind: { baselineMin: 20, baselineMax: 50, prevailing: "polar" },
    monthly: {
      1: { avgHigh: -10, avgLow: -20, precipDays: 8, precipMm: 25, humidity: 0.70, snowfallDays: 8 },
      2: { avgHigh: -8, avgLow: -18, precipDays: 7, precipMm: 20, humidity: 0.68, snowfallDays: 7 },
      3: { avgHigh: -2, avgLow: -12, precipDays: 8, precipMm: 25, humidity: 0.70, snowfallDays: 8 },
      4: { avgHigh: 5, avgLow: -4, precipDays: 8, precipMm: 25, humidity: 0.72, snowfallDays: 5 },
      5: { avgHigh: 12, avgLow: 2, precipDays: 7, precipMm: 20, humidity: 0.70, snowfallDays: 2 },
      6: { avgHigh: 18, avgLow: 7, precipDays: 8, precipMm: 30, humidity: 0.72 },
      7: { avgHigh: 20, avgLow: 9, precipDays: 10, precipMm: 50, humidity: 0.78 },
      8: { avgHigh: 17, avgLow: 7, precipDays: 10, precipMm: 55, humidity: 0.80 },
      9: { avgHigh: 10, avgLow: 2, precipDays: 10, precipMm: 45, humidity: 0.78, snowfallDays: 2 },
      10: { avgHigh: 2, avgLow: -4, precipDays: 10, precipMm: 40, humidity: 0.75, snowfallDays: 6 },
      11: { avgHigh: -5, avgLow: -12, precipDays: 9, precipMm: 30, humidity: 0.72, snowfallDays: 8 },
      12: { avgHigh: -9, avgLow: -18, precipDays: 9, precipMm: 30, humidity: 0.70, snowfallDays: 9 },
    },
  },
};
