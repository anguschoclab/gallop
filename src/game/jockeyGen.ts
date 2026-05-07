import { generateUUID } from "./uuid";
import type { Rng } from "./rng";
import type { Jockey, JockeyArchetype, JockeyStats, JockeyTrait, JockeySilk } from "./types";
import { generateProceduralJockeyName } from "@/core/jockey/proceduralNaming";
import type { RegionalSystem } from "./types";

const ARCHETYPES: JockeyArchetype[] = [
  "front_runner",
  "closer",
  "clinical",
  "finisher",
  "versatile",
];

export type JockeyGenerationOptions = {
  tier?: "budget" | "mid" | "elite";
  rng: Rng;
  region?: RegionalSystem;
  usedNames?: Set<string>;
};

export function generateJockey({ tier = "mid", rng, region = "north_america", usedNames }: JockeyGenerationOptions): Jockey {
  const archetype = rng.pick(ARCHETYPES);
  const name = generateProceduralJockeyName(region, rng, usedNames);
  if (usedNames) usedNames.add(name.toLowerCase());

  const baseMin = tier === "elite" ? 75 : tier === "mid" ? 55 : 35;
  const baseMax = tier === "elite" ? 98 : tier === "mid" ? 80 : 60;

  const stats: JockeyStats = {
    pacing: rng.range(baseMin, baseMax),
    positioning: rng.range(baseMin, baseMax),
    vigor: rng.range(baseMin, baseMax),
    gateSkill: rng.range(baseMin, baseMax),
    temperament: rng.range(baseMin, baseMax),
  };

  const traits: JockeyTrait[] = [];

  // Apply archetype bonuses and traits
  switch (archetype) {
    case "front_runner":
      stats.gateSkill += 15;
      stats.pacing += 10;
      stats.vigor -= 10;
      traits.push("gate_master");
      break;
    case "closer":
      stats.vigor += 15;
      stats.positioning += 10;
      stats.gateSkill -= 10;
      traits.push("hill_specialist");
      break;
    case "clinical":
      stats.positioning += 15;
      stats.pacing += 10;
      traits.push("bullring_expert");
      break;
    case "finisher":
      stats.vigor += 20;
      stats.gateSkill += 5;
      stats.pacing -= 10;
      traits.push("long_straight_pro");
      break;
    case "versatile":
      stats.pacing += 5;
      stats.positioning += 5;
      stats.vigor += 5;
      stats.gateSkill += 5;
      stats.temperament += 5;
      if (rng.next() < 0.2) traits.push(rng.pick(["gate_master", "hill_specialist"]));
      break;
  }

  // Clamp stats
  Object.keys(stats).forEach((k) => {
    stats[k as keyof JockeyStats] = Math.min(100, Math.max(10, stats[k as keyof JockeyStats]));
  });

  // Career history: older jockeys have more starts
  const age = 18 + Math.floor(rng.next() * 35);
  const yearsActive = age - 18;
  const careerStarts = Math.floor(yearsActive * (50 + rng.next() * 150));
  const winRate = 0.05 + (stats.vigor + stats.pacing) / 1000 + rng.next() * 0.1;
  const careerWins = Math.floor(careerStarts * winRate);

  const totalStats =
    (stats.pacing + stats.positioning + stats.vigor + stats.gateSkill + stats.temperament) / 5;

  return {
    id: generateUUID(),
    name,
    age,
    archetype,
    stats,
    traits,
    silk: generateSilk(rng),
    careerStarts,
    careerWins,
    fame: Math.min(100, totalStats + careerWins / 100),
    ridingFee: Math.round(50 + Math.min(100, totalStats + careerWins / 100) * 10),
  };
}

export const SILK_PALETTE: string[] = [
  "#dc2626",
  "#ea580c",
  "#f59e0b",
  "#facc15",
  "#84cc16",
  "#16a34a",
  "#10b981",
  "#06b6d4",
  "#0ea5e9",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#0f172a",
  "#ffffff",
  "#78716c",
  "#57534e",
];
export const SILK_PATTERNS: JockeySilk["pattern"][] = [
  "solid",
  "stripes",
  "halves",
  "quarters",
  "chevron",
  "diamond",
  "star",
  "sash",
  "hoops",
];

export function generateSilk(rng: Rng): JockeySilk {
  const primary = rng.pick(SILK_PALETTE);
  let secondary = rng.pick(SILK_PALETTE);
  // Avoid same color
  let tries = 0;
  while (secondary === primary && tries++ < 5) secondary = rng.pick(SILK_PALETTE);
  const cap = rng.pick(SILK_PALETTE);
  const pattern = rng.pick(SILK_PATTERNS);
  return { pattern, primary, secondary, cap };
}

export function generateInitialJockeys(rng: Rng, count: number = 20, usedNames?: Set<string>): Jockey[] {
  const jockeys: Jockey[] = [];
  const regions: RegionalSystem[] = ["north_america", "europe", "australia", "asia", "south_america"];
  
  for (let i = 0; i < count; i++) {
    const r = rng.next();
    const tier = r < 0.15 ? "elite" : r < 0.6 ? "mid" : "budget";
    const region = regions[i % regions.length];
    jockeys.push(generateJockey({ tier, rng, region, usedNames }));
  }
  return jockeys;
}
