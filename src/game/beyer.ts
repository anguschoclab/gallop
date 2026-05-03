/**
 * Beyer-style speed figure.
 *
 * A Beyer Speed Figure is a single number that compares race performances
 * across different distances and tracks. Higher is faster.
 *
 * Real Beyers use track variants and daily par calibration. We simplify:
 *  1. Compute a "par time" for the distance — what a competent ~OVR 70 horse
 *     would run in our simulator (calibrated empirically below).
 *  2. Each runner's figure = 80 (par) plus 1 point per 0.1s faster than par,
 *     scaled mildly with distance so longer races aren't over-rewarded.
 *  3. Field-quality adjustment: small bonus when the average opponent OVR is
 *     high, mimicking a real "track variant" / class adjustment.
 *
 * Reference: https://en.wikipedia.org/wiki/Beyer_Speed_Figure
 */

const PAR_FIGURE = 80;

/**
 * Estimated par time (seconds) at a given distance for a "par" horse.
 * Calibrated against the simulator: par horse averages ~16 m/s effective
 * over the race after stamina fade.
 */
function parTime(distance: number): number {
  // baseline: 16 m/s at 1200m, slightly slower per extra 100m due to fade
  const fadeAdj = Math.max(0, (distance - 1200) / 100) * 0.15;
  return distance / 16 + fadeAdj;
}

/**
 * Convert seconds-faster-than-par into Beyer points.
 * 0.1 s ≈ 1 length over a sprint; ~5 lengths = ~10 Beyer points.
 */
function pointsFromDelta(deltaSec: number, distance: number): number {
  // Slightly compress the scale at longer distances (a 1s gap means less
  // at 2400m than at 1200m).
  const distanceScale = 1200 / distance;
  return deltaSec * 10 * distanceScale;
}

export type BeyerInput = {
  finishTime: number; // seconds
  distance: number; // meters
  fieldAvgOverall?: number; // average OVR of the field (0-100), optional
};

export function computeBeyer({ finishTime, distance, fieldAvgOverall }: BeyerInput): number {
  const par = parTime(distance);
  const delta = par - finishTime; // positive if faster than par
  let figure = PAR_FIGURE + pointsFromDelta(delta, distance);

  // Class / "track variant" adjustment: stronger fields => slightly higher figs
  if (typeof fieldAvgOverall === "number") {
    const classAdj = (fieldAvgOverall - 60) * 0.15; // roughly ±5 across the OVR range
    figure += classAdj;
  }

  // Clamp to a sensible visible range
  return Math.max(20, Math.min(140, Math.round(figure)));
}

/**
 * Qualitative band for a Beyer figure, used for color-coding.
 * Loosely inspired by Beyer's own tiers.
 */
export function beyerBand(fig: number): { label: string; tone: "low" | "mid" | "high" | "elite" | "legend" } {
  if (fig >= 110) return { label: "Champion", tone: "legend" };
  if (fig >= 100) return { label: "Stakes-class", tone: "elite" };
  if (fig >= 90) return { label: "Allowance-class", tone: "high" };
  if (fig >= 75) return { label: "Solid", tone: "mid" };
  return { label: "Developing", tone: "low" };
}
