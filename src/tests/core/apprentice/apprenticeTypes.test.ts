import { describe, it, expect } from "vitest";
import { getApprenticeStatus, getClaimAllowance } from "@/core/apprentice/apprenticeTypes";

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

describe("getClaimAllowance", () => {
  it("should return 0 for negative wins", () => {
    expect(getClaimAllowance(-1)).toBe(0);
    expect(getClaimAllowance(-10)).toBe(0);
  });

  it("should return correct allowance for 0-4 wins", () => {
    expect(getClaimAllowance(0)).toBe(10);
    expect(getClaimAllowance(1)).toBe(7);
    expect(getClaimAllowance(2)).toBe(5);
    expect(getClaimAllowance(3)).toBe(3);
    expect(getClaimAllowance(4)).toBe(1);
  });

  it("should return 0 for 5 or more wins", () => {
    expect(getClaimAllowance(5)).toBe(0);
    expect(getClaimAllowance(10)).toBe(0);
    expect(getClaimAllowance(100)).toBe(0);
  });
});
