import type {
  CoatColor,
  HorseMarkings,
  HorseGender,
  AppearanceDNA,
  SockHeight,
} from "@/platform/game/types";
import type { PortraitPalette } from "@/domains/horse/simulation/portraitPalettes";
import { getPalette } from "@/domains/horse/simulation/portraitPalettes";

// Re-export for backward compatibility
export type { PortraitPalette } from "@/domains/horse/simulation/portraitPalettes";
export { getPalette } from "@/domains/horse/simulation/portraitPalettes";

// ---------------------------------------------------------------------------
// Procedural horse portrait — "facegen" for horses.
// Two layers:
//   1. PortraitPalette — color tokens derived from CoatColor.
//   2. AppearanceDNA   — per-horse parameters (head shape, legs, dapple
//                        positions, per-leg sock heights). Persisted on the
//                        horse so the rendered look survives across sessions.
// A module-level cache keyed by horse.id avoids re-running the variation
// math when the same portrait is mounted on many pages.
// ---------------------------------------------------------------------------

/**
 * proceduralPortrait.ts - Procedural horse portrait generation
 *
 * This file provides "facegen" functionality for horses, generating unique
 * visual appearances based on coat color and random variation. It maintains
 * a cache to avoid recomputing the same horse's appearance.
 *
 * Dependencies: @/game/types (CoatColor, HorseMarkings, HorseGender, AppearanceDNA, SockHeight), ./portraitPalettes (PortraitPalette, getPalette)
 * Related files: portrait.ts (static portraits), exportPortrait.ts (PNG export)
 */

// ---------------------------------------------------------------------------
// Seeded RNG — mulberry32. Same seed → same shape.
// ---------------------------------------------------------------------------

/**
 * Hash a string to a numeric seed for deterministic RNG.
 *
 * Uses the FNV-1a hash algorithm to convert a string (typically a horse ID)
 * into a numeric seed. Same string always produces the same seed.
 *
 * @param str - The string to hash (typically a horse ID)
 * @returns Numeric seed value (0 to 2^32-1)
 *
 * @example
 * const seed = hashSeed("horse-123");
 * // Always returns the same number for "horse-123"
 */
export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Appearance DNA generator — call once at horse generation; persist on horse.
// ---------------------------------------------------------------------------

/** Bumped whenever AppearanceDNA fields or the head-renderer contract change. */
export const HORSE_PORTRAIT_SCHEMA_VERSION = 2;
export const HORSE_PORTRAIT_ASSET_VERSION = 1;

const COAT_TEXTURES = ["sleek", "sheen", "coarse"] as const;
const BACKGROUNDS = ["dawn", "paddock", "stable", "dusk"] as const;
const EAR_POSES = ["alert", "relaxed", "back"] as const;
const FORELOCK_STYLES = ["tuft", "sweep", "none"] as const;
const MANE_STYLES = ["short", "long", "roached"] as const;

const SOCK_LEVELS: SockHeight[] = ["none", "sock", "stocking"];
function sockNeighbor(base: SockHeight, r: () => number): SockHeight {
  const idx = SOCK_LEVELS.indexOf(base);
  // 65% same as base, 25% one step toward neighbor, 10% two steps
  const roll = r();
  if (roll < 0.65) return base;
  const dir = r() < 0.5 ? -1 : 1;
  const next = Math.max(0, Math.min(2, idx + dir * (roll < 0.9 ? 1 : 2)));
  return SOCK_LEVELS[next];
}

/**
 * Generate appearance DNA from a seed.
 *
 * Creates deterministic visual variation parameters (head shape, leg length,
 * mane waves, sock heights, dapple positions, etc.) from a numeric seed.
 * Same seed always produces the same appearance. Call once at horse generation
 * and persist the result on the horse.
 *
 * @param seed - Numeric seed for deterministic generation
 * @param markings - Optional horse markings to base sock heights on
 * @param palette - Optional color palette (defaults to bay if not provided)
 * @returns AppearanceDNA with all visual variation parameters
 *
 * @example
 * const dna = generateAppearanceDNA(12345, { socks: "stocking" }, getPalette("bay"));
 */
export function generateAppearanceDNA(
  seed: number,
  markings: HorseMarkings | undefined,
  palette?: PortraitPalette,
): AppearanceDNA {
  const _palette = palette || getPalette(undefined);
  const rng = mulberry32(seed);
  const r = () => rng();
  const between = (a: number, b: number) => a + r() * (b - a);

  const baseSocks: SockHeight = markings?.socks ?? "none";
  const dapples: { x: number; y: number; r: number }[] = [];
  if (_palette.hasDapples) {
    const count = 8 + Math.floor(r() * 8);
    for (let i = 0; i < count; i++) {
      dapples.push({ x: between(60, 175), y: between(70, 175), r: between(3, 7) });
    }
  }
  const flecks: { x: number; y: number; r: number }[] = [];
  if (_palette.hasRoanFleck) {
    const count = 40 + Math.floor(r() * 30);
    for (let i = 0; i < count; i++) {
      flecks.push({ x: between(40, 185), y: between(60, 195), r: between(0.6, 1.6) });
    }
  }

  return {
    schemaVersion: HORSE_PORTRAIT_SCHEMA_VERSION,
    assetPackVersion: HORSE_PORTRAIT_ASSET_VERSION,
    seed,
    headTilt: between(-5, 5),
    headLength: between(0.96, 1.06),
    earSpread: between(0.9, 1.12),
    eyeY: between(-1.5, 1.5),
    forelockSweep: between(-7, 7),
    maneWaves: [between(-4, 4), between(-5, 5), between(-4, 4), between(-5, 5)],
    bodyLength: between(0.96, 1.07),
    bodyDepth: between(0.96, 1.07),
    legLength: between(0.95, 1.07),
    tailSweep: between(-8, 8),
    tailFullness: between(0.85, 1.15),
    socks: [
      sockNeighbor(baseSocks, r),
      sockNeighbor(baseSocks, r),
      sockNeighbor(baseSocks, r),
      sockNeighbor(baseSocks, r),
    ],
    dapples,
    flecks,
    lightAngle: between(-55, 55),
    lightStrength: between(0.35, 0.8),
    coatTexture: COAT_TEXTURES[Math.floor(r() * COAT_TEXTURES.length)],
    backgroundId: BACKGROUNDS[Math.floor(r() * BACKGROUNDS.length)],
    cheekFullness: between(0.9, 1.15),
    jawTaper: between(0.9, 1.1),
    muzzleWidth: between(0.85, 1.15),
    nostrilFlare: between(0.8, 1.4),
    earPose: EAR_POSES[Math.floor(r() * EAR_POSES.length)],
    eyeAlertness: between(0.75, 1.25),
    forelockStyle: FORELOCK_STYLES[Math.floor(r() * FORELOCK_STYLES.length)],
    maneStyle: MANE_STYLES[Math.floor(r() * MANE_STYLES.length)],
  };
}

// ---------------------------------------------------------------------------
// Cache: id → AppearanceDNA. Re-derived on a miss from id-hash so every
// portrait stays stable even when the horse hasn't had appearance DNA
// persisted yet (legacy saves, on-the-fly previews).
// ---------------------------------------------------------------------------

const APPEARANCE_CACHE = new Map<string, AppearanceDNA>();
const MAX_CACHE = 2000;

/**
 * Cache keys are version-qualified so a schema bump never serves stale DNA.
 * @param id
 */
function cacheKey(id: string): string {
  return `${id}@v${HORSE_PORTRAIT_SCHEMA_VERSION}.${HORSE_PORTRAIT_ASSET_VERSION}`;
}

/**
 * Get or derive appearance DNA for a horse.
 *
 * Returns persisted appearance DNA if available, otherwise derives it from the
 * horse's ID hash. Uses a module-level cache to avoid recomputing the same
 * horse's appearance multiple times.
 *
 * @param id - Horse ID (used for caching and derivation)
 * @param coatColor - Coat color for palette selection
 * @param markings - Horse markings for sock height reference
 * @param persisted - Optional persisted appearance DNA from save data
 * @returns AppearanceDNA for the horse
 *
 * @example
 * const dna = getOrDeriveAppearance(horse.id, horse.coatColor, horse.markings, horse.appearance);
 */
export function getOrDeriveAppearance(
  id: string | undefined,
  coatColor: CoatColor | undefined,
  markings: HorseMarkings | undefined,
  persisted?: AppearanceDNA,
): AppearanceDNA {
  const palette = getPalette(coatColor);
  if (persisted && persisted.schemaVersion === HORSE_PORTRAIT_SCHEMA_VERSION) {
    // Trust current-schema persisted DNA — but cache it under id for cheap reuse.
    if (id) APPEARANCE_CACHE.set(cacheKey(id), persisted);
    return persisted;
  }
  const rawId = id ?? "anon";
  const key = cacheKey(rawId);
  const cached = APPEARANCE_CACHE.get(key);
  if (cached) return cached;

  const seed = hashSeed(rawId);
  const dna = generateAppearanceDNA(seed, markings, palette);
  if (APPEARANCE_CACHE.size > MAX_CACHE) {
    // Crude LRU: drop oldest insertion.
    const firstKey = APPEARANCE_CACHE.keys().next().value;
    if (firstKey !== undefined) APPEARANCE_CACHE.delete(firstKey);
  }
  APPEARANCE_CACHE.set(key, dna);
  return dna;
}

/**
 * Check if a horse gender is feminine (filly or mare).
 *
 * Used for portrait rendering adjustments that differ between male and female horses.
 *
 * @param gender - Horse gender to check
 * @returns True if gender is filly or mare, false otherwise
 *
 * @example
 * if (isFeminine(horse.gender)) {
 *   renderFeminineFeatures();
 * }
 */
export function isFeminine(gender?: HorseGender): boolean {
  return gender === "filly" || gender === "mare";
}
