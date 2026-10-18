import { describe, expect, it } from "vitest";
import { generateNpcFacilityUpgradeIntents } from "@/domains/agents/simulation/npc/intents/facilityIntents";
import { createStableAIState } from "@/domains/agents/simulation/npcCycleAI";
import { createFacilityAIState } from "@/domains/agents/simulation/facilityAITypes";
import { createTestStable } from "@/tests/helpers/createTestStable";
import type { PlayerFacilities } from "@/domains/facilities/simulation";
import { createDefaultPlayerFacilities } from "@/domains/facilities/simulation/facilityDefaults";

describe("generateNpcFacilityUpgradeIntents", () => {
  it("does not commit an upgrade that exceeds both stable cash and the facilities reservation", () => {
    const stable = createTestStable({ id: "npc-1", cash: 1_000, personality: "aggressive" });
    const stableAI = {
      ...createStableAIState(stable, 1),
      budgetAllocation: {
        total: 100_000,
        training: 0,
        facilities: 100_000,
        auctions: 0,
        claiming: 0,
        breeding: 0,
      },
    };
    const facilities = createDefaultPlayerFacilities(1);
    facilities.main_track = {
      type: "main_track",
      level: "basic",
      maintenanceCost: 10,
      upgradeCost: 5_000,
      builtDay: 1,
    };

    const intents = generateNpcFacilityUpgradeIntents(
      stable,
      stableAI,
      10,
      { [stable.id]: facilities },
      1,
    );

    expect(intents).toEqual([]);
  });

  it("uses the learned facility scoring model instead of a fixed first-match order", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500_000, personality: "aggressive" });
    const facilityAI = createFacilityAIState(stable);
    facilityAI.roiTracking = {
      "main_track:basic": {
        facilityType: "main_track",
        level: "basic",
        totalInvestment: 5_000,
        totalBenefit: 100,
        daysOwned: 31,
        lastUpdateDay: 31,
      },
      "barn:basic": {
        facilityType: "barn",
        level: "basic",
        totalInvestment: 5_000,
        totalBenefit: 50_000,
        daysOwned: 31,
        lastUpdateDay: 31,
      },
    };
    const stableAI = {
      ...createStableAIState(stable, 1),
      facilityAI,
      budgetAllocation: {
        total: 100_000,
        training: 10_000,
        facilities: 50_000,
        auctions: 10_000,
        claiming: 10_000,
        breeding: 20_000,
      },
    };
    const facilities: PlayerFacilities = {
      ...createDefaultPlayerFacilities(1),
      main_track: {
        type: "main_track",
        level: "basic",
        maintenanceCost: 10,
        upgradeCost: 5_000,
        builtDay: 1,
      },
      barn: {
        type: "barn",
        level: "basic",
        maintenanceCost: 10,
        upgradeCost: 5_000,
        builtDay: 1,
      },
    };

    const intents = generateNpcFacilityUpgradeIntents(
      stable,
      stableAI,
      10,
      { [stable.id]: facilities },
      1,
    );

    expect(intents).toHaveLength(1);
    expect(intents[0].facilityId).toBe("barn");
  });
});
