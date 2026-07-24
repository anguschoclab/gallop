import { describe, it, expect } from "vitest";

describe("advance.ts dead code removal", () => {
  it("T21: advanceMultipleDaysWithRaceDetection is not exported from advance.ts", async () => {
    const module = await import("@/core/time/advance");
    expect((module as any).advanceMultipleDaysWithRaceDetection).toBeUndefined();
  });

  it("T22: computePlayerRaceDays is still exported", async () => {
    const module = await import("@/core/time/advance");
    expect(typeof module.computePlayerRaceDays).toBe("function");
  });
});
