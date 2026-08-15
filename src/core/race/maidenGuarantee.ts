import type { Race, Track } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { rand, randomWeather } from "@/core/common/random";
import { randomTrackConditionWithClimateBias } from "@/core/race/trackConditions";
import { randomRaceName } from "@/core/race/naming/legacyFallback";
import { CLASS_CONFIG } from "@/core/race/generation/raceGen";
import { dayOfYear } from "@/core/calendar/dateFormatting";
import {
  MAIDEN_GUARANTEE_DAY_OF_YEAR_LIMIT,
  MAIDEN_FIELD_SIZE_MIN,
  MAIDEN_FIELD_SIZE_MAX,
  TWOYO_AGE,
  TWOYO_DISTANCE_BANDS,
  TWOYO_RACE_FIELD_SIZE_MIN,
  TWOYO_RACE_FIELD_SIZE_MAX,
  TWOYO_MSW_MIN_STAT,
  TWOYO_RACE_ENTRY_FEE,
  TWOYO_RACE_PURSE,
} from "@/constants";

function isStarterEligibleMaiden(race: Race): boolean {
  return race.raceClass.toLowerCase().includes("maiden") && race.minStat === undefined;
}

function createMaidenRace(
  day: number,
  rng: Rng,
  trackId?: string,
  surface?: "Turf" | "Dirt" | "Synthetic",
): Race {
  const cfg = CLASS_CONFIG["Maiden"];
  const distance = rand(cfg.dist[0] / 100, cfg.dist[1] / 100, rng) * 100;
  return {
    id: generateUUID(rng),
    name: randomRaceName(rng),
    day,
    distance,
    raceClass: "Maiden",
    entryFee: cfg.entry,
    purse: cfg.purse,
    minStat: undefined,
    fieldSize: rand(MAIDEN_FIELD_SIZE_MIN, MAIDEN_FIELD_SIZE_MAX, rng),
    entries: [],
    resolved: false,
    weather: randomWeather(rng),
    trackCondition: randomTrackConditionWithClimateBias(rng, "temperate", "turf"),
    trackId,
    surface,
  };
}

export function ensureMaidenRaces(races: Race[], fromDay: number, toDay: number, rng: Rng): Race[] {
  const result = [...races];
  for (let d = fromDay; d <= toDay; d++) {
    const hasMaiden = result.some((r) => r.day === d && isStarterEligibleMaiden(r));
    if (!hasMaiden) {
      result.push(createMaidenRace(d, rng));
    }
  }
  return result;
}

export function ensureMaidenInCard(races: Race[], day: number, track: Track, rng: Rng): Race[] {
  const doy = dayOfYear(day);
  if (doy > MAIDEN_GUARANTEE_DAY_OF_YEAR_LIMIT) return races;

  const hasMaiden = races.some(isStarterEligibleMaiden);
  if (hasMaiden) return races;

  const surface = track.courses[0]?.surface as "Turf" | "Dirt" | "Synthetic" | undefined;
  return [...races, createMaidenRace(day, rng, track.id, surface ?? "Dirt")];
}

// ============================================================================
// 2YO RACE GUARANTEE
// ============================================================================

type DistanceBandKey = keyof typeof TWOYO_DISTANCE_BANDS;

function is2yoRace(race: Race): boolean {
  return race.restrictions?.minAge === TWOYO_AGE && race.restrictions?.maxAge === TWOYO_AGE;
}

function getDistanceBand(distance: number): DistanceBandKey | null {
  for (const [key, band] of Object.entries(TWOYO_DISTANCE_BANDS)) {
    if (distance >= band.min && distance <= band.max) {
      return key as DistanceBandKey;
    }
  }
  return null;
}

function create2yoRace(
  day: number,
  bandKey: DistanceBandKey,
  rng: Rng,
  trackId?: string,
  surface?: "Turf" | "Dirt" | "Synthetic",
): Race {
  const band = TWOYO_DISTANCE_BANDS[bandKey];
  const distance = rand(band.min / 100, band.max / 100, rng) * 100;
  return {
    id: generateUUID(rng),
    name: randomRaceName(rng),
    day,
    distance,
    raceClass: "MaidenSpecialWeight",
    entryFee: TWOYO_RACE_ENTRY_FEE,
    purse: TWOYO_RACE_PURSE,
    minStat: TWOYO_MSW_MIN_STAT,
    fieldSize: rand(TWOYO_RACE_FIELD_SIZE_MIN, TWOYO_RACE_FIELD_SIZE_MAX, rng),
    entries: [],
    resolved: false,
    weather: randomWeather(rng),
    trackCondition: randomTrackConditionWithClimateBias(rng, "temperate", "turf"),
    trackId,
    surface,
    restrictions: { minAge: TWOYO_AGE, maxAge: TWOYO_AGE },
  };
}

export function ensure2yoRaces(races: Race[], fromDay: number, toDay: number, rng: Rng): Race[] {
  const result = [...races];

  for (let d = fromDay; d <= toDay; d++) {
    const dayRaces = result.filter((r) => r.day === d);
    const coveredBands = new Set<DistanceBandKey>();

    for (const race of dayRaces) {
      if (is2yoRace(race)) {
        const band = getDistanceBand(race.distance);
        if (band) coveredBands.add(band);
      }
    }

    for (const bandKey of Object.keys(TWOYO_DISTANCE_BANDS) as DistanceBandKey[]) {
      if (!coveredBands.has(bandKey)) {
        result.push(create2yoRace(d, bandKey, rng));
      }
    }
  }

  return result;
}
