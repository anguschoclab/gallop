import { describe, it, expect } from "vitest";
import { getMajorStables } from "./npcStables";
import type { Stable } from "./types";

const mockStable = (id: string, isMajor: boolean): Stable => ({
  id,
  name: `Stable ${id}`,
  owner: `Owner ${id}`,
  tier: "mid",
  reputation: 50,
  founded: 1,
  cash: 100000,
  horses: [],
  isMajor,
  colors: { primary: "#000000", secondary: "#ffffff" },
  personality: "balanced",
  npcStables: []
});

describe("getMajorStables", () => {
  it("should return only major stables", () => {
    const stables = [
      mockStable("1", true),
      mockStable("2", false),
      mockStable("3", true),
    ];
    const result = getMajorStables(stables);
    expect(result.length).toBe(2);
    expect(result.map(s => s.id)).toEqual(["1", "3"]);
  });

  it("should return an empty array if no major stables exist", () => {
    const stables = [
      mockStable("1", false),
      mockStable("2", false),
    ];
    const result = getMajorStables(stables);
    expect(result.length).toBe(0);
  });

  it("should return all stables if all are major", () => {
    const stables = [
      mockStable("1", true),
      mockStable("2", true),
    ];
    const result = getMajorStables(stables);
    expect(result.length).toBe(2);
    expect(result.map(s => s.id)).toEqual(["1", "2"]);
  });

  it("should return an empty array if the input array is empty", () => {
    const result = getMajorStables([]);
    expect(result.length).toBe(0);
  });
});
