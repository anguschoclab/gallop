import type { CoatColor, HorseMarkings, HorseGender } from "@/game/types";

// ---------------------------------------------------------------------------
// Procedural horse portrait — "facegen" for horses.
// Deterministic from horse.id so the same horse always renders identically.
// Returns a structured palette + variation params consumed by the SVG.
// ---------------------------------------------------------------------------

export interface PortraitPalette {
  body: string;
  bodyShade: string; // shadow / under-jaw
  bodyHighlight: string; // cheek / upper neck
  points: string; // legs/ears/muzzle tips ("points" coloring)
  mane: string;
  maneShade: string;
  muzzle: string; // soft muzzle area
  eye: string;
  skin: string; // around eye / inside nostril
  bg1: string; // backdrop gradient stops
  bg2: string;
  hasDapples: boolean;
  hasRoanFleck: boolean;
  hasDorsalStripe: boolean;
  blueEye: boolean;
}

const PALETTES: Record<CoatColor, PortraitPalette> = {
  bay: {
    body: "#7a3f1a", bodyShade: "#4a2410", bodyHighlight: "#9a5a2a",
    points: "#1a0e08", mane: "#140a06", maneShade: "#080403",
    muzzle: "#2a160a", eye: "#1a0a04", skin: "#3a1c10",
    bg1: "#3a2418", bg2: "#1a100a",
    hasDapples: false, hasRoanFleck: false, hasDorsalStripe: false, blueEye: false,
  },
  "dark-bay": {
    body: "#3f2010", bodyShade: "#1f1008", bodyHighlight: "#5a2f18",
    points: "#0a0504", mane: "#080403", maneShade: "#000000",
    muzzle: "#1a0a04", eye: "#0a0402", skin: "#1f1008",
    bg1: "#241410", bg2: "#0a0604",
    hasDapples: false, hasRoanFleck: false, hasDorsalStripe: false, blueEye: false,
  },
  black: {
    body: "#1c1614", bodyShade: "#0a0808", bodyHighlight: "#322a26",
    points: "#000000", mane: "#000000", maneShade: "#000000",
    muzzle: "#0a0606", eye: "#1a1410", skin: "#1a1410",
    bg1: "#26201c", bg2: "#0a0808",
    hasDapples: false, hasRoanFleck: false, hasDorsalStripe: false, blueEye: false,
  },
  chestnut: {
    body: "#9c4520", bodyShade: "#6a2a12", bodyHighlight: "#c45c2a",
    points: "#7a3418", mane: "#6a2a10", maneShade: "#4a1c08",
    muzzle: "#7a3418", eye: "#2a1408", skin: "#3a1c10",
    bg1: "#3a1c10", bg2: "#1a0c06",
    hasDapples: false, hasRoanFleck: false, hasDorsalStripe: false, blueEye: false,
  },
  "liver-chestnut": {
    body: "#5a2c14", bodyShade: "#3a1808", bodyHighlight: "#7a3a1c",
    points: "#3a1808", mane: "#2a1006", maneShade: "#180804",
    muzzle: "#3a1808", eye: "#1a0a04", skin: "#2a1408",
    bg1: "#2a1810", bg2: "#0c0604",
    hasDapples: false, hasRoanFleck: false, hasDorsalStripe: false, blueEye: false,
  },
  "seal-brown": {
    body: "#2a1810", bodyShade: "#140a06", bodyHighlight: "#3f241a",
    points: "#0a0402", mane: "#0a0402", maneShade: "#000000",
    muzzle: "#5a3424", // tan muzzle - signature of seal brown
    eye: "#0a0402", skin: "#180c06",
    bg1: "#261a14", bg2: "#0a0604",
    hasDapples: false, hasRoanFleck: false, hasDorsalStripe: false, blueEye: false,
  },
  gray: {
    body: "#c4bfb8", bodyShade: "#8a8680", bodyHighlight: "#e0dcd4",
    points: "#6a655e", mane: "#9a948c", maneShade: "#6a655e",
    muzzle: "#7a746c", eye: "#1a1410", skin: "#2a2420",
    bg1: "#3a3632", bg2: "#1a1814",
    hasDapples: true, hasRoanFleck: false, hasDorsalStripe: false, blueEye: false,
  },
  white: {
    body: "#f4f0ea", bodyShade: "#d8d2c8", bodyHighlight: "#ffffff",
    points: "#e8e2d6", mane: "#ffffff", maneShade: "#e0dcd2",
    muzzle: "#f0c8c0", // pink skin
    eye: "#1a0a04", skin: "#f0c8c0",
    bg1: "#403a34", bg2: "#1c1814",
    hasDapples: false, hasRoanFleck: false, hasDorsalStripe: false, blueEye: false,
  },
  roan: {
    body: "#8a6a58", bodyShade: "#5a4434", bodyHighlight: "#a08474",
    points: "#3a2418", mane: "#2a1810", maneShade: "#180c06",
    muzzle: "#5a3a28", eye: "#1a0a04", skin: "#3a2418",
    bg1: "#322820", bg2: "#140e0a",
    hasDapples: false, hasRoanFleck: true, hasDorsalStripe: false, blueEye: false,
  },
  palomino: {
    body: "#d4a455", bodyShade: "#a07a3a", bodyHighlight: "#e8c074",
    points: "#b88a40", mane: "#f5e8c0", maneShade: "#d8c898",
    muzzle: "#a07a3a", eye: "#2a1808", skin: "#5a4020",
    bg1: "#3a2c18", bg2: "#1a140a",
    hasDapples: false, hasRoanFleck: false, hasDorsalStripe: false, blueEye: false,
  },
  buckskin: {
    body: "#c89c5a", bodyShade: "#8a6a3a", bodyHighlight: "#e0b878",
    points: "#1a0e08", mane: "#0a0504", maneShade: "#000000",
    muzzle: "#1a0e08", eye: "#1a0a04", skin: "#2a1810",
    bg1: "#322418", bg2: "#14100a",
    hasDapples: false, hasRoanFleck: false, hasDorsalStripe: false, blueEye: false,
  },
  dun: {
    body: "#b89460", bodyShade: "#806844", bodyHighlight: "#d4ac74",
    points: "#1a0e08", mane: "#0a0504", maneShade: "#000000",
    muzzle: "#3a2418", eye: "#1a0a04", skin: "#2a1810",
    bg1: "#2c2418", bg2: "#14100a",
    hasDapples: false, hasRoanFleck: false, hasDorsalStripe: true, blueEye: false,
  },
  grulla: {
    body: "#7a6f60", bodyShade: "#4a4238", bodyHighlight: "#948878",
    points: "#1a1410", mane: "#0a0808", maneShade: "#000000",
    muzzle: "#2a2018", eye: "#1a0a04", skin: "#1a1410",
    bg1: "#2a2620", bg2: "#0e0c0a",
    hasDapples: false, hasRoanFleck: false, hasDorsalStripe: true, blueEye: false,
  },
  champagne: {
    body: "#b8906a", bodyShade: "#806448", bodyHighlight: "#d4a884",
    points: "#8a6a4a", mane: "#e8d4b0", maneShade: "#b89878",
    muzzle: "#d4a89c", // pink-tinged
    eye: "#5a8aa8", // hazel/blue characteristic of champagne
    skin: "#d4a89c",
    bg1: "#3a2c20", bg2: "#1a140e",
    hasDapples: true, hasRoanFleck: false, hasDorsalStripe: false, blueEye: true,
  },
};

export function getPalette(coat?: CoatColor): PortraitPalette {
  if (!coat) return PALETTES.bay;
  return PALETTES[coat] ?? PALETTES.bay;
}

// ---------------------------------------------------------------------------
// Deterministic seeded RNG — mulberry32. Same horse.id → same head shape.
// ---------------------------------------------------------------------------

function hashSeed(str: string): number {
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

export interface PortraitVariation {
  headTilt: number; // -6..6 degrees
  headLength: number; // 0.95..1.07
  earSpread: number; // 0.85..1.15
  eyeY: number; // small offset
  forelockSweep: number; // -8..8
  maneWaves: number[]; // 4 jitter offsets for mane edge
  dapples: { x: number; y: number; r: number }[];
  flecks: { x: number; y: number; r: number }[];
  star: boolean; // resolved face white from markings
  blaze: boolean;
  bald: boolean;
  socksHint: boolean; // unused in head portrait but kept for parity
  feminine: boolean; // mares/fillies — slightly daintier muzzle
}

export function buildVariation(
  id: string | undefined,
  markings?: HorseMarkings,
  gender?: HorseGender,
  palette?: PortraitPalette,
): PortraitVariation {
  const rng = mulberry32(hashSeed(id ?? "anon"));
  const r = () => rng();
  const between = (a: number, b: number) => a + r() * (b - a);

  const dapples: { x: number; y: number; r: number }[] = [];
  if (palette?.hasDapples) {
    const count = 6 + Math.floor(r() * 6);
    for (let i = 0; i < count; i++) {
      dapples.push({
        x: between(60, 175),
        y: between(70, 175),
        r: between(3, 7),
      });
    }
  }

  const flecks: { x: number; y: number; r: number }[] = [];
  if (palette?.hasRoanFleck) {
    const count = 30 + Math.floor(r() * 25);
    for (let i = 0; i < count; i++) {
      flecks.push({
        x: between(40, 185),
        y: between(60, 195),
        r: between(0.6, 1.6),
      });
    }
  }

  const face = markings?.face ?? "none";

  return {
    headTilt: between(-5, 5),
    headLength: between(0.96, 1.06),
    earSpread: between(0.9, 1.12),
    eyeY: between(-1.5, 1.5),
    forelockSweep: between(-7, 7),
    maneWaves: [between(-4, 4), between(-5, 5), between(-4, 4), between(-5, 5)],
    dapples,
    flecks,
    star: face === "star",
    blaze: face === "blaze",
    bald: face === "bald",
    socksHint: (markings?.socks ?? "none") !== "none",
    feminine: gender === "filly" || gender === "mare",
  };
}
