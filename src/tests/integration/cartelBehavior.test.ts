/**
 * Integration tests for cartel behavior
 * Verifies cartel members don't bid against each other in auctions,
 * cartel coordination directives are correctly generated, and
 * dynamic pricing respects cartel agreements.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateCartelOpportunity,
  coordinateCartelAction,
  calculateDynamicStudFee,
  calculateAuctionReservePrice,
} from "@/core/ai/economyAICartel";
import { createEconomicState } from "@/core/ai/economyAIState";
import { evaluateCartelFormation, formCartel } from "@/core/ai/diplomacyAI";
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";
import type { EconomicTrend } from "@/core/ai/strategicCoordinator";

function createMockAIState(
  stableId: string,
  relationships?: Record<
    string,
    { trust: number; allianceType: string | null; history: unknown[] }
  >,
): StableAIState {
  return {
    stableId,
    personalityState: { personality: "trader" } as any,
    learningState: { outcomes: [], adaptations: {} } as any,
    lastUpdateDay: 1,
    friction: 0,
    winsAgainstPlayer: 0,
    regionalPrestige: {},
    npcRelationships: relationships as any,
  } as any;
}

function createMockManagerWithCartel(): NpcAIManager {
  return {
    stableStates: {
      s1: createMockAIState("s1", {
        s2: { trust: 75, allianceType: null, history: [] },
        s3: { trust: 70, allianceType: null, history: [] },
      }),
      s2: createMockAIState("s2", {
        s1: { trust: 75, allianceType: null, history: [] },
      }),
      s3: createMockAIState("s3", {
        s1: { trust: 70, allianceType: null, history: [] },
      }),
    },
    globalDay: 100,
    regionalKings: {},
  };
}

describe("Cartel Behavior: formation", () => {
  it("evaluateCartelOpportunity identifies viable cartel from high-trust stables", () => {
    const manager = createMockManagerWithCartel();
    const result = evaluateCartelOpportunity(manager, "s1", ["s2", "s3"]);
    expect(result).not.toBeNull();
    expect(result!.memberIds).toContain("s1");
    expect(result!.memberIds.length).toBeGreaterThanOrEqual(2);
  });

  it("evaluateCartelOpportunity returns null when trust is too low", () => {
    const manager: NpcAIManager = {
      stableStates: {
        s1: createMockAIState("s1", {
          s2: { trust: 30, allianceType: null, history: [] },
        }),
        s2: createMockAIState("s2", {}),
      },
      globalDay: 100,
      regionalKings: {},
    };
    const result = evaluateCartelOpportunity(manager, "s1", ["s2"]);
    expect(result).toBeNull();
  });

  it("formCartel creates a cartel with all members", () => {
    const manager = createMockManagerWithCartel();
    const result = formCartel(manager, ["s1", "s2", "s3"], "auction");
    expect(result.activeCartels).toBeDefined();
    expect(result.activeCartels!.length).toBeGreaterThan(0);
    expect(result.activeCartels![0].memberStableIds).toEqual(["s1", "s2", "s3"]);
  });
});

describe("Cartel Behavior: auction coordination", () => {
  it("coordinateCartelAction generates avoid_bidding_war directives for all members", () => {
    const members = ["s1", "s2", "s3"];
    const directives = coordinateCartelAction(members, "avoid_bidding_war", 100);

    for (const memberId of members) {
      expect(directives[memberId]).toBeDefined();
      expect(directives[memberId].action).toBe("avoid_bidding_war");
      expect(directives[memberId].day).toBe(100);
    }
  });

  it("coordinateCartelAction assigns rotation indices for rotate_claims", () => {
    const members = ["s1", "s2", "s3"];
    const directives = coordinateCartelAction(members, "rotate_claims", 100);

    expect(directives["s1"].rotationIndex).toBe(0);
    expect(directives["s2"].rotationIndex).toBe(1);
    expect(directives["s3"].rotationIndex).toBe(2);
  });
});

describe("Cartel Behavior: dynamic pricing respects cartel", () => {
  it("calculateDynamicStudFee applies cartel premium when cartelFixed", () => {
    const trend: EconomicTrend = {
      studFeeTrend: -0.1,
      yearlingPriceIndex: 80,
      claimingMarketActivity: 0,
    };
    const cartelFee = calculateDynamicStudFee(trend, 50000, 0.3, true);
    const nonCartelFee = calculateDynamicStudFee(trend, 50000, 0.3, false);

    expect(cartelFee).toBe(60000); // 50000 * 1.2
    expect(cartelFee).toBeGreaterThan(nonCartelFee);
  });

  it("calculateAuctionReservePrice adjusts with market trends", () => {
    const bullTrend: EconomicTrend = {
      studFeeTrend: 0.1,
      yearlingPriceIndex: 130,
      claimingMarketActivity: 0,
    };
    const bearTrend: EconomicTrend = {
      studFeeTrend: -0.1,
      yearlingPriceIndex: 70,
      claimingMarketActivity: 0,
    };

    const bullReserve = calculateAuctionReservePrice(bullTrend, 50000);
    const bearReserve = calculateAuctionReservePrice(bearTrend, 50000);

    expect(bullReserve).toBeGreaterThan(bearReserve);
  });
});
