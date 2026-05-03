export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

// Stat fields are integers in [1, 100]. Round-then-clamp so "100.4" doesn't
// silently overflow when written back into Horse.stats.
export function clampStat(n: number): number {
  return clamp(Math.round(n), 1, 100);
}

// Same shape but for [0, 100] with a floor of 0 (used for things like form
// magnitude or potential where 0 is a legal value).
export function clampPotential(n: number): number {
  return clamp(Math.round(n), 0, 100);
}
