import { describe, it, expect } from "vitest";
import {
  createStewardsInquiry,
  generateRandomInquiry,
  resolveInquiry,
  formatInquiryType,
  formatInquiryOutcome,
} from "@/core/stewards/stewardTypes";
import type { Rng } from "@/core/common/rng";

describe("stewardTypes", () => {
  describe("createStewardsInquiry", () => {
    it("should create a basic inquiry with pending status", () => {
      const inquiry = createStewardsInquiry(
        "race-1",
        100,
        "interference",
        "horse-A",
        "Bumped rival",
      );

      expect(inquiry.id).toBeDefined();
      expect(inquiry.raceId).toBe("race-1");
      expect(inquiry.day).toBe(100);
      expect(inquiry.type).toBe("interference");
      expect(inquiry.accusedHorseId).toBe("horse-A");
      expect(inquiry.description).toBe("Bumped rival");
      expect(inquiry.status).toBe("pending");

      // Optionals should be undefined
      expect(inquiry.accusedJockeyId).toBeUndefined();
      expect(inquiry.reportingHorseId).toBeUndefined();
      expect(inquiry.evidence).toBeUndefined();
      expect(inquiry.outcome).toBeUndefined();
    });

    it("should populate optional fields when provided", () => {
      const inquiry = createStewardsInquiry(
        "race-1",
        100,
        "improper_riding",
        "horse-A",
        "description",
        {
          accusedJockeyId: "jockey-1",
          reportingHorseId: "horse-B",
          evidence: ["Video replay"],
        },
      );

      expect(inquiry.accusedJockeyId).toBe("jockey-1");
      expect(inquiry.reportingHorseId).toBe("horse-B");
      expect(inquiry.evidence).toEqual(["Video replay"]);
    });
  });

  describe("generateRandomInquiry", () => {
    // Create a deterministic mock RNG
    const createMockRng = (values: number[]): Rng => {
      let index = 0;
      return {
        next: () => {
          const val = values[index % values.length];
          index++;
          return val;
        },
      } as Rng;
    };

    it("should return null if rng generates a value > 0.05", () => {
      const rng = createMockRng([0.06]);
      const result = generateRandomInquiry("race-1", 100, ["horse-1", "horse-2"], rng);
      expect(result).toBeNull();
    });

    it("should generate an inquiry when rng generates <= 0.05", () => {
      // rng calls:
      // 1. 0.04 (inquiry chance, <= 0.05)
      // 2. 0.1 (type selection, 0.1 * 3 = 0.3 -> index 0 -> "interference")
      // 3. 0.5 (accused horse selection, 0.5 * 2 = 1.0 -> index 1 -> "horse-2")
      // 4. 0.5 (reporting horse selection, from remaining ["horse-1"], length 1, 0.5 * 1 = 0.5 -> index 0 -> "horse-1")
      const rng = createMockRng([0.04, 0.1, 0.5, 0.5]);
      const horseIds = ["horse-1", "horse-2"];

      const result = generateRandomInquiry("race-1", 100, horseIds, rng);

      expect(result).toBeDefined();
      expect(result?.raceId).toBe("race-1");
      expect(result?.type).toBe("interference");
      expect(result?.accusedHorseId).toBe("horse-2");
      expect(result?.reportingHorseId).toBe("horse-1");
    });

    it("documents CURRENT behavior: handles single horse array gracefully but yields undefined reporting horse", () => {
      // If there's only 1 horse in the array, the accused horse will be the only horse.
      // Then `horseIds.filter(...)` will be empty.
      // `Math.floor(_rng.next() * (horseIds.length - 1))` -> Math.floor(rng * 0) = 0.
      // Accessing index 0 of an empty array returns undefined.
      // rng calls: 0.01 (pass), 0.5 (type), 0.5 (accused), 0.5 (reporting - irrelevant)
      const rng = createMockRng([0.01, 0.5, 0.5, 0.5]);
      const horseIds = ["lone-horse"];

      const result = generateRandomInquiry("race-1", 100, horseIds, rng);

      expect(result).toBeDefined();
      expect(result?.accusedHorseId).toBe("lone-horse");
      // This exposes a latent bug/edge case where an inquiry involves an undefined reporting horse
      // when generated on a race with only 1 horse.
      expect(result?.reportingHorseId).toBeUndefined();
    });
  });

  describe("resolveInquiry", () => {
    it("should resolve a pending inquiry with outcome", () => {
      const inquiry = createStewardsInquiry(
        "race-1",
        100,
        "interference",
        "horse-A",
        "Bumped rival",
      );

      const resolved = resolveInquiry(inquiry, "disqualification");

      expect(resolved.id).toBe(inquiry.id);
      expect(resolved.status).toBe("resolved");
      expect(resolved.outcome).toBe("disqualification");
      expect(resolved.fineAmount).toBeUndefined();
      expect(resolved.suspensionDays).toBeUndefined();
    });

    it("should resolve an inquiry with fine and suspension", () => {
      const inquiry = createStewardsInquiry(
        "race-1",
        100,
        "improper_riding",
        "horse-A",
        "description",
      );

      const resolved = resolveInquiry(inquiry, "suspension", 500, 3);

      expect(resolved.status).toBe("resolved");
      expect(resolved.outcome).toBe("suspension");
      expect(resolved.fineAmount).toBe(500);
      expect(resolved.suspensionDays).toBe(3);
    });
  });

  describe("formatters", () => {
    it("should format inquiry types correctly", () => {
      expect(formatInquiryType("interference")).toBe("Interference");
      expect(formatInquiryType("equipment_issue")).toBe("Equipment Issue");
    });

    it("should format inquiry outcomes correctly", () => {
      expect(formatInquiryOutcome("dq_placed_last")).toBe("DQ - Placed Last");
      expect(formatInquiryOutcome("warning")).toBe("Warning");
    });
  });
});
