import { describe, it, expect } from "vitest";
import { buildSolicitedInvestor } from "@/domains/market/simulation/syndicateInvestorActions";
import { asOwnerKey, asPlayerOwnerId } from "@/shared/types/branded";

describe("buildSolicitedInvestor", () => {
  it("generates deterministic investor state given inputs", () => {
    const input = {
      syndicateId: "syn-123",
      sharesOffered: 5,
      sharePrice: 1000,
      stallionName: "Test Stallion",
      currentDay: 10,
      playerShares: 40,
      shareHolders: {
        [asPlayerOwnerId("player")]: 40,
        [asOwnerKey("other-guy")]: 5,
      } as Record<string, number>,
    };

    const result = buildSolicitedInvestor(input);

    expect(result.investor).toMatchObject({
      syndicateId: "syn-123",
      shares: 5,
      investedCash: 5000,
      joinedDay: 10,
      satisfaction: 70,
    });

    expect(result.investor.id).toMatch(/^inv-[a-zA-Z0-9-]{8}$/);
    expect(result.investor.stableId).toBe(result.investor.id);

    expect(result.price).toBe(5000);

    expect(result.nextShareHolders[asPlayerOwnerId("player")]).toBe(35);
    expect(result.nextShareHolders[asOwnerKey(result.investor.id)]).toBe(5);
    expect(result.nextShareHolders[asOwnerKey("other-guy")]).toBe(5);

    expect(result.transaction).toMatchObject({
      syndicateId: "syn-123",
      buyerStableId: result.investor.id,
      sellerStableId: "player",
      shares: 5,
      pricePerShare: 1000,
      day: 10,
    });

    expect(result.activityFeedItem).toMatchObject({
      syndicateId: "syn-123",
      syndicateName: "Test Stallion",
      type: "investor_solicit",
      buyerStableId: result.investor.id,
      sellerStableId: "player",
      shares: 5,
      pricePerShare: 1000,
      cashMoved: 5000,
      day: 10,
    });

    expect(result.logText).toContain("invested $5,000 for 5 shares of Test Stallion.");
  });
});
