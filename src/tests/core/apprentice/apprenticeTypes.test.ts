import { describe, it, expect } from "vitest";
import { getApprenticeStatus } from "../../../src/core/apprentice/apprenticeTypes";

describe("getApprenticeStatus", () => {
  it('returns "apprentice" for less than 5 wins', () => {
    expect(getApprenticeStatus(0)).toBe("apprentice");
    expect(getApprenticeStatus(4)).toBe("apprentice");
  });

  it('returns "journeyman" for 5 to 49 wins', () => {
    expect(getApprenticeStatus(5)).toBe("journeyman");
    expect(getApprenticeStatus(25)).toBe("journeyman");
    expect(getApprenticeStatus(49)).toBe("journeyman");
  });

  it('returns "senior" for 50 or more wins', () => {
    expect(getApprenticeStatus(50)).toBe("senior");
    expect(getApprenticeStatus(100)).toBe("senior");
    expect(getApprenticeStatus(1000)).toBe("senior");
  });

  it("handles negative numbers correctly", () => {
    // Depending on the intended behavior, negative numbers might just be considered < 5
    // Here we assume it safely returns "apprentice" for negative numbers
    expect(getApprenticeStatus(-1)).toBe("apprentice");
  });
});
