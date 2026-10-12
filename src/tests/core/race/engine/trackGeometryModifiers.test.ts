import type { TrackSection } from "@/core/data/tracksAccessor";
import { describe, it, expect, vi } from "vitest";
import { calculateTrackGeometryModifiers } from "@/core/race/engine/trackGeometryModifiers";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import * as trackGeometry from "@/core/race/engine/trackGeometry";
import { MAX_TURN_PENALTY } from "@/constants/raceEngineConstants";

vi.mock("@/core/race/engine/trackGeometry", () => ({
  getTrackSection: vi.fn(),
}));

describe("calculateTrackGeometryModifiers", () => {
  const baseRunner = {
    velocity: 50,
    lane: 2,
    horse: {
      stats: { acceleration: 50 },
      climbingAptitude: 1.0,
      corneringAptitude: 1.0,
    },
    jockey: {
      stats: { positioning: 50 },
      traits: [],
    },
  } as unknown as Runner;

  it("calculates gradient modifiers correctly for an uphill section", () => {
    vi.mocked(trackGeometry.getTrackSection).mockReturnValue({
      startPos: 0,
      id: "section",
      index: 0,
      type: "straight",
      length: 100,
      gradient: 5,
    } as unknown as TrackSection);

    const result = calculateTrackGeometryModifiers(baseRunner, 10, 1000);
    expect(result.gradientSpeedMul).toBe(1 - 5 / 100);
    expect(result.gradientStaminaMul).toBe(1 - 5 / 200);
  });

  it("applies hill_specialist trait to reduce uphill stamina penalty", () => {
    vi.mocked(trackGeometry.getTrackSection).mockReturnValue({
      startPos: 0,
      id: "section",
      index: 0,
      type: "straight",
      length: 100,
      gradient: 5,
    } as unknown as TrackSection);

    const specialistRunner = {
      ...baseRunner,
      jockey: { ...baseRunner.jockey, traits: ["hill_specialist"] },
    } as unknown as Runner;

    const result = calculateTrackGeometryModifiers(specialistRunner, 10, 1000);
    expect(result.gradientStaminaMul).toBe(1 - 5 / 400);
  });

  it("calculates turn modifiers correctly", () => {
    vi.mocked(trackGeometry.getTrackSection).mockReturnValue({
      startPos: 0,
      id: "section",
      index: 0,
      type: "turn",
      length: 100,
      gradient: 0,
      radius: 100,
    } as unknown as TrackSection);

    const result = calculateTrackGeometryModifiers(baseRunner, 10, 1000);
    expect(result.arcFactor).toBe(1 + baseRunner.lane / 100);
    expect(result.turnSpeedMul).toBeLessThan(1.01);
    expect(result.turnSpeedMul).toBeGreaterThanOrEqual(1 - MAX_TURN_PENALTY - 0.01);
  });
});
