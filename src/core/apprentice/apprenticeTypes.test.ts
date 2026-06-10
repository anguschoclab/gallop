import { describe, it, expect } from "vitest";
import { getClaimAllowance } from "./apprenticeTypes";

describe("apprenticeTypes", () => {
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
});
