import { describe, it, expect } from "vitest";
import { createDefaultRacingState } from "@/game/store/state/racingState";

describe("createDefaultRacingState", () => {
  it("returns object with trainingUsed as empty object", () => {
    const state = createDefaultRacingState();
    expect(state.trainingUsed).toEqual({});
  });

  it("trainingUsed is not null or undefined", () => {
    const state = createDefaultRacingState();
    expect(state.trainingUsed).not.toBeNull();
    expect(state.trainingUsed).not.toBeUndefined();
  });

  it("optional fields are absent", () => {
    const state = createDefaultRacingState();
    expect("paceSamples" in state).toBe(false);
    expect("calibratedPars" in state).toBe(false);
    expect("lastCalibrationDay" in state).toBe(false);
  });

  it("returns a new object each call", () => {
    const a = createDefaultRacingState();
    const b = createDefaultRacingState();
    expect(a).not.toBe(b);
    expect(a.trainingUsed).not.toBe(b.trainingUsed);
  });
});
