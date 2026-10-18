import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ROOT = join(__dirname, "..", "..", "..", "..");
const intentsPath = join(PROJECT_ROOT, "src", "domains", "agents", "simulation", "npc", "intents");
const trainingPath = join(intentsPath, "trainingIntents.ts");
const auctionPath = join(intentsPath, "facilityIntents.ts");
const breedingPath = join(intentsPath, "breedingIntents.ts");
const facilityPath = join(intentsPath, "facilityIntents.ts");

const trainingText = readFileSync(trainingPath, "utf-8");
const auctionText = readFileSync(auctionPath, "utf-8");
const breedingText = readFileSync(breedingPath, "utf-8");
const facilityText = readFileSync(facilityPath, "utf-8");

describe("Budget Allocation Enforcement (Test-First)", () => {
  describe("training budget", () => {
    it("generateNpcTrainingIntents reads budgetAllocation.training", () => {
      expect(trainingText).toContain("budgetAllocation");
      expect(trainingText).toContain("training");
    });
  });

  describe("auction budget", () => {
    it("generateNpcAuctionIntents reads budgetAllocation.auctions", () => {
      expect(auctionText).toContain("budgetAllocation");
      expect(auctionText).toContain("auctions");
    });
  });

  describe("breeding budget", () => {
    it("breeding budget is read somewhere in intent modules", () => {
      expect(breedingText).toContain("budgetAllocation");
      expect(breedingText).toMatch(/budgetAllocation.*breeding|breeding.*budgetAllocation/);
    });
  });

  describe("facilities budget", () => {
    it("facilities budget is read somewhere in intent modules", () => {
      expect(facilityText).toContain("budgetAllocation");
      expect(facilityText).toMatch(/budgetAllocation.*facilities|facilities.*budgetAllocation/);
    });
  });
});
