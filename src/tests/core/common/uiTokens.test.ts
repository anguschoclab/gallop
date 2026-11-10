/**
 * uiTokens.test.ts - UI color token mapping tests
 *
 * Tests for the grade/tier/condition/reputation → Tailwind class lookups
 * in @/shared/common/uiTokens.
 */

import { describe, it, expect } from "vitest";
import {
  gradeColor,
  statGradeColor,
  stableTierColor,
  staffTierColor,
  conditionColor,
  reputationColor,
} from "@/shared/common/uiTokens";
import type { LetterGrade } from "@/domains/horse/simulation/grading";
import type { StableTier } from "@/domains/stable/simulation/types";
import type { StaffTier } from "@/domains/staff/model/staffTypes";
import type { TrackCondition } from "@/domains/race/simulation/types";
import type { ReputationTier } from "@/domains/reputation/model/reputationTypes";

describe("gradeColor", () => {
  it.each<[string, string]>([
    ["G1", "text-yellow-400"],
    ["G2", "text-orange-400"],
    ["G3", "text-red-400"],
    ["Listed", "text-blue-400"],
    ["Stakes", "text-purple-400"],
    ["Allowance", "text-green-400"],
    ["Maiden", "text-gray-400"],
    ["Claiming", "text-pink-400"],
  ])("maps %s to %s", (grade, expected) => {
    expect(gradeColor(grade)).toBe(expected);
  });

  it("falls back to gray for unknown grades", () => {
    expect(gradeColor("Unlisted")).toBe("text-gray-400");
  });
});

describe("statGradeColor", () => {
  it.each<[LetterGrade, string]>([
    ["S", "text-fame font-black animate-pulse"],
    ["A+", "text-primary font-bold"],
    ["A", "text-primary font-bold"],
    ["B+", "text-success font-medium"],
    ["B", "text-success font-medium"],
    ["C+", "text-warning"],
    ["C", "text-warning"],
    ["D", "text-destructive/80"],
    ["F", "text-foreground/20 italic"],
  ])("maps %s to %s", (grade, expected) => {
    expect(statGradeColor(grade)).toBe(expected);
  });

  it("falls back to gray for unknown grades", () => {
    expect(statGradeColor("Z" as LetterGrade)).toBe("text-gray-400");
  });
});

describe("stableTierColor", () => {
  it.each<[StableTier, string]>([
    ["elite", "text-yellow-400"],
    ["mid", "text-blue-400"],
    ["budget", "text-gray-400"],
  ])("maps %s to %s", (tier, expected) => {
    expect(stableTierColor(tier)).toBe(expected);
  });

  it("falls back to gray for unknown tiers", () => {
    expect(stableTierColor("mega" as StableTier)).toBe("text-gray-400");
  });
});

describe("staffTierColor", () => {
  it.each<[StaffTier, string]>([
    ["elite", "text-yellow-400"],
    ["mid", "text-blue-400"],
    ["budget", "text-gray-400"],
  ])("maps %s to %s", (tier, expected) => {
    expect(staffTierColor(tier)).toBe(expected);
  });

  it("falls back to gray for unknown tiers", () => {
    expect(staffTierColor("legendary" as StaffTier)).toBe("text-gray-400");
  });
});

describe("conditionColor", () => {
  it.each<[TrackCondition, string]>([
    ["fast", "text-green-400"],
    ["good", "text-green-300"],
    ["yielding", "text-yellow-400"],
    ["soft", "text-orange-400"],
    ["heavy", "text-red-400"],
  ])("maps %s to %s", (condition, expected) => {
    expect(conditionColor(condition)).toBe(expected);
  });

  it("falls back to gray for unknown conditions", () => {
    expect(conditionColor("frozen" as TrackCondition)).toBe("text-gray-400");
  });
});

describe("reputationColor", () => {
  it.each<[ReputationTier, string]>([
    ["legendary", "text-yellow-400"],
    ["world_class", "text-orange-400"],
    ["international", "text-red-400"],
    ["national", "text-green-400"],
    ["regional", "text-blue-400"],
    ["local", "text-gray-400"],
    ["unknown", "text-gray-500"],
  ])("maps %s to %s", (tier, expected) => {
    expect(reputationColor(tier)).toBe(expected);
  });

  it("falls back to gray for unknown tiers", () => {
    expect(reputationColor("mythic" as ReputationTier)).toBe("text-gray-400");
  });
});
