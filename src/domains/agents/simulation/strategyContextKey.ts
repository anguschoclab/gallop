import type { Race, RunningStyle } from "@/game/types";

export function getDistanceRange(distance: number): "short" | "mid" | "long" {
  if (distance < 1400) return "short";
  if (distance < 2000) return "mid";
  return "long";
}

export function getFieldSizeBucket(fieldSize: number): "small" | "medium" | "large" {
  if (fieldSize < 10) return "small";
  if (fieldSize < 14) return "medium";
  return "large";
}

export function getRaceSurface(race: Race): "Turf" | "Dirt" | "Synthetic" {
  return race.surface ?? race.graded?.surface ?? "Dirt";
}

export function buildStrategyContextKey(race: Race, runningStyle: RunningStyle): string {
  const distanceRange = getDistanceRange(race.distance);
  const fieldSize = getFieldSizeBucket(race.fieldSize);
  const surface = getRaceSurface(race);
  const trackCondition = race.trackCondition ?? "fast";
  const weather = race.weather ?? "none";
  return `${distanceRange}:${fieldSize}:${surface}:${trackCondition}:${weather}:${runningStyle}`;
}
