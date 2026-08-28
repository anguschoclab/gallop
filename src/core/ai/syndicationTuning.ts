/**
 * syndicationTuning.ts - Configurable tuning layer for syndication appetite.
 *
 * Balancing is driven by `src/data/syndicationTuning.json`, which can be edited
 * without touching game logic. Values are multipliers applied on top of the base
 * appetite table in `syndicationAppetite.ts`, plus an offset on the proven-quality
 * (G1 wins) gate. Overrides can also be set at runtime (tests, debug tooling).
 */

import type { StablePersonality } from "@/game/types";
import tuningFile from "@/data/syndicationTuning.json";

export interface SyndicationTuningEntry {
  stakeCapMultiplier?: number;
  buyFractionMultiplier?: number;
  cashFractionMultiplier?: number;
  g1WinsOffset?: number;
  g2WinsOffset?: number;
  g3WinsOffset?: number;
  /** Optional hard override of control-chasing behaviour. */
  chasesControl?: boolean;
}

export interface SyndicationTuning {
  global: SyndicationTuningEntry;
  personalities: Partial<Record<StablePersonality, SyndicationTuningEntry>>;
}

const NEUTRAL: Required<Omit<SyndicationTuningEntry, "chasesControl">> = {
  stakeCapMultiplier: 1,
  buyFractionMultiplier: 1,
  cashFractionMultiplier: 1,
  g1WinsOffset: 0,
  g2WinsOffset: 0,
  g3WinsOffset: 0,
};

export interface QualityTier {
  minScore: number;
  scale: number;
}

export interface SyndicationQualityConfig {
  weights: { g1: number; g2: number; g3: number };
  tiers: QualityTier[];
}

const DEFAULT_QUALITY_CONFIG: SyndicationQualityConfig = {
  weights: { g1: 3, g2: 2, g3: 1 },
  tiers: [
    { minScore: 0, scale: 1.0 },
    { minScore: 3, scale: 1.15 },
    { minScore: 6, scale: 1.3 },
    { minScore: 10, scale: 1.5 },
  ],
};

function sanitizeMultiplier(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return fallback;
  return value;
}

function sanitizeEntry(raw: unknown): SyndicationTuningEntry {
  const entry = (raw ?? {}) as SyndicationTuningEntry;
  const out: SyndicationTuningEntry = {
    stakeCapMultiplier: sanitizeMultiplier(entry.stakeCapMultiplier, NEUTRAL.stakeCapMultiplier),
    buyFractionMultiplier: sanitizeMultiplier(
      entry.buyFractionMultiplier,
      NEUTRAL.buyFractionMultiplier,
    ),
    cashFractionMultiplier: sanitizeMultiplier(
      entry.cashFractionMultiplier,
      NEUTRAL.cashFractionMultiplier,
    ),
    g1WinsOffset:
      typeof entry.g1WinsOffset === "number" && Number.isFinite(entry.g1WinsOffset)
        ? Math.round(entry.g1WinsOffset)
        : 0,
    g2WinsOffset:
      typeof entry.g2WinsOffset === "number" && Number.isFinite(entry.g2WinsOffset)
        ? Math.round(entry.g2WinsOffset)
        : 0,
    g3WinsOffset:
      typeof entry.g3WinsOffset === "number" && Number.isFinite(entry.g3WinsOffset)
        ? Math.round(entry.g3WinsOffset)
        : 0,
  };
  if (typeof entry.chasesControl === "boolean") out.chasesControl = entry.chasesControl;
  return out;
}

function loadFileTuning(): SyndicationTuning {
  const raw = tuningFile as unknown as Partial<SyndicationTuning>;
  const personalities: SyndicationTuning["personalities"] = {};
  for (const [key, value] of Object.entries(raw.personalities ?? {})) {
    personalities[key as StablePersonality] = sanitizeEntry(value);
  }
  return { global: sanitizeEntry(raw.global), personalities };
}

const FILE_TUNING = loadFileTuning();

let runtimeTuning: SyndicationTuning = { global: {}, personalities: {} };

/**
 * Merge order: file config, then any runtime override.
 * @param {...any} entries
 */
function mergeEntries(...entries: SyndicationTuningEntry[]): SyndicationTuningEntry {
  const out: SyndicationTuningEntry = { ...NEUTRAL };
  for (const e of entries) {
    if (e.stakeCapMultiplier !== undefined)
      out.stakeCapMultiplier = (out.stakeCapMultiplier ?? 1) * e.stakeCapMultiplier;
    if (e.buyFractionMultiplier !== undefined)
      out.buyFractionMultiplier = (out.buyFractionMultiplier ?? 1) * e.buyFractionMultiplier;
    if (e.cashFractionMultiplier !== undefined)
      out.cashFractionMultiplier = (out.cashFractionMultiplier ?? 1) * e.cashFractionMultiplier;
    if (e.g1WinsOffset !== undefined) out.g1WinsOffset = (out.g1WinsOffset ?? 0) + e.g1WinsOffset;
    if (e.g2WinsOffset !== undefined) out.g2WinsOffset = (out.g2WinsOffset ?? 0) + e.g2WinsOffset;
    if (e.g3WinsOffset !== undefined) out.g3WinsOffset = (out.g3WinsOffset ?? 0) + e.g3WinsOffset;
    if (e.chasesControl !== undefined) out.chasesControl = e.chasesControl;
  }
  return out;
}

/**
 * Effective tuning entry for a personality (file config × runtime overrides,
 * with global knobs folded in).
 * @param personality
 */
export function getSyndicationTuning(personality: StablePersonality): SyndicationTuningEntry {
  return mergeEntries(
    sanitizeEntry(FILE_TUNING.global),
    sanitizeEntry(runtimeTuning.global),
    sanitizeEntry(FILE_TUNING.personalities[personality]),
    sanitizeEntry(runtimeTuning.personalities?.[personality]),
  );
}

/**
 * Apply runtime overrides (merged into whatever is already set).
 * @param overrides
 */
export function setSyndicationTuningOverrides(overrides: Partial<SyndicationTuning>): void {
  runtimeTuning = {
    global: { ...runtimeTuning.global, ...(overrides.global ?? {}) },
    personalities: { ...runtimeTuning.personalities, ...(overrides.personalities ?? {}) },
  };
}

/** Clear runtime overrides, falling back to the JSON config. */
export function resetSyndicationTuningOverrides(): void {
  runtimeTuning = { global: {}, personalities: {} };
}

/** Read-only view of the JSON-configured baseline (for debug UI). */
export function getSyndicationTuningFileConfig(): SyndicationTuning {
  return FILE_TUNING;
}

// ── Quality tier config (global, not per-personality) ──

function loadFileQualityConfig(): SyndicationQualityConfig {
  const raw = (tuningFile as unknown as { qualityTiers?: unknown; qualityWeights?: unknown }) ?? {};
  const weightsRaw = (raw.qualityWeights ?? {}) as { g1?: number; g2?: number; g3?: number };
  const tiersRaw = (raw.qualityTiers ?? []) as unknown[];
  const tiers: QualityTier[] = Array.isArray(tiersRaw)
    ? tiersRaw
        .map((t) => {
          const tier = t as { minScore?: number; scale?: number };
          return {
            minScore: typeof tier.minScore === "number" ? tier.minScore : 0,
            scale:
              typeof tier.scale === "number" && Number.isFinite(tier.scale) && tier.scale >= 0
                ? tier.scale
                : 1,
          };
        })
        .sort((a, b) => a.minScore - b.minScore)
    : DEFAULT_QUALITY_CONFIG.tiers;
  return {
    weights: {
      g1: typeof weightsRaw.g1 === "number" ? weightsRaw.g1 : DEFAULT_QUALITY_CONFIG.weights.g1,
      g2: typeof weightsRaw.g2 === "number" ? weightsRaw.g2 : DEFAULT_QUALITY_CONFIG.weights.g2,
      g3: typeof weightsRaw.g3 === "number" ? weightsRaw.g3 : DEFAULT_QUALITY_CONFIG.weights.g3,
    },
    tiers: tiers.length > 0 ? tiers : DEFAULT_QUALITY_CONFIG.tiers,
  };
}

const FILE_QUALITY_CONFIG = loadFileQualityConfig();
let runtimeQualityConfig: SyndicationQualityConfig | null = null;

/** Effective quality config (file baseline, or runtime override if set). */
export function getSyndicationQualityConfig(): SyndicationQualityConfig {
  return runtimeQualityConfig ?? FILE_QUALITY_CONFIG;
}

/** Read-only view of the JSON-configured quality baseline (for debug UI). */
export function getSyndicationQualityFileConfig(): SyndicationQualityConfig {
  return FILE_QUALITY_CONFIG;
}

/**
 * Apply a runtime override of the quality config (replaces the file baseline).
 * @param config
 */
export function setSyndicationQualityConfigOverride(config: SyndicationQualityConfig): void {
  runtimeQualityConfig = {
    weights: { ...config.weights },
    tiers: [...config.tiers].sort((a, b) => a.minScore - b.minScore),
  };
}

/** Clear runtime quality override, falling back to the JSON config. */
export function resetSyndicationQualityConfigOverride(): void {
  runtimeQualityConfig = null;
}
