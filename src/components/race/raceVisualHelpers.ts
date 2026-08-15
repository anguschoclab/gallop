import type { Weather } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { beyerFigure } from "@/core/race/beyer";
import trackTurf from "@/assets/track-turf.png";
import trackDirt from "@/assets/track-dirt.png";
import trackSynthetic from "@/assets/track-synthetic.png";
import skySunny from "@/assets/bg-sky-sunny.png";
import skyCloudy from "@/assets/bg-sky-cloudy.png";
import skyPouring from "@/assets/bg-sky-pouring.png";
import skySunset from "@/assets/bg-sky-sunset.png";
import skyNight from "@/assets/bg-sky-night.png";
import horseB from "@/assets/horse-b.png";
import horseBl from "@/assets/horse-bl.png";
import horseCh from "@/assets/horse-ch.png";
import horseDkb from "@/assets/horse-dkb.png";
import horseGr from "@/assets/horse-gr.png";
import horseRoan from "@/assets/horse-roan.png";
import horsePalomino from "@/assets/horse-palomino.png";
import horseWhite from "@/assets/horse-white.png";
import horseSeal from "@/assets/horse-seal.png";
import horseLiver from "@/assets/horse-liver.png";
import horseBuck from "@/assets/horse-buck.png";
import horseDun from "@/assets/horse-dun.png";
import horseGrulla from "@/assets/horse-grulla.png";
import horseChampagne from "@/assets/horse-champagne.png";

/**
 * Returns the background image URL for a given track surface.
 * @param surface - The track surface type (Turf, Dirt, Synthetic)
 * @returns CSS url() string for the background image, or undefined if surface is unknown
 */
export function getTrackBackground(surface?: string): string | undefined {
  switch (surface) {
    case "Turf":
      return `url(${trackTurf})`;
    case "Dirt":
      return `url(${trackDirt})`;
    case "Synthetic":
      return `url(${trackSynthetic})`;
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
      return `url(${skySunny})`;
    case "cloudy":
      return `url(${skyCloudy})`;
    case "rainy":
      return `url(${skyPouring})`;
    case "sunset":
      return `url(${skySunset})`;
    case "night":
      return `url(${skyNight})`;
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

/**
 * Sprite sheet metadata. Every sheet is 6 frames wide; `frameHeight` is the
 * per-frame pixel height (some sheets are 50px tall, others 100px).
 */
export interface SpriteSheet {
  url: string;
  frames: number;
  frameWidth: number;
  frameHeight: number;
}

const sheet = (url: string, frameHeight: number): SpriteSheet => ({
  url,
  frames: 6,
  frameWidth: 50,
  frameHeight,
});

const COAT_TO_SPRITE_SHEET: Record<string, SpriteSheet> = {
  bay: sheet(horseB, 100),
  black: sheet(horseBl, 100),
  chestnut: sheet(horseCh, 100),
  "dark-bay": sheet(horseDkb, 100),
  gray: sheet(horseGr, 100),
  roan: sheet(horseRoan, 50),
  palomino: sheet(horsePalomino, 50),
  white: sheet(horseWhite, 50),
  "seal-brown": sheet(horseSeal, 100),
  "liver-chestnut": sheet(horseLiver, 100),
  buckskin: sheet(horseBuck, 100),
  dun: sheet(horseDun, 100),
  grulla: sheet(horseGrulla, 100),
  champagne: sheet(horseChampagne, 100),
};

/**
 * Returns the full sprite sheet descriptor for a coat color.
 */
export function getSpriteSheet(coatColor?: string): SpriteSheet | undefined {
  if (!coatColor) return undefined;
  return COAT_TO_SPRITE_SHEET[coatColor];
}

/**
 * Returns the sprite image URL for a given horse coat color.
 * @param coatColor - The horse's coat color
 * @returns Bundled URL of the sprite sheet, or undefined if color is unknown
 */
export function getSpriteUrl(coatColor?: string): string | undefined {
  return getSpriteSheet(coatColor)?.url;
}

/**
 * Checks if a coat color has an animated (multi-frame) sprite sheet available.
 * @param coatColor - The horse's coat color
 * @returns true if the color has an animated sprite, false otherwise
 */
export function isAnimatedSprite(coatColor?: string): boolean {
  const s = getSpriteSheet(coatColor);
  return !!s && s.frames > 1;
}

/**
 * Returns all unique sprite sheet URLs bundled in the app.
 */
export function getAllSpriteUrls(): string[] {
  return [...new Set(Object.values(COAT_TO_SPRITE_SHEET).map((s) => s.url))];
}

export type SpriteLoadStatus = "loading" | "loaded" | "error";

const spriteLoadCache = new Map<string, SpriteLoadStatus>();

export function getSpriteLoadStatus(url: string): SpriteLoadStatus | undefined {
  return spriteLoadCache.get(url);
}

export function _resetSpriteLoadCache(): void {
  spriteLoadCache.clear();
}

/**
 * Preloads all horse sprite sheet images so they are cached by the browser
 * before the race broadcast renders. Resolves once all images have loaded
 * or errored — a single failed sprite does not block the rest.
 * No-op in SSR environments where `Image` is not available.
 */
export async function preloadHorseSprites(): Promise<void> {
  if (typeof Image === "undefined") return;
  const urls = getAllSpriteUrls();
  await Promise.allSettled(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          spriteLoadCache.set(url, "loading");
          const img = new Image();
          img.onload = () => {
            spriteLoadCache.set(url, "loaded");
            resolve();
          };
          img.onerror = () => {
            spriteLoadCache.set(url, "error");
            resolve();
          };
          img.src = url;
        }),
    ),
  );
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
 * @param calibratedPars - Speed pars for Beyer calculation
 * @returns Projected Beyer figure, or null if calculation is not possible
 */
export function projectedBeyer(
  r: Runner,
  distance: number,
  simTime: number,
  classBonus: number,
  calibratedPars: Record<number, number> = {},
): number | null {
  if (r.finishTime !== null) {
    return beyerFigure({ distance, finishTime: r.finishTime, classBonus, calibratedPars });
  }
  if (r.position <= 0 || r.velocity <= 0.5) return null;
  const remaining = distance - r.position;
  const projFinish = simTime + remaining / r.velocity;
  return beyerFigure({ distance, finishTime: projFinish, classBonus, calibratedPars });
}
