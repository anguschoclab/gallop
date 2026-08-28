/**
 * cashPressureTuning.ts - Configurable tuning layer for NPC cash pressure.
 *
 * Balancing is driven by `src/data/cashPressureTuning.json`, which can be edited
 * without touching game logic. Values control the runway->pressure mapping, the
 * pressure->threshold softening curve, the player-facing label cutoffs, and a
 * dev/test decision-trace toggle. Runtime overrides can also be set (tests,
 * debug tooling) and are merged on top of the file config.
 *
 * Related files: src/core/stable/cashPressure.ts (consumer),
 *   src/core/horse/privateSaleDecision.ts (trace consumer),
 *   src/core/time/phases/privateSaleResolution.ts (trace log emission).
 */

import tuningFile from "@/data/cashPressureTuning.json";

export interface CashPressureLabelThresholds {
  desperate: number;
  strained: number;
  tight: number;
}

export interface CashPressureTuning {
  /** Days of upkeep runway at or above which a stable feels no cash pressure. */
  comfortDays: number;
  /** Days of upkeep runway at or below which a stable is maximally desperate. */
  crisisDays: number;
  /** Maximum discount applied to accept/counter thresholds at full pressure. */
  maxThresholdDiscount: number;
  /** Exponent shaping the runway->pressure curve (1 = linear). */
  pressureCurveExponent: number;
  /** Exponent shaping the pressure->threshold softening curve (1 = linear). */
  softeningCurveExponent: number;
  /** Pressure cutoffs for the player-facing label (descending). */
  labelThresholds: CashPressureLabelThresholds;
  /** When true, the private sale phase emits a [trace] log entry per decision. */
  enableDecisionTrace: boolean;
}

const DEFAULTS: CashPressureTuning = {
  comfortDays: 120,
  crisisDays: 20,
  maxThresholdDiscount: 0.25,
  pressureCurveExponent: 1.0,
  softeningCurveExponent: 1.0,
  labelThresholds: { desperate: 0.75, strained: 0.5, tight: 0.25 },
  enableDecisionTrace: false,
};

function sanitizeFiniteNumber(value: unknown, fallback: number, min?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  if (min !== undefined && value < min) return fallback;
  return value;
}

function sanitizeLabelThresholds(raw: unknown): CashPressureLabelThresholds {
  const entry = (raw ?? {}) as Partial<CashPressureLabelThresholds>;
  const desperate = sanitizeFiniteNumber(entry.desperate, DEFAULTS.labelThresholds.desperate, 0);
  const strained = sanitizeFiniteNumber(entry.strained, DEFAULTS.labelThresholds.strained, 0);
  const tight = sanitizeFiniteNumber(entry.tight, DEFAULTS.labelThresholds.tight, 0);
  // Enforce descending order so label selection in cashPressure.ts stays correct.
  return {
    desperate,
    strained: Math.min(strained, desperate),
    tight: Math.min(tight, strained),
  };
}

function sanitizeEntry(raw: unknown): CashPressureTuning {
  const entry = (raw ?? {}) as Partial<CashPressureTuning>;
  const comfortDays = sanitizeFiniteNumber(entry.comfortDays, DEFAULTS.comfortDays, 0);
  const crisisDays = sanitizeFiniteNumber(entry.crisisDays, DEFAULTS.crisisDays, 0);
  return {
    comfortDays: Math.max(comfortDays, crisisDays + 1),
    crisisDays: Math.min(crisisDays, comfortDays - 1),
    maxThresholdDiscount: sanitizeFiniteNumber(
      entry.maxThresholdDiscount,
      DEFAULTS.maxThresholdDiscount,
      0,
    ),
    pressureCurveExponent: sanitizeFiniteNumber(
      entry.pressureCurveExponent,
      DEFAULTS.pressureCurveExponent,
      0,
    ),
    softeningCurveExponent: sanitizeFiniteNumber(
      entry.softeningCurveExponent,
      DEFAULTS.softeningCurveExponent,
      0,
    ),
    labelThresholds: sanitizeLabelThresholds(entry.labelThresholds),
    enableDecisionTrace:
      typeof entry.enableDecisionTrace === "boolean"
        ? entry.enableDecisionTrace
        : DEFAULTS.enableDecisionTrace,
  };
}

function loadFileTuning(): CashPressureTuning {
  return sanitizeEntry(tuningFile);
}

const FILE_TUNING = loadFileTuning();

let runtimeTuning: CashPressureTuningOverrides = {};

/**
 * Effective tuning (file config merged with any runtime override; runtime wins).
 * Partial `labelThresholds` overrides are merged field-by-field with the file
 * defaults so callers can tweak individual label cutoffs.
 */
export function getCashPressureTuning(): CashPressureTuning {
  const r = runtimeTuning;
  const file = FILE_TUNING;
  return {
    comfortDays: r.comfortDays ?? file.comfortDays,
    crisisDays: r.crisisDays ?? file.crisisDays,
    maxThresholdDiscount: r.maxThresholdDiscount ?? file.maxThresholdDiscount,
    pressureCurveExponent: r.pressureCurveExponent ?? file.pressureCurveExponent,
    softeningCurveExponent: r.softeningCurveExponent ?? file.softeningCurveExponent,
    labelThresholds: { ...file.labelThresholds, ...r.labelThresholds },
    enableDecisionTrace: r.enableDecisionTrace ?? file.enableDecisionTrace,
  };
}

/**
 * Partial tuning overrides for runtime adjustment. `labelThresholds` accepts a
 * partial object so callers can tweak individual label cutoffs.
 */
export type CashPressureTuningOverrides = Omit<Partial<CashPressureTuning>, "labelThresholds"> & {
  labelThresholds?: Partial<CashPressureLabelThresholds>;
};

/**
 * Apply runtime overrides (merged into whatever is already set). Used by tests
 * and debug tooling; falls back to the JSON config for any field not supplied.
 * @param overrides
 */
export function setCashPressureTuningOverrides(overrides: CashPressureTuningOverrides): void {
  runtimeTuning = {
    ...runtimeTuning,
    ...overrides,
    labelThresholds:
      overrides.labelThresholds !== undefined
        ? { ...runtimeTuning.labelThresholds, ...overrides.labelThresholds }
        : runtimeTuning.labelThresholds,
  };
}

/** Clear runtime overrides, falling back to the JSON config. */
export function resetCashPressureTuningOverrides(): void {
  runtimeTuning = {};
}

/** Read-only view of the JSON-configured baseline (for debug UI). */
export function getCashPressureTuningFileConfig(): CashPressureTuning {
  return FILE_TUNING;
}
