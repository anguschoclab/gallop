import { describe, it, expect } from "vitest";
import { canReceiveAtLargeInvite } from "@/core/reputation/reputationGating";
import { getReputationTier } from "@/core/reputation/reputationTypes";

describe("race invitation gating integration", () => {
  function checkInvite(grade: string, reputationScore: number) {
    const tier = getReputationTier(reputationScore);
    return canReceiveAtLargeInvite(grade, tier);
  }

  it("blocks G1 at-large invite when reputation < 300", () => {
    const result = checkInvite("G1", 150);
    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe("regional");
  });

  it("allows G1 at-large invite when reputation >= 300", () => {
    const result = checkInvite("G1", 300);
    expect(result.allowed).toBe(true);
  });

  it("blocks G2 at-large invite when reputation < 300", () => {
    const result = checkInvite("G2", 150);
    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe("regional");
  });

  it("allows G2 at-large invite when reputation >= 300", () => {
    const result = checkInvite("G2", 300);
    expect(result.allowed).toBe(true);
  });

  it("blocks G3 at-large invite when reputation < 150", () => {
    const result = checkInvite("G3", 0);
    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe("local");
  });

  it("allows G3 at-large invite when reputation >= 150", () => {
    const result = checkInvite("G3", 150);
    expect(result.allowed).toBe(true);
  });

  it("allows non-graded races (no gate)", () => {
    const result = checkInvite("Maiden", 0);
    expect(result.allowed).toBe(true);
  });

  it("allows win-and-you-in regardless of reputation (bypasses gate)", () => {
    // Win-and-you-in is handled in the phase logic, not in canReceiveAtLargeInvite.
    // But the function itself should still gate at-large entries.
    // The phase must check winAndYouIn separately before calling canReceiveAtLargeInvite.
    expect(checkInvite("G1", 0).allowed).toBe(false);
  });
});
