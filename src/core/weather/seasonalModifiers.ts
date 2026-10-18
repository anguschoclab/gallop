/**
 * seasonalModifiers.ts - Regional seasonal pattern modifiers
 *
 * Applies real-world seasonal patterns like monsoons, Mediterranean dry summers,
 * hurricane seasons, and other regional climate phenomena.
 */

import { TRACK_BY_ID } from "@/core/data/tracksAccessor";

/** Seasonal modifier configuration */
export interface SeasonalModifier {
  /** Months (1-12) when modifier applies */
  months: number[];
  /** Rain probability boost (0-1) */
  rainBoost?: number;
  /** Storm probability boost (0-1) */
  stormBoost?: number;
  /** Humidity boost (0-1) */
  humidityBoost?: number;
  /** Rain probability suppression multiplier (0-1) */
  rainSuppression?: number;
  /** Clear weather boost (0-1) */
  clearBoost?: number;
  /** Temperature boost (fractional, e.g., 0.15 = +15%) */
  heatBoost?: number;
  /** Overcast boost (0-1) */
  overcastBoost?: number;
  /** Average thunderstorm days for this pattern */
  thunderstormDays?: number;
}

/** Regional pattern definitions */
export const SEASONAL_MODIFIERS: Record<string, SeasonalModifier> = {
  // ===========================================================================
  // MONSOON PATTERNS
  // ===========================================================================

  /** East Asian Monsoon (Japan, Korea, eastern China) - June to September */
  east_asian_monsoon: {
    months: [6, 7, 8, 9],
    rainBoost: 0.25,
    stormBoost: 0.15,
    humidityBoost: 0.1,
  },

  /** Indian Monsoon - June to September */
  indian_monsoon: {
    months: [6, 7, 8, 9],
    rainBoost: 0.35,
    stormBoost: 0.2,
    humidityBoost: 0.15,
  },

  /** Southeast Asian Monsoon (Singapore, Malaysia) - November to March */
  southeast_asian_monsoon: {
    months: [11, 12, 1, 2, 3],
    rainBoost: 0.3,
    stormBoost: 0.15,
    humidityBoost: 0.12,
  },

  /** Australian Monsoon - December to March */
  australian_monsoon: {
    months: [12, 1, 2, 3],
    rainBoost: 0.28,
    stormBoost: 0.12,
    humidityBoost: 0.1,
  },

  // ===========================================================================
  // DRY SEASON PATTERNS
  // ===========================================================================

  /** Mediterranean Dry Summer - May to October */
  mediterranean_dry: {
    months: [5, 6, 7, 8, 9, 10],
    rainSuppression: 0.8,
    clearBoost: 0.3,
  },

  /** California Dry Season - May to October */
  california_dry: {
    months: [5, 6, 7, 8, 9, 10],
    rainSuppression: 0.85,
    clearBoost: 0.35,
  },

  /** Brazilian Dry Winter - May to September */
  brazilian_dry: {
    months: [5, 6, 7, 8, 9],
    rainSuppression: 0.5,
    clearBoost: 0.15,
  },

  // ===========================================================================
  // STORM/HURRICANE SEASONS
  // ===========================================================================

  /** Atlantic Hurricane Season - August to October */
  atlantic_hurricane: {
    months: [8, 9, 10],
    stormBoost: 0.2,
    rainBoost: 0.1,
  },

  /** Pacific Typhoon Season (Japan) - July to October */
  pacific_typhoon: {
    months: [7, 8, 9, 10],
    stormBoost: 0.18,
    rainBoost: 0.08,
  },

  /** Australian Cyclone Season - November to April */
  australian_cyclone: {
    months: [11, 12, 1, 2, 3, 4],
    stormBoost: 0.15,
    rainBoost: 0.12,
  },

  // ===========================================================================
  // SPECIALIZED PATTERNS
  // ===========================================================================

  /** Japanese Rainy Season (Tsuyu) - June to July */
  tsuyu: {
    months: [6, 7],
    rainBoost: 0.3,
    overcastBoost: 0.2,
    humidityBoost: 0.15,
  },

  /** Japanese Autumn Rain (Shurin) - September to October */
  autumn_rain: {
    months: [9, 10],
    rainBoost: 0.15,
    stormBoost: 0.1,
  },

  /** Australian Bushfire Season - December to February */
  bushfire_season: {
    months: [12, 1, 2],
    heatBoost: 0.15,
    clearBoost: 0.2,
    rainSuppression: 0.4,
  },

  /** European Summer Thunderstorms - June to August */
  european_summer_storms: {
    months: [6, 7, 8],
    thunderstormDays: 5,
    rainBoost: 0.1,
  },

  /** North American Spring Storms - March to May */
  spring_storms: {
    months: [3, 4, 5],
    stormBoost: 0.12,
    rainBoost: 0.15,
  },

  /** UK Winter Rain Peak - October to January */
  uk_winter_rain: {
    months: [10, 11, 12, 1],
    rainBoost: 0.15,
    overcastBoost: 0.1,
  },
};

/** Maps region identifiers to their applicable seasonal patterns */
export const REGIONAL_PATTERNS: Record<string, string[]> = {
  // Japan - Complex pattern with tsuyu, typhoon season, autumn rains
  japan: ["east_asian_monsoon", "tsuyu", "autumn_rain", "pacific_typhoon"],

  // Southeast Asia - Monsoon and cyclone seasons
  singapore: ["southeast_asian_monsoon"],
  hong_kong: ["east_asian_monsoon", "pacific_typhoon"],

  // Mediterranean regions - Dry summers
  spain: ["mediterranean_dry"],
  italy: ["mediterranean_dry"],
  southern_california: ["california_dry"],

  // Desert regions - Minimal rain year-round
  uae: [],
  saudi_arabia: [],

  // South America
  brazil: ["brazilian_dry"],
  chile: ["mediterranean_dry"], // Csb climate
  argentina: [], // Cfa - year-round precipitation

  // Australia - Bushfire and cyclone seasons
  australia_nsw: ["australian_monsoon", "bushfire_season", "australian_cyclone"],
  australia_vic: ["australian_monsoon", "bushfire_season", "australian_cyclone"],

  // North America
  florida: ["atlantic_hurricane"], // Aw climate
  gulf_coast: ["atlantic_hurricane", "spring_storms"],
  northeast_usa: ["spring_storms"],
  midwest_usa: ["spring_storms", "european_summer_storms"],
  california: ["california_dry"],

  // Europe
  uk: ["uk_winter_rain"],
  ireland: ["uk_winter_rain"],
  france: [],
  germany: ["european_summer_storms"],
  scandinavia: [],

  // No special patterns
  canada: [],
  czech: [],
  austria: ["european_summer_storms"],
  hungary: ["european_summer_storms"],
  turkey: ["mediterranean_dry"],
};

/** Country to region mapping for pattern lookup */
export const COUNTRY_TO_REGION: Record<string, string> = {
  Japan: "japan",
  Singapore: "singapore",
  "Hong Kong": "hong_kong",
  Spain: "spain",
  Italy: "italy",
  Brazil: "brazil",
  Chile: "chile",
  Argentina: "argentina",
  Australia: "australia_nsw", // Default, overridden by track
  "New Zealand": "australia_nsw", // Similar Southern Hemisphere patterns
  UAE: "uae",
  "Saudi Arabia": "saudi_arabia",
  "Great Britain": "uk",
  Ireland: "ireland",
  France: "france",
  Germany: "germany",
  Sweden: "scandinavia",
  Norway: "scandinavia",
  Denmark: "scandinavia",
  Canada: "canada",
  USA: "northeast_usa", // Default, overridden by track
  Turkey: "turkey",
  "Czech Republic": "czech",
  Austria: "austria",
  Hungary: "hungary",
  Belgium: "france", // Similar patterns
};

/** Track-level region overrides where country defaults are too broad. */
export const TRACK_REGION_OVERRIDES: Record<string, string> = {
  // USA
  "b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d": "midwest_usa", // Churchill Downs
  "c2b3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e": "northeast_usa", // Pimlico
  "d3c4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f": "northeast_usa", // Belmont Park
  "e4d5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a": "northeast_usa", // Saratoga
  "f5e6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b": "southern_california", // Santa Anita
  "a6f7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c": "midwest_usa", // Keeneland
  "b7a8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d": "southern_california", // Del Mar
  "c8b9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e": "northeast_usa", // Aqueduct
  "d9c0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f": "gulf_coast", // Oaklawn Park
  "e0d1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a": "florida", // Gulfstream Park
  "b53304b4-2747-a9df-c4e0-eae0a22d26d6": "northeast_usa", // Monmouth Park
  "17811b18-c6f8-189a-e337-3059c7141fc1": "gulf_coast", // Fair Grounds
  "8f50ddd3-8a52-3d59-1a7c-4dbcfc18f687": "florida", // Tampa Bay Downs
  "a3c468c5-780d-be43-eb9b-1c52fd9e5293": "gulf_coast", // Lone Star Park
  "a03edeab-959e-1f62-a2ab-fe5e4d872b7d": "northeast_usa", // Belmont at the Big A

  // Australia
  "a1b2c3d4-e5f6-4a7b-8c9d-1e2f3a4b5c6d": "australia_vic", // Flemington
  "b2c3d4e5-f6a7-4b8c-9d0e-2f3a4b5c6d7e": "australia_nsw", // Randwick
  "c3d4e5f6-a7b8-4c9d-0e1f-3a4b5c6d7e8f": "australia_vic", // Caulfield
  "d4e5f6a7-b8c9-4d0e-1f2a-4b5c6d7e8f9a": "australia_vic", // Moonee Valley
  "e5f6a7b8-c9d0-4e1f-2a3b-5c6d7e8f9a0b": "australia_nsw", // Rosehill
  "15077747-ba2f-c5e3-b512-df3dc38e5b48": "australia_nsw", // Eagle Farm
  "af5bb92b-4c42-3ac2-8309-684ae631a644": "australia_vic", // Morphettville
};

function getRegionalSeasonalModifiers(region: string, month: number): SeasonalModifier[] {
  const patternKeys = REGIONAL_PATTERNS[region] ?? [];
  const result: SeasonalModifier[] = [];
  for (const key of patternKeys) {
    const modifier = SEASONAL_MODIFIERS[key];
    if (modifier?.months.includes(month)) result.push(modifier);
  }
  return result;
}

/**
 * Get seasonal modifiers for a country and month
 * @param country
 * @param month
 */
export function getSeasonalModifiers(country: string, month: number): SeasonalModifier[] {
  return getRegionalSeasonalModifiers(COUNTRY_TO_REGION[country] ?? "", month);
}

/**
 * Get seasonal modifiers for a specific track. Track overrides win so broad
 * country defaults (for example USA -> northeast) do not erase local climates.
 * @param trackId - Track identifier used to resolve the regional override
 * @param month - Month number used for the seasonal pattern lookup
 */
export function getSeasonalModifiersForTrack(trackId: string, month: number): SeasonalModifier[] {
  const track = TRACK_BY_ID[trackId];
  const region = TRACK_REGION_OVERRIDES[trackId] ?? COUNTRY_TO_REGION[track?.country ?? ""] ?? "";
  return getRegionalSeasonalModifiers(region, month);
}

/**
 * Apply modifiers to a transition matrix row
 * @param base
 * @param modifiers
 */
export function applyModifiers(
  base: Record<string, number>,
  modifiers: SeasonalModifier[],
): Record<string, number> {
  const result = { ...base };

  for (const mod of modifiers) {
    // Apply boosts
    if (mod.rainBoost) {
      result.shower = (result.shower ?? 0) * (1 + mod.rainBoost);
      result.rain = (result.rain ?? 0) * (1 + mod.rainBoost);
    }

    if (mod.stormBoost) {
      result.storm = (result.storm ?? 0) * (1 + mod.stormBoost);
    }

    if (mod.humidityBoost) {
      // Humidity is handled separately in weather generation
    }

    if (mod.clearBoost) {
      result.clear = (result.clear ?? 0) * (1 + mod.clearBoost);
    }

    if (mod.overcastBoost) {
      result.overcast = (result.overcast ?? 0) * (1 + mod.overcastBoost);
    }

    // Apply suppressions
    if (mod.rainSuppression) {
      result.shower = (result.shower ?? 0) * (1 - mod.rainSuppression);
      result.rain = (result.rain ?? 0) * (1 - mod.rainSuppression);
      result.storm = (result.storm ?? 0) * (1 - mod.rainSuppression * 0.5);
    }
  }

  // Normalize to ensure probabilities sum to 1
  const sum = Object.values(result).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const key of Object.keys(result)) {
      result[key] = result[key] / sum;
    }
  }

  return result;
}
