import { describe, it, expect } from "vitest";
import { scoutGrade, gradeColorClass } from "@/core/horse/grading";

describe("grading", () => {
  describe("scoutGrade", () => {
    it("returns S for stats >= 95", () => {
      expect(scoutGrade(100)).toBe("S");
      expect(scoutGrade(95)).toBe("S");
    });
    it("returns A+ for stats 90-94", () => {
      expect(scoutGrade(94)).toBe("A+");
      expect(scoutGrade(90)).toBe("A+");
    });
    it("returns A for stats 80-89", () => {
      expect(scoutGrade(89)).toBe("A");
      expect(scoutGrade(80)).toBe("A");
    });
    it("returns B+ for stats 70-79", () => {
      expect(scoutGrade(79)).toBe("B+");
      expect(scoutGrade(70)).toBe("B+");
    });
    it("returns B for stats 60-69", () => {
      expect(scoutGrade(69)).toBe("B");
      expect(scoutGrade(60)).toBe("B");
    });
    it("returns C+ for stats 50-59", () => {
      expect(scoutGrade(59)).toBe("C+");
      expect(scoutGrade(50)).toBe("C+");
    });
    it("returns C for stats 40-49", () => {
      expect(scoutGrade(49)).toBe("C");
      expect(scoutGrade(40)).toBe("C");
    });
    it("returns D for stats 20-39", () => {
      expect(scoutGrade(39)).toBe("D");
      expect(scoutGrade(20)).toBe("D");
    });
    it("returns F for stats < 20", () => {
      expect(scoutGrade(19)).toBe("F");
      expect(scoutGrade(0)).toBe("F");
      expect(scoutGrade(-10)).toBe("F");
    });
  });

  describe("gradeColorClass", () => {
    it("returns correct color classes", () => {
      expect(gradeColorClass("S")).toBe("text-fame font-black animate-pulse");
      expect(gradeColorClass("A+")).toBe("text-gold font-bold");
      expect(gradeColorClass("A")).toBe("text-gold font-bold");
      expect(gradeColorClass("B+")).toBe("text-success font-medium");
      expect(gradeColorClass("B")).toBe("text-success font-medium");
      expect(gradeColorClass("C+")).toBe("text-warning");
      expect(gradeColorClass("C")).toBe("text-warning");
      expect(gradeColorClass("D")).toBe("text-destructive/80");
      expect(gradeColorClass("F")).toBe("text-cream/20 italic");
    });
  });
});
