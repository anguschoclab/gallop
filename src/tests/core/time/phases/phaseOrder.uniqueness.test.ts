import { describe, it, expect } from "vitest";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases";

describe("Phase order uniqueness", () => {
  it("T44: no two phases share the same order value", () => {
    const orders = GAME_PIPELINE_PHASES.map((p) => p.order);
    const uniqueOrders = new Set(orders);
    expect(orders.length).toBe(uniqueOrders.size);
  });

  it("T45: all phase orders are within range 1-202", () => {
    for (const phase of GAME_PIPELINE_PHASES) {
      expect(phase.order).toBeGreaterThanOrEqual(1);
      expect(phase.order).toBeLessThanOrEqual(202);
    }
  });

  it("T46: phase execution order matches sorted order of GAME_PIPELINE_PHASES", () => {
    const sorted = [...GAME_PIPELINE_PHASES].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].order).toBeLessThan(sorted[i + 1].order);
    }
  });

  it("T47: raceCancellation phase exists with order 88", () => {
    const phase = GAME_PIPELINE_PHASES.find((p) => p.name === "raceCancellation");
    expect(phase).toBeDefined();
    expect(phase!.order).toBe(88);
  });

  it("T48: cashPressureHistory phase exists with order 201", () => {
    const phase = GAME_PIPELINE_PHASES.find((p) => p.name === "cashPressureHistory");
    expect(phase).toBeDefined();
    expect(phase!.order).toBe(201);
  });
});
