import { describe, it, expect } from "vitest";
import { recordFinish } from "@/hooks/race/useLiveRaceSimulation";
import { compareFinishOrder } from "@/core/race/engine/compareFinishOrder";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { makeUnowned } from "@/core/horse/ownership";

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
    ownership: makeUnowned(),
    weight: 55,
    horse: {} as any,
    ...overrides,
  } as Runner;
}

describe("recordFinish — same-tick ordering", () => {
  it("appends entries sorted by finishTime when two runners finish in same tick", () => {
    const finishOrder: { horseId: string; position: number; time: number; gate: number }[] = [];
    // h2 has earlier finishTime but is processed second (array order)
    const r1 = makeRunner({ horseId: "h1", finishTime: 90.5, gate: 1 });
    const r2 = makeRunner({ horseId: "h2", finishTime: 90.3, gate: 2 });

    // Simulate same-tick: both finish, but r1 is first in array order
    recordFinish(r1, finishOrder);
    recordFinish(r2, finishOrder);

    expect(finishOrder[0].horseId).toBe("h2");
    expect(finishOrder[0].position).toBe(1);
    expect(finishOrder[1].horseId).toBe("h1");
    expect(finishOrder[1].position).toBe(2);
  });

  it("tie-breaks by gate when finishTime is identical", () => {
    const finishOrder: { horseId: string; position: number; time: number; gate: number }[] = [];
    const r1 = makeRunner({ horseId: "h1", finishTime: 90.0, gate: 3 });
    const r2 = makeRunner({ horseId: "h2", finishTime: 90.0, gate: 1 });

    recordFinish(r1, finishOrder);
    recordFinish(r2, finishOrder);

    // h2 (gate 1) should be before h1 (gate 3)
    expect(finishOrder[0].horseId).toBe("h2");
    expect(finishOrder[1].horseId).toBe("h1");
  });

  it("tie-breaks by horseId when finishTime and gate are identical", () => {
    const finishOrder: { horseId: string; position: number; time: number; gate: number }[] = [];
    const r1 = makeRunner({ horseId: "zzz", finishTime: 90.0, gate: 2 });
    const r2 = makeRunner({ horseId: "aaa", finishTime: 90.0, gate: 2 });

    recordFinish(r1, finishOrder);
    recordFinish(r2, finishOrder);

    expect(finishOrder[0].horseId).toBe("aaa");
    expect(finishOrder[1].horseId).toBe("zzz");
  });

  it("sorts three same-tick finishers by finishTime regardless of array order", () => {
    const finishOrder: { horseId: string; position: number; time: number; gate: number }[] = [];
    const r1 = makeRunner({ horseId: "h1", finishTime: 90.7, gate: 1 });
    const r2 = makeRunner({ horseId: "h2", finishTime: 90.3, gate: 2 });
    const r3 = makeRunner({ horseId: "h3", finishTime: 90.5, gate: 3 });

    recordFinish(r1, finishOrder);
    recordFinish(r2, finishOrder);
    recordFinish(r3, finishOrder);

    expect(finishOrder.map((f) => f.horseId)).toEqual(["h2", "h3", "h1"]);
    expect(finishOrder.map((f) => f.position)).toEqual([1, 2, 3]);
  });

  it("produces order consistent with compareFinishOrder", () => {
    const finishOrder: { horseId: string; position: number; time: number; gate: number }[] = [];
    const runners = [
      makeRunner({ horseId: "c", finishTime: 90.0, gate: 3 }),
      makeRunner({ horseId: "a", finishTime: 90.0, gate: 1 }),
      makeRunner({ horseId: "b", finishTime: 90.0, gate: 2 }),
    ];

    for (const r of runners) {
      recordFinish(r, finishOrder);
    }

    const expected = [...runners].sort(compareFinishOrder).map((r) => r.horseId);

    expect(finishOrder.map((f) => f.horseId)).toEqual(expected);
  });
});
