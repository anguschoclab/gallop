import type { Rng } from "@/game/rng";

/**
 * Generate random silk color (HSL)
 */
export function randomSilk(rng: Rng): string {
  const hues = [0, 30, 60, 120, 180, 240, 270, 300, 330];
  const hue = rng.pick(hues);
  return `hsl(${hue}, 70%, 50%)`;
}
