import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ROOT = join(__dirname, "..", "..", "..", "..");
const intentGenPath = join(PROJECT_ROOT, "src", "core", "npc", "intentGenerators.ts");
const intentGenText = readFileSync(intentGenPath, "utf-8");

describe("Budget Allocation Enforcement (Test-First)", () => {
  describe("training budget", () => {
    it("generateNpcTrainingIntents reads budgetAllocation.training", () => {
      expect(intentGenText).toContain("budgetAllocation");
      // Check that training budget is referenced in the training intent function
      const trainingSection = intentGenText.substring(
        intentGenText.indexOf("function generateNpcTrainingIntents"),
        intentGenText.indexOf("function generateNpcRaceEntryIntents"),
      );
      expect(trainingSection).toContain("budgetAllocation");
      expect(trainingSection).toContain("training");
    });
  });

  describe("auction budget", () => {
    it("generateNpcAuctionIntents reads budgetAllocation.auctions", () => {
      const auctionSection = intentGenText.substring(
        intentGenText.indexOf("function generateNpcAuctionIntents"),
        intentGenText.indexOf("function generateNpcStudFeeIntents"),
      );
      expect(auctionSection).toContain("budgetAllocation");
      expect(auctionSection).toContain("auctions");
    });
  });

  describe("breeding budget", () => {
    it("breeding budget is read somewhere in intentGenerators", () => {
      expect(intentGenText).toContain("budgetAllocation");
      // Breeding budget should be referenced somewhere
      expect(intentGenText).toMatch(/budgetAllocation.*breeding|breeding.*budgetAllocation/);
    });
  });

  describe("facilities budget", () => {
    it("facilities budget is read somewhere in intentGenerators", () => {
      expect(intentGenText).toContain("budgetAllocation");
      // Facilities budget should be referenced somewhere
      expect(intentGenText).toMatch(/budgetAllocation.*facilities|facilities.*budgetAllocation/);
    });
  });
});
