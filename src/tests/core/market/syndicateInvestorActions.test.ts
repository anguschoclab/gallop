import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildSolicitedInvestor,
  type SolicitInvestorInput,
} from "@/domains/market/simulation/syndicateInvestorActions";
import { asPlayerOwnerId, asOwnerKey } from "@/shared/types/branded";

// Mock generateUUID to return predictable values for assertions
vi.mock("@/shared/uuid/uuid", () => {
  let counter = 0;
  return {
    generateUUID: vi.fn(() => `00000000-0000-0000-0000-${String(counter++).padStart(12, "0")}`),
  };
});

describe("syndicateInvestorActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildSolicitedInvestor", () => {
    it("creates an investor and transactions deterministically based on input", () => {
      const input: SolicitInvestorInput = {
        syndicateId: "syn-1",
        sharesOffered: 10,
        sharePrice: 5000,
        stallionName: "Test Stallion",
        currentDay: 100,
        playerShares: 100,
        shareHolders: { [asPlayerOwnerId("player")]: 100 },
      };

      const result = buildSolicitedInvestor(input);

      // Verify Investor properties
      expect(result.investor.id.startsWith("inv-")).toBe(true);
      expect(result.investor.syndicateId).toBe("syn-1");
      expect(result.investor.shares).toBe(10);
      expect(result.investor.investedCash).toBe(50000);
      expect(result.investor.joinedDay).toBe(100);
      expect(result.investor.satisfaction).toBe(70); // hardcoded default

      // Verify name and personality are generated
      expect(typeof result.investor.name).toBe("string");
      expect(["conservative", "aggressive", "speculator"]).toContain(result.investor.personality);

      // Verify expectations were generated based on personality
      expect(result.investor.expectations.length).toBe(1);

      // Verify share holders state transition
      expect(result.nextShareHolders[asPlayerOwnerId("player")]).toBe(90);
      expect(result.nextShareHolders[asOwnerKey(result.investor.id)]).toBe(10);

      // Verify the generated share transaction
      expect(result.transaction.syndicateId).toBe("syn-1");
      expect(result.transaction.buyerStableId).toBe(result.investor.id);
      expect(result.transaction.sellerStableId).toBe("player");
      expect(result.transaction.shares).toBe(10);
      expect(result.transaction.pricePerShare).toBe(5000);
      expect(result.transaction.day).toBe(100);

      // Verify activity feed entry
      expect(result.activityFeedItem.type).toBe("investor_solicit");
      expect(result.activityFeedItem.cashMoved).toBe(50000);
      expect(result.activityFeedItem.syndicateName).toBe("Test Stallion");
    });

    it("preserves identical generated values for identical inputs due to PRNG seeding", () => {
      const input: SolicitInvestorInput = {
        syndicateId: "syn-2",
        sharesOffered: 15,
        sharePrice: 2000,
        stallionName: "Test Stallion 2",
        currentDay: 150,
        playerShares: 100,
        shareHolders: { [asPlayerOwnerId("player")]: 100 },
      };

      const result1 = buildSolicitedInvestor(input);
      const result2 = buildSolicitedInvestor(input);

      expect(result1.investor.name).toBe(result2.investor.name);
      expect(result1.investor.personality).toBe(result2.investor.personality);
    });

    it("correctly handles updating existing shareholdings", () => {
      const investorKey = asOwnerKey("inv-123");
      const input: SolicitInvestorInput = {
        syndicateId: "syn-3",
        sharesOffered: 5,
        sharePrice: 1000,
        stallionName: "Test Stallion 3",
        currentDay: 200,
        playerShares: 50,
        shareHolders: {
          [asPlayerOwnerId("player")]: 50,
          [investorKey]: 10, // Pre-existing shareholder
        },
      };

      const result = buildSolicitedInvestor(input);

      // Even though buildSolicitedInvestor generates a new investor object every time,
      // the shareholding dictionary should reflect the new investor ID accumulating the shares
      const newInvestorKey = asOwnerKey(result.investor.id);
      expect(result.nextShareHolders[newInvestorKey]).toBe(5);
      expect(result.nextShareHolders[asPlayerOwnerId("player")]).toBe(45);

      // Existing investor holding should be preserved
      expect(result.nextShareHolders[investorKey]).toBe(10);
    });
  });
});
