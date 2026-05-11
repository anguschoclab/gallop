/**
 * jockeyData.ts - Jockey data constants
 *
 * This file provides jockey archetypes, silk color palettes, and silk patterns
 * for jockey generation.
 *
 * Dependencies: ./types (JockeyArchetype, JockeySilk)
 * Related files: jockeyGen.ts (uses these constants for generation)
 */

import type { JockeyArchetype, JockeySilk } from "./types";

export const ARCHETYPES: JockeyArchetype[] = [
  "front_runner",
  "closer",
  "clinical",
  "finisher",
  "versatile",
];

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
