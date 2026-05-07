import type { Rng } from "@/game/rng";
import type { Weather } from "@/game/types";

/**
 * Generate random weather condition
 */
export function randomWeather(rng: Rng): Weather {
  const r = rng.next();
  if (r < 0.45) return "sunny";
  if (r < 0.7) return "cloudy";
  if (r < 0.85) return "rainy";
  if (r < 0.95) return "sunset";
  return "night";
}
