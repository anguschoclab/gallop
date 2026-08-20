import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import * as barrel from "@/constants";

describe("dead code removal", () => {
  it("SIMULATION_FIXED_DT is not exported from barrel", () => {
    expect((barrel as Record<string, unknown>).SIMULATION_FIXED_DT).toBeUndefined();
  });

  it("old SIMULATION_MAX_STEPS_PER_FRAME is replaced by raceSimulation version", () => {
    // SIMULATION_MAX_STEPS_PER_FRAME should now come from raceSimulationConstants
    expect(barrel.SIMULATION_MAX_STEPS_PER_FRAME).toBe(64);
  });

  it("gameConstants.ts is deleted", () => {
    const filePath = resolve(__dirname, "../../constants/gameConstants.ts");
    expect(existsSync(filePath)).toBe(false);
  });
});
