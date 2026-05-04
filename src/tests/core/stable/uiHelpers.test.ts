import { describe, it, expect } from "vitest";
import { getTierColor, getReputationStars } from "./uiHelpers";
import type { StableTier } from "@/game/types";

describe("getTierColor", () => {
  it("returns correct color for elite tier", () => {
    expect(getTierColor("elite")).toContain("purple");
  });

  it("returns correct color for mid tier", () => {
    expect(getTierColor("mid")).toContain("blue");
  });

  it("returns correct color for budget tier", () => {
    expect(getTierColor("budget")).toContain("green");
  });

  it("returns default color for unknown tier", () => {
    expect(getTierColor("unknown" as StableTier)).toContain("gray");
  });
});

describe("getReputationStars", () => {
  it("returns 5 filled stars for 100 reputation", () => {
    expect(getReputationStars(100)).toBe("★★★★★");
  });

  it("returns 4 filled stars for 99 reputation", () => {
    expect(getReputationStars(99)).toBe("★★★★☆");
  });

  it("returns 4 filled stars for 80 reputation", () => {
    expect(getReputationStars(80)).toBe("★★★★☆");
  });

  it("returns 3 filled stars for 60 reputation", () => {
    expect(getReputationStars(60)).toBe("★★★☆☆");
  });

  it("returns 2 filled stars for 40 reputation", () => {
    expect(getReputationStars(40)).toBe("★★☆☆☆");
  });

  it("returns 1 filled star for 20 reputation", () => {
    expect(getReputationStars(20)).toBe("★☆☆☆☆");
  });

  it("returns 0 filled stars for 0 reputation", () => {
    expect(getReputationStars(0)).toBe("☆☆☆☆☆");
  });

  it("handles edge case of 19 reputation", () => {
    expect(getReputationStars(19)).toBe("☆☆☆☆☆");
  });
});
