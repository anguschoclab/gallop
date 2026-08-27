/**
 * syndication.test.ts - Syndication system tests
 *
 * Tests for syndication intent validation, impact resolution, and handler application.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { GameState } from "@/game/types";
import type {
  SyndicateCreationIntent,
  SharePurchaseIntent,
  ShareSaleIntent,
} from "@/core/resolver/intents";
import { SyndicationValidator } from "@/core/resolver/validators/SyndicationValidator";
import { resolveSyndicationIntent } from "@/core/resolver/resolvers/syndicateResolver";
import { SyndicationHandler } from "@/core/resolver/handlers/SyndicationHandler";
import { generateUUID } from "@/core/uuid";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import type { Horse } from "@/game/types";
import { makePlayerOwned } from "@/core/horse/ownership";

describe("SyndicationValidator", () => {
  let validator: SyndicationValidator;
  let mockState: GameState;

  beforeEach(() => {
    validator = new SyndicationValidator();
    mockState = {
      horses: h2r([
        {
          id: "stallion1",
          name: "Test Stallion",
          gender: "horse",
          age: 5,
          energy: 100,
          form: 0,
          potential: 80,
          raceHistory: [
            { raceId: "race1", raceName: "Kentucky Derby", position: 1, day: 100, grade: "G1" },
          ],
          stud: { atStud: true, standingFee: 50000, bookSize: 50, seasonBookings: 0 },
          ownership: makePlayerOwned(),
          fame: 50,
          lifetimeEarnings: 1000000,
          careerStarts: 10,
          careerWins: 5,
          distanceAptitude: 0.5,
          surfaceAptitude: { Turf: 0.5, Dirt: 0.5, Synthetic: 0.5 },
          climbingAptitude: 0.5,
          corneringAptitude: 0.5,
          injuryProneness: 0.5,
          height: 16,
          weight: 1000,
          heartScore: 100,
          fiberBias: "balanced",
          strideType: "balanced",
          trackPreference: "balanced",
          mudAptitude: 0.5,
          trainability: 0.5,
          peakAge: 5,
          recoveryRate: 0.5,
          fertility: 0.5,
          foalingEase: 0.5,
          markings: [],
          bleederRisk: 0.5,
          roarerRisk: 0.5,
        },
      ] as unknown as Horse[]),
      cash: 1000000,
      syndicates: {},
    } as any;
  });

  describe("syndicate_creation", () => {
    it("should validate a valid syndicate creation intent", () => {
      const intent: SyndicateCreationIntent = {
        id: generateUUID(),
        entityId: "stallion1",
        source: "player",
        day: 1,
        priority: 100,
        type: "syndicate_creation",
        stallionId: "stallion1",
        totalShares: 40,
        sharePrice: 10000,
        initialShareholders: { player: 20 },
      };

      const result = validator.validate(intent, mockState);
      expect(result.valid).toBe(true);
    });

    it("should reject if stallion is not found", () => {
      const intent: SyndicateCreationIntent = {
        id: generateUUID(),
        entityId: "nonexistent",
        source: "player",
        day: 1,
        priority: 100,
        type: "syndicate_creation",
        stallionId: "nonexistent",
        totalShares: 40,
        sharePrice: 10000,
        initialShareholders: { player: 20 },
      };

      const result = validator.validate(intent, mockState);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Stallion not found");
    });

    it("should reject if stallion is not a G1 winner", () => {
      const nonG1Stallion = {
        ...mockState.horses["stallion1"],
        id: "stallion2",
        raceHistory: [],
      };
      mockState.horses = { ...mockState.horses, stallion2: nonG1Stallion };

      const intent: SyndicateCreationIntent = {
        id: generateUUID(),
        entityId: "stallion2",
        source: "player",
        day: 1,
        priority: 100,
        type: "syndicate_creation",
        stallionId: "stallion2",
        totalShares: 40,
        sharePrice: 10000,
        initialShareholders: { player: 20 },
      };

      const result = validator.validate(intent, mockState);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Stallion must be a G1 winner");
    });

    it("should reject if total shares is out of range", () => {
      const intent: SyndicateCreationIntent = {
        id: generateUUID(),
        entityId: "stallion1",
        source: "player",
        day: 1,
        priority: 100,
        type: "syndicate_creation",
        stallionId: "stallion1",
        totalShares: 5,
        sharePrice: 10000,
        initialShareholders: { player: 20 },
      };

      const result = validator.validate(intent, mockState);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Total shares must be between 10 and 100");
    });

    it("should reject if share price is too low", () => {
      const intent: SyndicateCreationIntent = {
        id: generateUUID(),
        entityId: "stallion1",
        source: "player",
        day: 1,
        priority: 100,
        type: "syndicate_creation",
        stallionId: "stallion1",
        totalShares: 40,
        sharePrice: 500,
        initialShareholders: { player: 20 },
      };

      const result = validator.validate(intent, mockState);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Share price must be at least $1,000");
    });
  });

  describe("share_purchase", () => {
    beforeEach(() => {
      mockState.syndicates = {
        syndicate_stallion1: {
          id: "syndicate_stallion1",
          stallionId: "stallion1",
          stallionName: "Test Stallion",
          totalShares: 40,
          shareHolders: { player: 20 },
          sharePrice: 10000,
          studFee: 50000,
          isPublic: true,
          lifetimeEarnings: 0,
        },
      } as any;
    });

    it("should validate a valid share purchase intent", () => {
      const intent: SharePurchaseIntent = {
        id: generateUUID(),
        entityId: "syndicate_stallion1",
        source: "player",
        day: 1,
        priority: 100,
        type: "share_purchase",
        syndicateId: "syndicate_stallion1",
        shares: 5,
        pricePerShare: 10000,
      };

      const result = validator.validate(intent, mockState);
      expect(result.valid).toBe(true);
    });

    it("should reject if syndicate not found", () => {
      const intent: SharePurchaseIntent = {
        id: generateUUID(),
        entityId: "nonexistent",
        source: "player",
        day: 1,
        priority: 100,
        type: "share_purchase",
        syndicateId: "nonexistent",
        shares: 5,
        pricePerShare: 10000,
      };

      const result = validator.validate(intent, mockState);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Syndicate not found");
    });

    it("should reject if insufficient funds", () => {
      mockState.cash = 10000;

      const intent: SharePurchaseIntent = {
        id: generateUUID(),
        entityId: "syndicate_stallion1",
        source: "player",
        day: 1,
        priority: 100,
        type: "share_purchase",
        syndicateId: "syndicate_stallion1",
        shares: 5,
        pricePerShare: 10000,
      };

      const result = validator.validate(intent, mockState);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Insufficient funds to purchase shares");
    });
  });

  describe("share_sale", () => {
    beforeEach(() => {
      mockState.syndicates = {
        syndicate_stallion1: {
          id: "syndicate_stallion1",
          stallionId: "stallion1",
          stallionName: "Test Stallion",
          totalShares: 40,
          shareHolders: { player: 20 },
          sharePrice: 10000,
          studFee: 50000,
          isPublic: true,
          lifetimeEarnings: 0,
        },
      } as any;
    });

    it("should validate a valid share sale intent", () => {
      const intent: ShareSaleIntent = {
        id: generateUUID(),
        entityId: "syndicate_stallion1",
        source: "player",
        day: 1,
        priority: 100,
        type: "share_sale",
        syndicateId: "syndicate_stallion1",
        shares: 5,
        pricePerShare: 10000,
      };

      const result = validator.validate(intent, mockState);
      expect(result.valid).toBe(true);
    });

    it("should reject if seller doesn't own enough shares", () => {
      const intent: ShareSaleIntent = {
        id: generateUUID(),
        entityId: "syndicate_stallion1",
        source: "player",
        day: 1,
        priority: 100,
        type: "share_sale",
        syndicateId: "syndicate_stallion1",
        shares: 25,
        pricePerShare: 10000,
      };

      const result = validator.validate(intent, mockState);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Insufficient shares to sell");
    });
  });
});

describe("resolveSyndicationIntent", () => {
  let mockState: GameState;

  beforeEach(() => {
    mockState = {
      horses: h2r([
        {
          id: "stallion1",
          name: "Test Stallion",
          gender: "horse",
          age: 5,
          energy: 100,
          form: 0,
          potential: 80,
          raceHistory: [
            { raceId: "race1", raceName: "Kentucky Derby", position: 1, day: 100, grade: "G1" },
          ],
          stud: { atStud: true, standingFee: 50000, bookSize: 50, seasonBookings: 0 },
          ownership: makePlayerOwned(),
          fame: 50,
          lifetimeEarnings: 1000000,
          careerStarts: 10,
          careerWins: 5,
          distanceAptitude: 0.5,
          surfaceAptitude: { Turf: 0.5, Dirt: 0.5, Synthetic: 0.5 },
          climbingAptitude: 0.5,
          corneringAptitude: 0.5,
          injuryProneness: 0.5,
          height: 16,
          weight: 1000,
          heartScore: 100,
          fiberBias: "balanced",
          strideType: "balanced",
          trackPreference: "balanced",
          mudAptitude: 0.5,
          trainability: 0.5,
          peakAge: 5,
          recoveryRate: 0.5,
          fertility: 0.5,
          foalingEase: 0.5,
          markings: [],
          bleederRisk: 0.5,
          roarerRisk: 0.5,
        },
      ] as unknown as Horse[]),
      cash: 1000000,
      syndicates: {
        syndicate_stallion1: {
          id: "syndicate_stallion1",
          stallionId: "stallion1",
          stallionName: "Test Stallion",
          totalShares: 40,
          shareHolders: { player: 20 },
          sharePrice: 10000,
          studFee: 50000,
          isPublic: true,
          lifetimeEarnings: 0,
        },
      } as any,
    } as any;
  });

  it("should resolve syndicate_creation intent to impact", () => {
    const intent: SyndicateCreationIntent = {
      id: generateUUID(),
      entityId: "stallion1",
      source: "player",
      day: 1,
      priority: 100,
      type: "syndicate_creation",
      stallionId: "stallion1",
      totalShares: 40,
      sharePrice: 10000,
      initialShareholders: { player: 20 },
    };

    const impacts = resolveSyndicationIntent(intent, mockState, 1);
    expect(impacts).toHaveLength(1);
    expect(impacts[0].type).toBe("syndicate_creation");
    expect((impacts[0] as any).stallionId).toBe("stallion1");
    expect((impacts[0] as any).stallionName).toBe("Test Stallion");
  });

  it("should resolve share_purchase intent to impact", () => {
    const intent: SharePurchaseIntent = {
      id: generateUUID(),
      entityId: "syndicate_stallion1",
      source: "player",
      day: 1,
      priority: 100,
      type: "share_purchase",
      syndicateId: "syndicate_stallion1",
      shares: 5,
      pricePerShare: 10000,
    };

    const impacts = resolveSyndicationIntent(intent, mockState, 1);
    expect(impacts).toHaveLength(1);
    expect(impacts[0].type).toBe("share_transaction");
    expect((impacts[0] as any).shares).toBe(5);
    expect((impacts[0] as any).stableId).toBe("player");
  });

  it("should resolve share_sale intent to impact with negative shares", () => {
    const intent: ShareSaleIntent = {
      id: generateUUID(),
      entityId: "syndicate_stallion1",
      source: "player",
      day: 1,
      priority: 100,
      type: "share_sale",
      syndicateId: "syndicate_stallion1",
      shares: 5,
      pricePerShare: 10000,
    };

    const impacts = resolveSyndicationIntent(intent, mockState, 1);
    expect(impacts).toHaveLength(1);
    expect(impacts[0].type).toBe("share_transaction");
    expect((impacts[0] as any).shares).toBe(-5); // Negative for sales
  });
});

describe("SyndicationHandler", () => {
  let handler: SyndicationHandler;
  let mockState: GameState;

  beforeEach(() => {
    handler = new SyndicationHandler();
    mockState = {
      horses: h2r([
        {
          id: "stallion1",
          name: "Test Stallion",
          gender: "horse",
          age: 5,
          energy: 100,
          form: 0,
          potential: 80,
          raceHistory: [
            { raceId: "race1", raceName: "Kentucky Derby", position: 1, day: 100, grade: "G1" },
          ],
          stud: { atStud: true, standingFee: 50000, bookSize: 50, seasonBookings: 0 },
          ownership: makePlayerOwned(),
          fame: 50,
          lifetimeEarnings: 1000000,
          careerStarts: 10,
          careerWins: 5,
          distanceAptitude: 0.5,
          surfaceAptitude: { Turf: 0.5, Dirt: 0.5, Synthetic: 0.5 },
          climbingAptitude: 0.5,
          corneringAptitude: 0.5,
          injuryProneness: 0.5,
          height: 16,
          weight: 1000,
          heartScore: 100,
          fiberBias: "balanced",
          strideType: "balanced",
          trackPreference: "balanced",
          mudAptitude: 0.5,
          trainability: 0.5,
          peakAge: 5,
          recoveryRate: 0.5,
          fertility: 0.5,
          foalingEase: 0.5,
          markings: [],
          bleederRisk: 0.5,
          roarerRisk: 0.5,
        },
      ] as unknown as Horse[]),
      cash: 1000000,
      syndicates: {},
      shareTransactions: [],
    } as any;
  });

  it("should handle syndicate_creation impact", () => {
    const impact = {
      id: generateUUID(),
      intentId: generateUUID(),
      day: 1,
      phase: "management_resolution",
      logLevel: "always" as const,
      type: "syndicate_creation",
      syndicateId: "syndicate_stallion1",
      stallionId: "stallion1",
      stallionName: "Test Stallion",
      totalShares: 40,
      sharePrice: 10000,
      initialShareholders: { player: 20 },
      reason: "Syndicate created",
    };

    handler.handle(mockState as any, impact as any);
    expect(mockState.syndicates?.["syndicate_stallion1"]).toBeDefined();
    expect(mockState.syndicates?.["syndicate_stallion1"].stallionName).toBe("Test Stallion");
    expect(mockState.syndicates?.["syndicate_stallion1"].shareHolders.player).toBe(20);
  });

  it("should handle share_transaction impact for purchase", () => {
    mockState.syndicates = {
      syndicate_stallion1: {
        id: "syndicate_stallion1",
        stallionId: "stallion1",
        stallionName: "Test Stallion",
        totalShares: 40,
        shareHolders: { player: 20 },
        sharePrice: 10000,
        studFee: 50000,
        isPublic: true,
        lifetimeEarnings: 0,
      },
    } as any;

    const impact = {
      id: generateUUID(),
      intentId: generateUUID(),
      day: 1,
      phase: "management_resolution",
      logLevel: "conditional" as const,
      type: "share_transaction",
      syndicateId: "syndicate_stallion1",
      stableId: "player",
      shares: 5,
      pricePerShare: 10000,
      reason: "Purchased shares",
    };

    handler.handle(mockState as any, impact as any);
    expect(mockState.syndicates?.["syndicate_stallion1"].shareHolders.player).toBe(25);
    expect(mockState.shareTransactions).toHaveLength(1);
  });

  it("should handle share_transaction impact for sale", () => {
    mockState.syndicates = {
      syndicate_stallion1: {
        id: "syndicate_stallion1",
        stallionId: "stallion1",
        stallionName: "Test Stallion",
        totalShares: 40,
        shareHolders: { player: 20 },
        sharePrice: 10000,
        studFee: 50000,
        isPublic: true,
        lifetimeEarnings: 0,
      },
    } as any;

    const impact = {
      id: generateUUID(),
      intentId: generateUUID(),
      day: 1,
      phase: "management_resolution",
      logLevel: "conditional" as const,
      type: "share_transaction",
      syndicateId: "syndicate_stallion1",
      stableId: "player",
      shares: -5,
      pricePerShare: 10000,
      reason: "Sold shares",
    };

    handler.handle(mockState as any, impact as any);
    expect(mockState.syndicates?.["syndicate_stallion1"].shareHolders.player).toBe(15);
  });
});
