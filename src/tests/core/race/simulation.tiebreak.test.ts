import { describe, it, expect } from "vitest";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import { compareFinishOrder } from "@/core/race/engine/compareFinishOrder";
import { createRng } from "@/core/common/rng";
import type { Runner } from "@/core/race/engine/runnerBuilder";

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Runner",
    position: 0,
    finishTime: null,
    velocity: 15,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    barrier: 1,
    topSpeed: 16,
    accel: 1,
    staminaFactor: 1,
    noise: 0,
    affinityBonus: 0,
    runningStyle: "EP",
    draftingHorseId: null,
    silk: "",
    owned: false,
    weight: 55,
    horse: {} as any,
    ...overrides,
  } as Runner;
}

describe("runRaceToCompletion — tie-breaking", () => {
  it("ranks identical finishTime by barrier then horseId", () => {
    // Create runners that will have identical finishTimes by making them
    // finish at the same time. We simulate a very short race.
    const runners = [
      makeRunner({
        horseId: "zzz",
        barrier: 3,
        position: 0,
        topSpeed: 100,
        velocity: 100,
      }),
      makeRunner({
        horseId: "aaa",
        barrier: 1,
        position: 0,
        topSpeed: 100,
        velocity: 100,
      }),
      makeRunner({
        horseId: "mmm",
        barrier: 2,
        position: 0,
        topSpeed: 100,
        velocity: 100,
      }),
    ];

    const rng = createRng("test-tiebreak");
    const { result } = runRaceToCompletion(runners, 100, rng, 0.1, 600, undefined, false);

    // All three should finish at the same time (or very close).
    // The tie-break should order them by barrier: 1, 2, 3
    const positions = result.map((r) => r.horseId);
    expect(positions[0]).toBe("aaa"); // barrier 1
    expect(positions[1]).toBe("mmm"); // barrier 2
    expect(positions[2]).toBe("zzz"); // barrier 3
  });

  it("ranks DNF runners (Infinity time) after all finishers", () => {
    const runners = [
      makeRunner({ horseId: "h1", barrier: 1, topSpeed: 50, velocity: 50 }),
      makeRunner({ horseId: "h2", barrier: 2, topSpeed: 0, velocity: 0 }),
    ];

    const rng = createRng("test-dnf");
    const { result } = runRaceToCompletion(runners, 100, rng, 0.1, 600, undefined, false);

    // h1 should finish, h2 should DNF (can't move with 0 speed)
    const h1Result = result.find((r) => r.horseId === "h1");
    const h2Result = result.find((r) => r.horseId === "h2");
    expect(h1Result).toBeDefined();
    expect(h2Result).toBeDefined();
    expect(Number.isFinite(h1Result!.time)).toBe(true);
    expect(Number.isFinite(h2Result!.time)).toBe(false);
    expect(h1Result!.position).toBeLessThan(h2Result!.position);
  });

  it("uses compareFinishOrder for final ranking", () => {
    // Verify that the result ordering matches what compareFinishOrder would produce
    const runners = [
      makeRunner({ horseId: "c", barrier: 3, topSpeed: 80, velocity: 80 }),
      makeRunner({ horseId: "a", barrier: 1, topSpeed: 80, velocity: 80 }),
      makeRunner({ horseId: "b", barrier: 2, topSpeed: 80, velocity: 80 }),
    ];

    const rng = createRng("test-compare");
    const { result } = runRaceToCompletion(runners, 50, rng, 0.1, 600, undefined, false);

    // Build the expected order using compareFinishOrder on the actual finish times
    const expected = [...result]
      .map((r) => ({
        finishTime: r.time,
        barrier: runners.find((rn) => rn.horseId === r.horseId)?.barrier,
        horseId: r.horseId,
      }))
      .sort(compareFinishOrder);

    expect(result.map((r) => r.horseId)).toEqual(expected.map((r) => r.horseId));
  });
});
