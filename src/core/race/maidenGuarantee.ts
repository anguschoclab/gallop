import type { Race, Track } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { rand, randomWeather } from "@/core/common/random";
import { randomTrackConditionWithClimateBias } from "@/core/race/trackConditions";
import { randomRaceName } from "@/core/race/naming/legacyFallback";
import { CLASS_CONFIG } from "@/core/race/generation/raceGen";
import { dayOfYear } from "@/core/calendar/dateFormatting";

function isStarterEligibleMaiden(race: Race): boolean {
  return (
    race.raceClass.toLowerCase().includes("maiden") &&
    race.minStat === undefined
  );
}

function createMaidenRace(day: number, rng: Rng, trackId?: string, surface?: "Turf" | "Dirt" | "Synthetic"): Race {
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
    fieldSize: rand(6, 8, rng),
    entries: [],
    resolved: false,
    weather: randomWeather(rng),
    trackCondition: randomTrackConditionWithClimateBias(rng, "temperate", "turf"),
    trackId,
    surface,
  };
}

export function ensureMaidenRaces(
  races: Race[],
  fromDay: number,
  toDay: number,
  rng: Rng,
): Race[] {
  const result = [...races];
  for (let d = fromDay; d <= toDay; d++) {
    const hasMaiden = result.some((r) => r.day === d && isStarterEligibleMaiden(r));
    if (!hasMaiden) {
      result.push(createMaidenRace(d, rng));
    }
  }
  return result;
}

export function ensureMaidenInCard(
  races: Race[],
  day: number,
  track: Track,
  rng: Rng,
): Race[] {
  const doy = dayOfYear(day);
  if (doy > 60) return races;

  const hasMaiden = races.some(isStarterEligibleMaiden);
  if (hasMaiden) return races;

  const surface = track.courses[0]?.surface as "Turf" | "Dirt" | "Synthetic" | undefined;
  return [...races, createMaidenRace(day, rng, track.id, surface ?? "Dirt")];
}
