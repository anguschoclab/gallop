import type {
  CoatColor,
  HorseMarkings,
  HorseGender,
  AppearanceDNA,
  SockHeight,
} from "@/game/types";

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
 * Dependencies: @/game/types (CoatColor, HorseMarkings, HorseGender, AppearanceDNA, SockHeight)
 * Related files: portrait.ts (static portraits), exportPortrait.ts (PNG export)
 */

export interface PortraitPalette {
  body: string;
  bodyShade: string;
  bodyHighlight: string;
  points: string;
  mane: string;
  maneShade: string;
  muzzle: string;
  eye: string;
  skin: string;
  hoof: string;
  bg1: string;
  bg2: string;
  hasDapples: boolean;
  hasRoanFleck: boolean;
  hasDorsalStripe: boolean;
  blueEye: boolean;
}

const PALETTES: Record<CoatColor, PortraitPalette> = {
  bay: {
    body: "#7a3f1a",
    bodyShade: "#4a2410",
    bodyHighlight: "#9a5a2a",
    points: "#1a0e08",
    mane: "#140a06",
    maneShade: "#080403",
    muzzle: "#2a160a",
    eye: "#1a0a04",
    skin: "#3a1c10",
    hoof: "#1a1410",
    bg1: "#3a2418",
    bg2: "#1a100a",
    hasDapples: false,
    hasRoanFleck: false,
    hasDorsalStripe: false,
    blueEye: false,
  },
  "dark-bay": {
    body: "#3f2010",
    bodyShade: "#1f1008",
    bodyHighlight: "#5a2f18",
    points: "#0a0504",
    mane: "#080403",
    maneShade: "#000000",
    muzzle: "#1a0a04",
    eye: "#0a0402",
    skin: "#1f1008",
    hoof: "#0a0808",
    bg1: "#241410",
    bg2: "#0a0604",
    hasDapples: false,
    hasRoanFleck: false,
    hasDorsalStripe: false,
    blueEye: false,
  },
  black: {
    body: "#1c1614",
    bodyShade: "#0a0808",
    bodyHighlight: "#322a26",
    points: "#000000",
    mane: "#000000",
    maneShade: "#000000",
    muzzle: "#0a0606",
    eye: "#1a1410",
    skin: "#1a1410",
    hoof: "#000000",
    bg1: "#26201c",
    bg2: "#0a0808",
    hasDapples: false,
    hasRoanFleck: false,
    hasDorsalStripe: false,
    blueEye: false,
  },
  chestnut: {
    body: "#9c4520",
    bodyShade: "#6a2a12",
    bodyHighlight: "#c45c2a",
    points: "#7a3418",
    mane: "#6a2a10",
    maneShade: "#4a1c08",
    muzzle: "#7a3418",
    eye: "#2a1408",
    skin: "#3a1c10",
    hoof: "#3a2218",
    bg1: "#3a1c10",
    bg2: "#1a0c06",
    hasDapples: false,
    hasRoanFleck: false,
    hasDorsalStripe: false,
    blueEye: false,
  },
  "liver-chestnut": {
    body: "#5a2c14",
    bodyShade: "#3a1808",
    bodyHighlight: "#7a3a1c",
    points: "#3a1808",
    mane: "#2a1006",
    maneShade: "#180804",
    muzzle: "#3a1808",
    eye: "#1a0a04",
    skin: "#2a1408",
    hoof: "#1f1210",
    bg1: "#2a1810",
    bg2: "#0c0604",
    hasDapples: false,
    hasRoanFleck: false,
    hasDorsalStripe: false,
    blueEye: false,
  },
  "seal-brown": {
    body: "#2a1810",
    bodyShade: "#140a06",
    bodyHighlight: "#3f241a",
    points: "#0a0402",
    mane: "#0a0402",
    maneShade: "#000000",
    muzzle: "#5a3424",
    eye: "#0a0402",
    skin: "#180c06",
    hoof: "#0c0604",
    bg1: "#261a14",
    bg2: "#0a0604",
    hasDapples: false,
    hasRoanFleck: false,
    hasDorsalStripe: false,
    blueEye: false,
  },
  gray: {
    body: "#c4bfb8",
    bodyShade: "#8a8680",
    bodyHighlight: "#e0dcd4",
    points: "#6a655e",
    mane: "#9a948c",
    maneShade: "#6a655e",
    muzzle: "#7a746c",
    eye: "#1a1410",
    skin: "#2a2420",
    hoof: "#5a5450",
    bg1: "#3a3632",
    bg2: "#1a1814",
    hasDapples: true,
    hasRoanFleck: false,
    hasDorsalStripe: false,
    blueEye: false,
  },
  white: {
    body: "#f4f0ea",
    bodyShade: "#d8d2c8",
    bodyHighlight: "#ffffff",
    points: "#e8e2d6",
    mane: "#ffffff",
    maneShade: "#e0dcd2",
    muzzle: "#f0c8c0",
    eye: "#1a0a04",
    skin: "#f0c8c0",
    hoof: "#bfb6a8",
    bg1: "#403a34",
    bg2: "#1c1814",
    hasDapples: false,
    hasRoanFleck: false,
    hasDorsalStripe: false,
    blueEye: false,
  },
  roan: {
    body: "#8a6a58",
    bodyShade: "#5a4434",
    bodyHighlight: "#a08474",
    points: "#3a2418",
    mane: "#2a1810",
    maneShade: "#180c06",
    muzzle: "#5a3a28",
    eye: "#1a0a04",
    skin: "#3a2418",
    hoof: "#2a1f18",
    bg1: "#322820",
    bg2: "#140e0a",
    hasDapples: false,
    hasRoanFleck: true,
    hasDorsalStripe: false,
    blueEye: false,
  },
  palomino: {
    body: "#d4a455",
    bodyShade: "#a07a3a",
    bodyHighlight: "#e8c074",
    points: "#b88a40",
    mane: "#f5e8c0",
    maneShade: "#d8c898",
    muzzle: "#a07a3a",
    eye: "#2a1808",
    skin: "#5a4020",
    hoof: "#a08a64",
    bg1: "#3a2c18",
    bg2: "#1a140a",
    hasDapples: false,
    hasRoanFleck: false,
    hasDorsalStripe: false,
    blueEye: false,
  },
  buckskin: {
    body: "#c89c5a",
    bodyShade: "#8a6a3a",
    bodyHighlight: "#e0b878",
    points: "#1a0e08",
    mane: "#0a0504",
    maneShade: "#000000",
    muzzle: "#1a0e08",
    eye: "#1a0a04",
    skin: "#2a1810",
    hoof: "#1a1410",
    bg1: "#322418",
    bg2: "#14100a",
    hasDapples: false,
    hasRoanFleck: false,
    hasDorsalStripe: false,
    blueEye: false,
  },
  dun: {
    body: "#b89460",
    bodyShade: "#806844",
    bodyHighlight: "#d4ac74",
    points: "#1a0e08",
    mane: "#0a0504",
    maneShade: "#000000",
    muzzle: "#3a2418",
    eye: "#1a0a04",
    skin: "#2a1810",
    hoof: "#1a1410",
    bg1: "#2c2418",
    bg2: "#14100a",
    hasDapples: false,
    hasRoanFleck: false,
    hasDorsalStripe: true,
    blueEye: false,
  },
  grulla: {
    body: "#7a6f60",
    bodyShade: "#4a4238",
    bodyHighlight: "#948878",
    points: "#1a1410",
    mane: "#0a0808",
    maneShade: "#000000",
    muzzle: "#2a2018",
    eye: "#1a0a04",
    skin: "#1a1410",
    hoof: "#0a0808",
    bg1: "#2a2620",
    bg2: "#0e0c0a",
    hasDapples: false,
    hasRoanFleck: false,
    hasDorsalStripe: true,
    blueEye: false,
  },
  champagne: {
    body: "#b8906a",
    bodyShade: "#806448",
    bodyHighlight: "#d4a884",
    points: "#8a6a4a",
    mane: "#e8d4b0",
    maneShade: "#b89878",
    muzzle: "#d4a89c",
    eye: "#5a8aa8",
    skin: "#d4a89c",
    hoof: "#a89484",
    bg1: "#3a2c20",
    bg2: "#1a140e",
    hasDapples: true,
    hasRoanFleck: false,
    hasDorsalStripe: false,
    blueEye: true,
  },
};

/**
 * Get the color palette for a given coat color.
 *
 * Returns a PortraitPalette containing all color tokens needed for rendering
 * a horse of the specified coat color. Falls back to bay if the coat color
 * is not mapped or undefined.
 *
 * @param coat - The coat color to get the palette for
 * @returns PortraitPalette with body, mane, eye, and other color tokens
 *
 * @example
 * const palette = getPalette("chestnut");
 * console.log(palette.body); // "#9c4520"
 */
export function getPalette(coat?: CoatColor): PortraitPalette {
  const defaultPalette = PALETTES?.bay || {
    body: "#7a3f1a",
    bodyShade: "#4a2410",
    bodyHighlight: "#9a5a2a",
    points: "#1a0e08",
    mane: "#140a06",
    maneShade: "#080403",
    muzzle: "#2a160a",
    eye: "#1a0a04",
    skin: "#3a1c10",
    hoof: "#1a1410",
    bg1: "#3a2418",
    bg2: "#1a100a",
    hasDapples: false,
    hasRoanFleck: false,
    hasDorsalStripe: false,
    blueEye: false,
  };

  if (!coat || !PALETTES) return defaultPalette;
  return PALETTES[coat] ?? defaultPalette;
}

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
  const _palette = palette || getPalette();
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
  if (persisted) {
    // Trust persisted DNA — but cache it under id for cheap reuse.
    if (id) APPEARANCE_CACHE.set(id, persisted);
    return persisted;
  }
  const key = id ?? "anon";
  const cached = APPEARANCE_CACHE.get(key);
  if (cached) return cached;

  const seed = hashSeed(key);
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

// Legacy named export — kept so older code paths keep working.
export type PortraitVariation = AppearanceDNA;

/**
 * Legacy function: build variation from ID.
 *
 * Kept for backward compatibility with older code paths.
 * New code should use generateAppearanceDNA or getOrDeriveAppearance.
 *
 * @param id - Horse ID for seed generation
 * @param markings - Optional horse markings
 * @param _gender - Unused (kept for signature compatibility)
 * @param palette - Optional color palette
 * @returns AppearanceDNA for the horse
 * @deprecated Use generateAppearanceDNA or getOrDeriveAppearance instead
 */
export function buildVariation(
  id: string | undefined,
  markings?: HorseMarkings,
  _gender?: HorseGender,
  palette?: PortraitPalette,
): AppearanceDNA {
  const seed = hashSeed(id ?? "anon");
  return generateAppearanceDNA(seed, markings, palette ?? getPalette());
}
