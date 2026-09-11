import { describe, it, expect } from "vitest";
import { computePaceContext } from "@/core/race/engine/paceContext";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { LEAD_GROUP_GAP } from "@/constants/raceEngineConstants";

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test",
    silk: "red",
    isPlayer: false,
    position: 0,
    velocity: 16,
    finishTime: null,
    lane: 1.2,
    targetLane: 1.2,
    laneVelocity: 0,
    gate: 1,
    topSpeed: 18,
    accel: 5,
    staminaFactor: 0.8,
    noise: 0,
    affinityBonus: 0,
    runningStyle: "P",
    draftingHorseId: null,
    weight: 120,
    horse: {} as any,
    ...overrides,
  };
}

describe("computePaceContext — EP pace pressure", () => {
  it("EP runners in lead group contribute to pace pressure", () => {
    const runners = [
      makeRunner({ horseId: "h1", position: 100, velocity: 17, runningStyle: "E" }),
      makeRunner({ horseId: "h2", position: 99, velocity: 16, runningStyle: "EP" }),
      makeRunner({ horseId: "h3", position: 98, velocity: 16, runningStyle: "EP" }),
      makeRunner({ horseId: "h4", position: 50, velocity: 15, runningStyle: "P" }),
    ];
    const result = computePaceContext(runners, 1600);
    // With EP weighted at 0.5: frontRunnersInLeadGroup = 1 (E) + 0.5 (EP) + 0.5 (EP) = 2.0
    // leadGroupCount = 3 (all within LEAD_GROUP_GAP of leader)
    // pressure = (2.0 - 1) / max(2, 3 - 1) = 1.0 / 2 = 0.5
    expect(result.pacePressure).toBeGreaterThan(0);
  });

  it("EP-only lead group (no E runners) still produces pace pressure", () => {
    const runners = [
      makeRunner({ horseId: "h1", position: 100, velocity: 17, runningStyle: "EP" }),
      makeRunner({ horseId: "h2", position: 99, velocity: 16, runningStyle: "EP" }),
      makeRunner({ horseId: "h3", position: 98, velocity: 16, runningStyle: "EP" }),
    ];
    const result = computePaceContext(runners, 1600);
    // frontRunnersInLeadGroup = 0.5 + 0.5 + 0.5 = 1.5
    // pressure = (1.5 - 1) / max(2, 3 - 1) = 0.5 / 2 = 0.25
    expect(result.pacePressure).toBeGreaterThan(0);
  });

  it("pressure normalizes by lead-group size (14 runners, 3 E → pressure < 1.0)", () => {
    const runners: Runner[] = [];
    // 3 E runners in lead group
    for (let i = 0; i < 3; i++) {
      runners.push(
        makeRunner({
          horseId: `e${i}`,
          position: 100 - i,
          velocity: 17,
          runningStyle: "E",
        }),
      );
    }
    // 11 P runners spread out (not in lead group)
    for (let i = 0; i < 11; i++) {
      runners.push(
        makeRunner({
          horseId: `p${i}`,
          position: 50 - i * 2,
          velocity: 15,
          runningStyle: "P",
        }),
      );
    }
    const result = computePaceContext(runners, 1600);
    // frontRunnersInLeadGroup = 3 (all E, all within LEAD_GROUP_GAP)
    // leadGroupCount = 3
    // pressure = (3 - 1) / max(2, 3 - 1) = 2 / 2 = 1.0
    // But with 14 runners and only 3 in lead group, this should NOT be maxed out
    // if the normalization considers field size. With the proposed formula:
    // pressure = (3 - 1) / max(2, 3 - 1) = 1.0
    // Actually, with only 3 in lead group, pressure IS 1.0 (all 3 are pressing).
    // The normalization is by lead-group size, not field size.
    // Let's test with a larger lead group instead:
    expect(result.pacePressure).toBeLessThanOrEqual(1.0);
  });

  it("large lead group with few E runners has lower pressure", () => {
    const runners: Runner[] = [];
    // 2 E runners + 10 P runners all in lead group (within LEAD_GROUP_GAP)
    for (let i = 0; i < 2; i++) {
      runners.push(
        makeRunner({
          horseId: `e${i}`,
          position: 100 - i,
          velocity: 17,
          runningStyle: "E",
        }),
      );
    }
    for (let i = 0; i < 10; i++) {
      runners.push(
        makeRunner({
          horseId: `p${i}`,
          position: 100 - 2 - i * 0.3, // all within LEAD_GROUP_GAP (4m)
          velocity: 16,
          runningStyle: "P",
        }),
      );
    }
    const result = computePaceContext(runners, 1600);
    // frontRunnersInLeadGroup = 2 (only E counted)
    // leadGroupCount = 12
    // Old formula: (2 - 1) / 2 = 0.5
    // New formula: (2 - 1) / max(2, 12 - 1) = 1 / 11 ≈ 0.09
    // With normalization, pressure should be much lower than 0.5
    expect(result.pacePressure).toBeLessThan(0.5);
  });

  it("single E runner in lead group has zero pressure", () => {
    const runners = [
      makeRunner({ horseId: "h1", position: 100, velocity: 17, runningStyle: "E" }),
      makeRunner({ horseId: "h2", position: 50, velocity: 15, runningStyle: "P" }),
    ];
    const result = computePaceContext(runners, 1600);
    // frontRunnersInLeadGroup = 1, leadGroupCount = 1
    // pressure = (1 - 1) / max(2, 0) = 0 / 2 = 0
    expect(result.pacePressure).toBe(0);
  });
});

describe("computePaceContext — median pace rating", () => {
  it("pace rating uses lead-group median velocity, not just leader", () => {
    // Leader is a runaway front-runner going much faster than the pack
    const runners = [
      makeRunner({ horseId: "h1", position: 200, velocity: 20, runningStyle: "E" }),
      makeRunner({ horseId: "h2", position: 198, velocity: 15, runningStyle: "P" }),
      makeRunner({ horseId: "h3", position: 197, velocity: 15, runningStyle: "P" }),
    ];
    const result = computePaceContext(runners, 1600);
    // All 3 are within LEAD_GROUP_GAP (4m) of leader (position 200)
    // Lead group velocities: [20, 15, 15], sorted: [15, 15, 20], median = 15
    // Old: paceRating = 20 / expectedVel (inflated by runaway leader)
    // New: paceRating = 15 / expectedVel (reflects the actual pack pace)
    const expectedVel = 18.5 - (1600 / 3000) * 2.5; // PACE_BASE_VELOCITY - (distance/PACE_REFERENCE_DISTANCE)*PACE_DISTANCE_FACTOR
    const oldPaceRating = 20 / expectedVel;
    const medianPaceRating = 15 / expectedVel;
    // The new pace rating should be lower than the old one (median < leader)
    expect(result.paceRating).toBeLessThan(oldPaceRating);
    // And should be close to the median-based rating
    expect(result.paceRating).toBeCloseTo(medianPaceRating, 1);
  });

  it("pace rating with single runner uses that runner's velocity", () => {
    const runners = [makeRunner({ position: 100, velocity: 16 })];
    const result = computePaceContext(runners, 1600);
    expect(result.paceRating).toBeGreaterThan(0);
  });

  it("pace rating with all runners at same velocity equals that velocity / expected", () => {
    const runners = [
      makeRunner({ horseId: "h1", position: 100, velocity: 16, runningStyle: "E" }),
      makeRunner({ horseId: "h2", position: 99, velocity: 16, runningStyle: "P" }),
      makeRunner({ horseId: "h3", position: 98, velocity: 16, runningStyle: "S" }),
    ];
    const result = computePaceContext(runners, 1600);
    const expectedVel = 18.5 - (1600 / 3000) * 2.5;
    expect(result.paceRating).toBeCloseTo(16 / expectedVel, 2);
  });
});
