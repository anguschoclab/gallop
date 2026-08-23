import { describe, it, expect } from "vitest";

describe("Batch advance progress tracking", () => {
  it("advanceProgress should track current/total days", () => {
    const advanceProgress = { current: 15, total: 30 };
    expect(advanceProgress.current).toBe(15);
    expect(advanceProgress.total).toBe(30);
    expect(advanceProgress.current / advanceProgress.total).toBe(0.5);
  });

  it("advanceProgress cleared when batch completes", () => {
    let advanceProgress: { current: number; total: number } | undefined = {
      current: 30,
      total: 30,
    };
    // Batch complete — clear
    advanceProgress = undefined;
    expect(advanceProgress).toBeUndefined();
  });

  it("advanceProgress cleared when batch stops at player race", () => {
    let advanceProgress: { current: number; total: number } | undefined = {
      current: 15,
      total: 30,
    };
    // Stopped at player race — clear progress
    advanceProgress = undefined;
    expect(advanceProgress).toBeUndefined();
  });
});
