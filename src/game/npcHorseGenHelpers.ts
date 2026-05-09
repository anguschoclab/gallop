import type { StableTier } from "./types";
import type { Rng } from "./rng";
import { rand } from "@/core/common/random";

export type AgeCategory = "2yo" | "prime" | "veteran" | "breeding";

export function rollAgeCategory(rng: Rng): AgeCategory {
  const r = rng.next();
  if (r < 0.3) return "2yo";
  if (r < 0.7) return "prime";
  if (r < 0.9) return "veteran";
  return "breeding";
}

export function getAgeFromCategory(cat: AgeCategory, rng: Rng): number {
  switch (cat) {
    case "2yo":
      return 2;
    case "prime":
      return rng.next() < 0.5 ? 3 : 4;
    case "veteran":
      return rng.next() < 0.5 ? 5 : 6;
    case "breeding":
      return rand(7, 10, rng);
  }
}

export function calculateStartingFame(tier: StableTier, age: number, rng: Rng): number {
  const base =
    tier === "elite" ? rand(20, 40, rng) : tier === "mid" ? rand(10, 25, rng) : rand(0, 15, rng);
  return Math.min(100, base + (age - 2) * 3);
}
