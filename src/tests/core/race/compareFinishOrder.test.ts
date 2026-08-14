import { describe, it, expect } from "vitest";
import { compareFinishOrder } from "@/core/race/engine/compareFinishOrder";

describe("compareFinishOrder", () => {
  it("sorts by finishTime ascending when times differ", () => {
    const a = { finishTime: 90.5, barrier: 1, horseId: "h1" };
    const b = { finishTime: 91.0, barrier: 2, horseId: "h2" };
    expect(compareFinishOrder(a, b)).toBeLessThan(0);
    expect(compareFinishOrder(b, a)).toBeGreaterThan(0);
  });

  it("tie-breaks by barrier (lower wins) when finishTime is identical", () => {
    const a = { finishTime: 90.0, barrier: 3, horseId: "h1" };
    const b = { finishTime: 90.0, barrier: 1, horseId: "h2" };
    expect(compareFinishOrder(a, b)).toBeGreaterThan(0);
    expect(compareFinishOrder(b, a)).toBeLessThan(0);
  });

  it("tie-breaks by horseId (lexicographic) when finishTime and barrier are identical", () => {
    const a = { finishTime: 90.0, barrier: 2, horseId: "zzz" };
    const b = { finishTime: 90.0, barrier: 2, horseId: "aaa" };
    expect(compareFinishOrder(a, b)).toBeGreaterThan(0);
    expect(compareFinishOrder(b, a)).toBeLessThan(0);
  });

  it("returns 0 when all three fields are identical", () => {
    const a = { finishTime: 90.0, barrier: 2, horseId: "h1" };
    const b = { finishTime: 90.0, barrier: 2, horseId: "h1" };
    expect(compareFinishOrder(a, b)).toBe(0);
  });

  it("sorts null finishTime last (as Infinity)", () => {
    const a = { finishTime: null, barrier: 1, horseId: "h1" };
    const b = { finishTime: 90.0, barrier: 2, horseId: "h2" };
    expect(compareFinishOrder(a, b)).toBeGreaterThan(0);
    expect(compareFinishOrder(b, a)).toBeLessThan(0);
  });

  it("sorts Infinity finishTime last", () => {
    const a = { finishTime: Infinity, barrier: 1, horseId: "h1" };
    const b = { finishTime: 90.0, barrier: 2, horseId: "h2" };
    expect(compareFinishOrder(a, b)).toBeGreaterThan(0);
  });

  it("treats two null finishTimes as ties and falls through to barrier", () => {
    const a = { finishTime: null, barrier: 1, horseId: "h1" };
    const b = { finishTime: null, barrier: 2, horseId: "h2" };
    expect(compareFinishOrder(a, b)).toBeLessThan(0);
  });

  it("is deterministic — same input always produces same output", () => {
    const a = { finishTime: 90.0, barrier: 2, horseId: "h1" };
    const b = { finishTime: 90.0, barrier: 1, horseId: "h2" };
    const r1 = compareFinishOrder(a, b);
    const r2 = compareFinishOrder(a, b);
    expect(r1).toBe(r2);
  });

  it("sorts an array of mixed finishers and DNFs correctly", () => {
    const runners = [
      { finishTime: null, barrier: 1, horseId: "dnf1" },
      { finishTime: 90.0, barrier: 2, horseId: "h2" },
      { finishTime: 90.0, barrier: 1, horseId: "h1" },
      { finishTime: Infinity, barrier: 3, horseId: "dnf2" },
    ];
    const sorted = [...runners].sort(compareFinishOrder);
    expect(sorted.map((r) => r.horseId)).toEqual(["h1", "h2", "dnf1", "dnf2"]);
  });

  it("handles missing barrier by treating it as Infinity", () => {
    const a = { finishTime: 90.0, horseId: "h1" };
    const b = { finishTime: 90.0, barrier: 1, horseId: "h2" };
    expect(compareFinishOrder(a, b)).toBeGreaterThan(0);
  });
});
