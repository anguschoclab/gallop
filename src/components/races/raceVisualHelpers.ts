import type { Weather } from "@/game/types";
import type { Runner } from "@/game/raceSim";
import { beyerFigure } from "@/game/beyer";

/**
 * Returns the background image URL for a given track surface.
 * @param surface - The track surface type (Turf, Dirt, Synthetic)
 * @returns CSS url() string for the background image, or undefined if surface is unknown
 */
export function getTrackBackground(surface?: string): string | undefined {
  switch (surface) {
    case "Turf":
      return "url(/assets/track-turf.png)";
    case "Dirt":
      return "url(/assets/track-dirt.png)";
    case "Synthetic":
      return "url(/assets/track-synthetic.png)";
    default:
      return undefined;
  }
}

/**
 * Returns the background image URL for a given weather condition.
 * @param weather - The weather condition (sunny, cloudy, rainy, sunset, night)
 * @returns CSS url() string for the sky background image, or undefined if weather is unknown
 */
export function getSkyBackground(weather?: Weather): string | undefined {
  switch (weather) {
    case "sunny":
      return "url(/assets/bg-sky-sunny.png)";
    case "cloudy":
      return "url(/assets/bg-sky-cloudy.png)";
    case "rainy":
      return "url(/assets/bg-sky-pouring.png)";
    case "sunset":
      return "url(/assets/bg-sky-sunset.png)";
    case "night":
      return "url(/assets/bg-sky-night.png)";
    default:
      return undefined;
  }
}

/**
 * Returns a user-friendly display string for a weather condition with emoji.
 * @param weather - The weather condition
 * @returns Formatted string with emoji and weather name, or empty string if unknown
 */
export function getWeatherDisplay(weather?: Weather): string {
  switch (weather) {
    case "sunny":
      return "☀️ Sunny";
    case "cloudy":
      return "☁️ Cloudy";
    case "rainy":
      return "🌧️ Rainy";
    case "sunset":
      return "🌅 Sunset";
    case "night":
      return "🌙 Night";
    default:
      return "";
  }
}

// Sprite sheet configuration
const ANIMATED_SPRITES = [
  "bay", "black", "chestnut", "dark-bay", "gray",
  "roan", "palomino", "white",
  "seal-brown", "liver-chestnut", "buckskin", "dun", "grulla", "champagne"
];

const COAT_TO_SPRITE: Record<string, string> = {
  bay: "b",
  black: "bl",
  chestnut: "ch",
  "dark-bay": "dkb",
  gray: "gr",
  roan: "roan",
  palomino: "palomino",
  white: "white",
  "seal-brown": "seal",
  "liver-chestnut": "liver",
  buckskin: "buck",
  dun: "dun",
  grulla: "grulla",
  champagne: "champagne",
};

/**
 * Returns the sprite image URL for a given horse coat color.
 * @param coatColor - The horse's coat color
 * @returns Path to the sprite image, or undefined if color is unknown
 */
export function getSpriteUrl(coatColor?: string): string | undefined {
  if (!coatColor) return undefined;
  const sprite = COAT_TO_SPRITE[coatColor];
  return sprite ? `/assets/horse-${sprite}.png` : undefined;
}

/**
 * Checks if a coat color has an animated sprite available.
 * @param coatColor - The horse's coat color
 * @returns true if the color has an animated sprite, false otherwise
 */
export function isAnimatedSprite(coatColor?: string): boolean {
  if (!coatColor) return false;
  return ANIMATED_SPRITES.includes(coatColor);
}

/**
 * Calculates the CSS animation duration for a horse sprite based on velocity.
 * @param velocity - The horse's velocity in m/s
 * @returns CSS duration string in seconds
 */
export function getAnimationDuration(velocity: number): string {
  const baseSpeed = 15;
  const duration = Math.max(0.3, Math.min(0.8, 0.6 * (baseSpeed / Math.max(velocity, 5))));
  return `${duration.toFixed(2)}s`;
}

/**
 * Calculates the projected Beyer figure for a runner during a race simulation.
 * Uses the finish time if the horse has finished, otherwise projects based on current position and velocity.
 * @param r - The runner with position, velocity, and finish time
 * @param distance - Total race distance in meters
 * @param simTime - Current simulation time
 * @param classBonus - Class bonus for the race
 * @returns Projected Beyer figure, or null if calculation is not possible
 */
export function projectedBeyer(r: Runner, distance: number, simTime: number, classBonus: number): number | null {
  if (r.finishTime !== null) {
    return beyerFigure({ distance, finishTime: r.finishTime, classBonus });
  }
  if (r.position <= 0 || r.velocity <= 0.5) return null;
  const remaining = distance - r.position;
  const projFinish = simTime + remaining / r.velocity;
  return beyerFigure({ distance, finishTime: projFinish, classBonus });
}
