import { describe, it, expect } from "vitest";
import { calculateConditionRecovery } from "@/core/race/trackConditions";

describe("calculateConditionRecovery", () => {
  it("improves conditions based on days rested", () => {
    // heavy condition (index 3), DAILY_RECOVERY_RATES["heavy"] = 3
    // climate "temperate", CLIMATE_DRYING_RATES["temperate"] = 1
    // 1 day rested: 3 * 1 = 3 total recovery
    // steps = floor(3/3) = 1 step
    // index 3 - 1 = index 2 (soft)
    expect(calculateConditionRecovery("heavy", 1, "temperate")).toBe("soft");
  });

  it("recovers more in arid climates compared to humid ones", () => {
    // yielding condition (index 4), DAILY_RECOVERY_RATES["yielding"] = 4
    // 1 day rested
    // arid: 4 * 2.0 = 8 total recovery -> 2 steps -> index 2 (soft)
    // humid: 4 * 0.7 = 2.8 total recovery -> 0 steps -> index 4 (yielding)
    const aridRecovery = calculateConditionRecovery("yielding", 1, "arid");
    const humidRecovery = calculateConditionRecovery("yielding", 1, "humid");

    expect(aridRecovery).toBe("soft");
    expect(humidRecovery).toBe("yielding");
  });

  it("does not improve past fast condition", () => {
    expect(calculateConditionRecovery("fast", 10, "arid")).toBe("fast");
    expect(calculateConditionRecovery("good", 10, "arid")).toBe("fast");
  });

  it("fast track has 0 recovery rate and stays fast", () => {
    expect(calculateConditionRecovery("fast", 1, "temperate")).toBe("fast");
  });
});
