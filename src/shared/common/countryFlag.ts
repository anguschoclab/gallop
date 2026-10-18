/**
 * countryFlag.ts - Country name → flag emoji helpers
 *
 * Maps country names used in graded race data to their flag emoji for
 * compact UI display next to year stamps and trophies.
 */

const COUNTRY_TO_FLAG: Record<string, string> = {
  USA: "🇺🇸",
  Canada: "🇨🇦",
  "Great Britain": "🇬🇧",
  UK: "🇬🇧",
  Ireland: "🇮🇪",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Italy: "🇮🇹",
  Spain: "🇪🇸",
  UAE: "🇦🇪",
  "Saudi Arabia": "🇸🇦",
  Turkey: "🇹🇷",
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  "Czech Republic": "🇨🇿",
  Hungary: "🇭🇺",
  Sweden: "🇸🇪",
  Norway: "🇳🇴",
  Denmark: "🇩🇰",
  Japan: "🇯🇵",
  "Hong Kong": "🇭🇰",
  Australia: "🇦🇺",
  "New Zealand": "🇳🇿",
  Singapore: "🇸🇬",
  Argentina: "🇦🇷",
  Brazil: "🇧🇷",
  Chile: "🇨🇱",
};

const REGION_TO_FLAG: Record<string, string> = {
  north_america: "🇺🇸",
  europe: "🇪🇺",
  asia_pacific: "🇦🇺",
  south_america: "🇦🇷",
};

const REGION_TO_COUNTRY_LABEL: Record<string, string> = {
  north_america: "North America",
  europe: "Europe",
  asia_pacific: "Asia-Pacific",
  south_america: "South America",
};

export function getCountryFlag(country?: string | null): string {
  if (!country) return "🏳️";
  return COUNTRY_TO_FLAG[country] ?? "🏳️";
}

export function getRegionFlag(region?: string | null): string {
  if (!region) return "🏳️";
  return REGION_TO_FLAG[region] ?? "🏳️";
}

export function getRegionCountryLabel(region?: string | null): string {
  if (!region) return "—";
  return REGION_TO_COUNTRY_LABEL[region] ?? region;
}
