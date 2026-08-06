import { describe, it, expect } from "vitest";
import { scoutGrade, gradeColorClass, type LetterGrade } from "@/core/horse/grading";

describe("grading", () => {
  describe("scoutGrade", () => {
    it("returns correct letter grades based on numeric thresholds", () => {
      expect(scoutGrade(100)).toBe("S");
      expect(scoutGrade(95)).toBe("S");
      expect(scoutGrade(94)).toBe("A+");
      expect(scoutGrade(90)).toBe("A+");
      expect(scoutGrade(89)).toBe("A");
      expect(scoutGrade(80)).toBe("A");
      expect(scoutGrade(79)).toBe("B+");
      expect(scoutGrade(70)).toBe("B+");
      expect(scoutGrade(69)).toBe("B");
      expect(scoutGrade(60)).toBe("B");
      expect(scoutGrade(59)).toBe("C+");
      expect(scoutGrade(50)).toBe("C+");
      expect(scoutGrade(49)).toBe("C");
      expect(scoutGrade(40)).toBe("C");
      expect(scoutGrade(39)).toBe("D");
      expect(scoutGrade(20)).toBe("D");
      expect(scoutGrade(19)).toBe("F");
      expect(scoutGrade(0)).toBe("F");
    });

    it("handles out of bounds gracefully", () => {
      expect(scoutGrade(-10)).toBe("F");
      expect(scoutGrade(150)).toBe("S");
    });
  });

  describe("gradeColorClass", () => {
    it("maps letter grades to expected CSS classes", () => {
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
