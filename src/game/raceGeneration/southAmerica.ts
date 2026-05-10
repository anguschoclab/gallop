/**
 * raceGeneration/southAmerica.ts - South American race generator
 *
 * Focus: Mixed surfaces, similar to NA but with more maiden/stakes focus.
 */

import type { Race, RaceClass, ClaimingPrice } from "../types";
import type { Track } from "../tracks";
import type { Rng } from "@/game/rng";
import { generateUUID } from "@/game/uuid";
import { randomWeather, rand } from "@/core/common/random";
import { randomTrackConditionWithClimateBias } from "@/core/trackConditions";
import { generateRaceName } from "@/core/race/naming/raceNameGenerator";
import { CLASS_CONFIG } from "./raceGen";

const SA_RACE_DISTRIBUTION: { class: RaceClass; probability: number }[] = [
  { class: "Maiden", probability: 0.4 },
  { class: "Claiming", probability: 0.3 },
  { class: "Stakes", probability: 0.2 },
  { class: "Allowance", probability: 0.1 },
];

const SA_CLAIMING_PRICES: ClaimingPrice[] = [2000, 4000, 6000, 8000, 12000, 15000];

function selectSARaceClass(rng: Rng): RaceClass {
  const r = rng.next();
  let cumulative = 0;
  for (const item of SA_RACE_DISTRIBUTION) {
    cumulative += item.probability;
    if (r < cumulative) return item.class;
  }
  return "Maiden";
}

export function generateSouthAmericanRace(
  track: Track,
  day: number,
  rng: Rng,
  surface?: "Turf" | "Dirt" | "Synthetic",
  usedNames?: Set<string>,
): Race {
  const raceClass = selectSARaceClass(rng);
  const cfg = CLASS_CONFIG[raceClass];

  const trackSurfaces = track.courses.map((c) => c.surface) as ("Turf" | "Dirt" | "Synthetic")[];
  const selectedSurface = surface || rng.pick(trackSurfaces.length > 0 ? trackSurfaces : ["Dirt"]);

  const distance = rand(cfg.dist[0] / 100, cfg.dist[1] / 100, rng) * 100;

  let claimingPrice: ClaimingPrice | undefined;
  if (raceClass === "Claiming") {
    claimingPrice = rng.pick(SA_CLAIMING_PRICES);
  }

  const name = generateRaceName({
    track,
    raceClass,
    claimingPrice,
    usedNames,
    surface: selectedSurface,
    distance,
    rng,
  });

  const race: Race = {
    id: generateUUID(rng),
    name,
    day,
    distance,
    raceClass,
    entryFee: cfg.entry,
    purse: cfg.purse,
    minStat: cfg.minStat,
    fieldSize: rand(8, 12, rng),
    entries: [],
    resolved: false,
    weather: randomWeather(rng),
    trackCondition: randomTrackConditionWithClimateBias(rng, "temperate", "dirt"),
    trackId: track.id,
    surface: selectedSurface,
  };

  if (claimingPrice) {
    race.claimingPrice = claimingPrice;
    race.purse = claimingPrice * 1.5 + rng.int(0, 2000);
  }

  return race;
}

export function generateSouthAmericanRaceCard(
  track: Track,
  day: number,
  numRaces: number,
  rng: Rng,
): Race[] {
  const races: Race[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < numRaces; i++) {
    races.push(generateSouthAmericanRace(track, day, rng, undefined, usedNames));
  }
  return races;
}
