import { describe, it, expect } from "vitest";
import { getJockeyTier, JOCKEY_TIER_ORDER, JOCKEY_TIER_LABELS } from "@/core/jockey/jockeyTier";
import { createTestJockey } from "@/tests/helpers/createTestJockey";

describe("JOCKEY_TIER_ORDER", () => {
  it("ranks budget < mid < elite", () => {
    expect(JOCKEY_TIER_ORDER.budget).toBeLessThan(JOCKEY_TIER_ORDER.mid);
    expect(JOCKEY_TIER_ORDER.mid).toBeLessThan(JOCKEY_TIER_ORDER.elite);
  });

  it("has all three tiers", () => {
    expect(Object.keys(JOCKEY_TIER_ORDER).sort()).toEqual(["budget", "elite", "mid"]);
  });
});

describe("JOCKEY_TIER_LABELS", () => {
  it("has all three tiers", () => {
    expect(JOCKEY_TIER_LABELS.budget).toBe("Budget");
    expect(JOCKEY_TIER_LABELS.mid).toBe("Mid-Range");
    expect(JOCKEY_TIER_LABELS.elite).toBe("Elite");
  });
});

describe("getJockeyTier", () => {
  it("returns the stored tier field", () => {
    const j = createTestJockey({ tier: "elite" });
    expect(getJockeyTier(j)).toBe("elite");
  });

  it("returns budget when stored tier is budget", () => {
    const j = createTestJockey({ tier: "budget" });
    expect(getJockeyTier(j)).toBe("budget");
  });

  it("falls back to elite when potential >= 78 and no tier", () => {
    const j = createTestJockey({ potential: 85, tier: undefined as never });
    expect(getJockeyTier(j)).toBe("elite");
  });

  it("falls back to mid when potential >= 60 and < 78 and no tier", () => {
    const j = createTestJockey({ potential: 65, tier: undefined as never });
    expect(getJockeyTier(j)).toBe("mid");
  });

  it("falls back to budget when potential < 60 and no tier", () => {
    const j = createTestJockey({ potential: 40, tier: undefined as never });
    expect(getJockeyTier(j)).toBe("budget");
  });
});
