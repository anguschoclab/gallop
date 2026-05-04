import { describe, it, expect } from "vitest";
import { getGradeColorClass } from "@/core/race/grading";

describe("getGradeColorClass", () => {
  it("G1 → yellow-based class", () => {
    const cls = getGradeColorClass("G1");
    expect(cls).toContain("yellow");
  });

  it("G2 → slate-based class", () => {
    const cls = getGradeColorClass("G2");
    expect(cls).toContain("slate");
  });

  it("G3 → amber-based class", () => {
    const cls = getGradeColorClass("G3");
    expect(cls).toContain("amber");
  });

  it("all grades return non-empty strings", () => {
    expect(getGradeColorClass("G1")).toBeTruthy();
    expect(getGradeColorClass("G2")).toBeTruthy();
    expect(getGradeColorClass("G3")).toBeTruthy();
  });

  it("returned values are strings", () => {
    expect(typeof getGradeColorClass("G1")).toBe("string");
    expect(typeof getGradeColorClass("G2")).toBe("string");
    expect(typeof getGradeColorClass("G3")).toBe("string");
  });
});
