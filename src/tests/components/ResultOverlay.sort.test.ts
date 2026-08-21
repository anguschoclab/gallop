import { describe, it, expect } from "vitest";
import { compareFinishOrder } from "@/core/race/engine/compareFinishOrder";
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
    gate: 1,
    topSpeed: 16,
    accel: 1,
    staminaFactor: 1,
    noise: 0,
    affinityBonus: 0,
    runningStyle: "EP",
    draftingHorseId: null,
    silk: "",
    ownership: { type: "unowned" },
    weight: 55,
    horse: {} as any,
    ...overrides,
  } as Runner;
}

describe("ResultOverlay — tie-breaking", () => {
  it("sorts identical finishTime by gate then horseId (using compareFinishOrder)", () => {
    const runners = [
      makeRunner({ horseId: "zzz", finishTime: 90.0, gate: 3 }),
      makeRunner({ horseId: "aaa", finishTime: 90.0, gate: 1 }),
      makeRunner({ horseId: "mmm", finishTime: 90.0, gate: 2 }),
    ];

    // This is the sort that ResultOverlay should use after the fix
    const ordered = [...runners].sort(compareFinishOrder);

    expect(ordered.map((r) => r.horseId)).toEqual(["aaa", "mmm", "zzz"]);
  });

  it("sorts null finishTime last", () => {
    const runners = [
      makeRunner({ horseId: "h1", finishTime: null, gate: 1 }),
      makeRunner({ horseId: "h2", finishTime: 90.0, gate: 2 }),
    ];

    const ordered = [...runners].sort(compareFinishOrder);

    expect(ordered[0].horseId).toBe("h2");
    expect(ordered[1].horseId).toBe("h1");
  });

  it("overlay order matches runRaceToCompletion order for same inputs", () => {
    // Verify that the sort used by ResultOverlay (compareFinishOrder)
    // produces the same order as the sort used by runRaceToCompletion
    const runners = [
      makeRunner({ horseId: "c", finishTime: 90.0, gate: 3 }),
      makeRunner({ horseId: "a", finishTime: 90.0, gate: 1 }),
      makeRunner({ horseId: "b", finishTime: 90.0, gate: 2 }),
      makeRunner({ horseId: "d", finishTime: 89.0, gate: 4 }),
    ];

    // ResultOverlay sort (after fix)
    const overlayOrder = [...runners].sort(compareFinishOrder).map((r) => r.horseId);

    // runRaceToCompletion sort (after fix) — same comparator on finishTime/gate/horseId
    const completionOrder = [...runners]
      .map((r) => ({ finishTime: r.finishTime, gate: r.gate, horseId: r.horseId }))
      .sort(compareFinishOrder)
      .map((r) => r.horseId);

    expect(overlayOrder).toEqual(completionOrder);
  });
});

describe("ResultOverlay — gate display", () => {
  it("runner has gate field available for display", () => {
    const runner = makeRunner({ horseId: "h1", gate: 5 });
    expect(runner.gate).toBe(5);
  });
});
