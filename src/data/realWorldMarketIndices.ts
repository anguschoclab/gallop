/**
 * realWorldMarketIndices.ts - Real-world bloodstock reference indices
 *
 * Reference price indices for the thoroughbred market, expressed as index
 * numbers with 2015 = 100. Values are hand-curated approximations of published
 * sales medians and turnover trends (major yearling and breeding-stock sales)
 * plus per-venue strength for the best-known racecourses. They are reference
 * data only: the game blends them into its own traded price indexes so player
 * price alerts move in sympathy with real-world market trends.
 *
 * Dependencies: @/constants/calendarConstants (DAYS_PER_YEAR)
 * Related files: src/core/market/priceAlerts.ts
 */

import { DAYS_PER_YEAR } from "@/constants/calendarConstants";

export type RealWorldIndexSeries = {
  /** Human label for the series. */
  label: string;
  /** Where the shape of the series comes from. */
  source: string;
  /** Index values keyed by calendar year (2015 = 100). */
  values: Record<number, number>;
};

/** Years covered by every series, ascending. */
export const REAL_WORLD_INDEX_YEARS = [
  2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024,
] as const;

/** Whole-market reference: blended yearling + breeding stock median index. */
export const REAL_WORLD_MARKET_INDEX: RealWorldIndexSeries = {
  label: "Global bloodstock median",
  source: "Blended major yearling and breeding-stock sale medians",
  values: {
    2015: 100,
    2016: 103,
    2017: 108,
    2018: 112,
    2019: 109,
    2020: 88,
    2021: 104,
    2022: 118,
    2023: 121,
    2024: 126,
  },
};

/** Grade segments: black-type pedigrees ran hotter than the plain market. */
export const REAL_WORLD_GRADE_INDICES: Record<string, RealWorldIndexSeries> = {
  G1: {
    label: "Group/Grade 1 pedigree index",
    source: "Top-lot medians at premier select sales",
    values: {
      2015: 100,
      2016: 106,
      2017: 115,
      2018: 122,
      2019: 118,
      2020: 94,
      2021: 116,
      2022: 137,
      2023: 144,
      2024: 152,
    },
  },
  G2: {
    label: "Group/Grade 2 pedigree index",
    source: "Select sale upper-tier medians",
    values: {
      2015: 100,
      2016: 104,
      2017: 111,
      2018: 116,
      2019: 113,
      2020: 91,
      2021: 110,
      2022: 127,
      2023: 132,
      2024: 138,
    },
  },
  G3: {
    label: "Group/Grade 3 pedigree index",
    source: "Select sale mid-tier medians",
    values: {
      2015: 100,
      2016: 103,
      2017: 108,
      2018: 113,
      2019: 110,
      2020: 89,
      2021: 106,
      2022: 120,
      2023: 124,
      2024: 129,
    },
  },
  Listed: {
    label: "Listed pedigree index",
    source: "Open sale upper-quartile medians",
    values: {
      2015: 100,
      2016: 102,
      2017: 106,
      2018: 109,
      2019: 106,
      2020: 87,
      2021: 101,
      2022: 113,
      2023: 116,
      2024: 120,
    },
  },
  Ungraded: {
    label: "Unraced/ungraded index",
    source: "Open and mixed sale medians",
    values: {
      2015: 100,
      2016: 101,
      2017: 103,
      2018: 105,
      2019: 101,
      2020: 82,
      2021: 95,
      2022: 104,
      2023: 106,
      2024: 108,
    },
  },
};

/**
 * Per-venue reference strength, keyed by racecourse name. Courses whose horses
 * command a premium in the real market (Ascot, Churchill Downs, Flemington …)
 * carry stronger series than provincial tracks.
 */
export const REAL_WORLD_TRACK_INDICES: Record<string, RealWorldIndexSeries> = {
  Ascot: {
    label: "Ascot form premium",
    source: "Royal meeting graduates at European select sales",
    values: {
      2015: 100,
      2016: 107,
      2017: 116,
      2018: 124,
      2019: 120,
      2020: 96,
      2021: 118,
      2022: 139,
      2023: 147,
      2024: 155,
    },
  },
  Newmarket: {
    label: "Newmarket form premium",
    source: "Tattersalls October / Craven graduates",
    values: {
      2015: 100,
      2016: 105,
      2017: 113,
      2018: 119,
      2019: 115,
      2020: 93,
      2021: 114,
      2022: 132,
      2023: 138,
      2024: 145,
    },
  },
  "Churchill Downs": {
    label: "Churchill Downs form premium",
    source: "Derby-trail graduates at Keeneland September",
    values: {
      2015: 100,
      2016: 106,
      2017: 114,
      2018: 121,
      2019: 117,
      2020: 92,
      2021: 115,
      2022: 135,
      2023: 142,
      2024: 150,
    },
  },
  "Belmont Park": {
    label: "Belmont Park form premium",
    source: "NYRA graded graduates at Fasig-Tipton",
    values: {
      2015: 100,
      2016: 104,
      2017: 110,
      2018: 116,
      2019: 112,
      2020: 90,
      2021: 110,
      2022: 128,
      2023: 133,
      2024: 140,
    },
  },
  "Santa Anita Park": {
    label: "Santa Anita form premium",
    source: "Californian graded graduates",
    values: {
      2015: 100,
      2016: 102,
      2017: 107,
      2018: 111,
      2019: 106,
      2020: 85,
      2021: 102,
      2022: 116,
      2023: 119,
      2024: 123,
    },
  },
  "Saratoga Race Course": {
    label: "Saratoga form premium",
    source: "Saratoga meeting graduates at Fasig-Tipton Saratoga",
    values: {
      2015: 100,
      2016: 106,
      2017: 115,
      2018: 122,
      2019: 119,
      2020: 95,
      2021: 117,
      2022: 136,
      2023: 143,
      2024: 151,
    },
  },
  Flemington: {
    label: "Flemington form premium",
    source: "Melbourne Cup carnival graduates at Inglis Easter",
    values: {
      2015: 100,
      2016: 104,
      2017: 111,
      2018: 117,
      2019: 114,
      2020: 94,
      2021: 113,
      2022: 129,
      2023: 134,
      2024: 141,
    },
  },
  "Randwick Racecourse": {
    label: "Randwick form premium",
    source: "Sydney autumn carnival graduates at Magic Millions",
    values: {
      2015: 100,
      2016: 105,
      2017: 112,
      2018: 118,
      2019: 115,
      2020: 95,
      2021: 115,
      2022: 131,
      2023: 137,
      2024: 144,
    },
  },
  Longchamp: {
    label: "Longchamp form premium",
    source: "Arc weekend graduates at Arqana",
    values: {
      2015: 100,
      2016: 106,
      2017: 114,
      2018: 120,
      2019: 117,
      2020: 94,
      2021: 115,
      2022: 133,
      2023: 139,
      2024: 146,
    },
  },
  "Tokyo Racecourse": {
    label: "Tokyo form premium",
    source: "JRA graded graduates at JRHA Select Sale",
    values: {
      2015: 100,
      2016: 108,
      2017: 118,
      2018: 127,
      2019: 126,
      2020: 110,
      2021: 130,
      2022: 148,
      2023: 157,
      2024: 166,
    },
  },
};

/** How much weight the real-world reference carries in a blended index. */
export const REAL_WORLD_BLEND_WEIGHT = 0.35;

/**
 * The reference series for a scope, if one exists.
 *
 * @param kind - Scope kind: whole market, a grade bucket or a track
 * @param value - Grade name or track name for scoped lookups
 */
export function realWorldSeries(
  kind: "market" | "grade" | "track",
  value?: string,
): RealWorldIndexSeries | undefined {
  if (kind === "market") return REAL_WORLD_MARKET_INDEX;
  if (!value) return undefined;
  if (kind === "grade") return REAL_WORLD_GRADE_INDICES[value];
  return REAL_WORLD_TRACK_INDICES[value];
}

/**
 * Read a series at a simulation day. The ten-year series is walked
 * continuously — one in-game year per real year — and cycles once it runs out,
 * so the reference keeps producing real-world-shaped drift over long careers.
 *
 * @param series - Reference series
 * @param day - Simulation day (can be fractional)
 */
export function seriesValueAtDay(series: RealWorldIndexSeries, day: number): number {
  const years = REAL_WORLD_INDEX_YEARS;
  const span = years.length;
  const position = Math.max(0, day) / DAYS_PER_YEAR;
  const base = Math.floor(position) % span;
  const next = (base + 1) % span;
  const fraction = position - Math.floor(position);
  const from = series.values[years[base]] ?? 100;
  const to = series.values[years[next]] ?? from;
  return from + (to - from) * fraction;
}

/**
 * Signed percentage move of the real-world reference over a window ending at
 * `day`. Returns 0 when there is no series for the scope.
 *
 * @param args - Inputs
 * @param args.kind - Scope kind
 * @param args.value - Grade or track name
 * @param args.day - Current simulation day
 * @param args.windowDays - Window length in days
 */
export function realWorldMovePct(args: {
  kind: "market" | "grade" | "track";
  value?: string;
  day: number;
  windowDays: number;
}): number {
  const series = realWorldSeries(args.kind, args.value);
  if (!series) return 0;
  const windowDays = Math.max(1, args.windowDays);
  const current = seriesValueAtDay(series, args.day);
  const previous = seriesValueAtDay(series, args.day - windowDays);
  if (previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
}
