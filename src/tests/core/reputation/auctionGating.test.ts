import { describe, it, expect } from "vitest";
import { canAccessSale } from "@/core/reputation/reputationGating";
import { getReputationTier } from "@/core/reputation/reputationTypes";
import type { AuctionSaleKind } from "@/core/market/types";

describe("auction gating integration", () => {
  function checkSaleAccess(saleKind: AuctionSaleKind, reputationScore: number) {
    const tier = getReputationTier(reputationScore);
    return canAccessSale(saleKind, tier);
  }

  it("blocks 2yo_training consignment when reputation < 300", () => {
    const result = checkSaleAccess("2yo_training", 150);
    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe("regional");
  });

  it("allows 2yo_training consignment when reputation >= 300", () => {
    const result = checkSaleAccess("2yo_training", 300);
    expect(result.allowed).toBe(true);
  });

  it("blocks broodmare consignment when reputation < 150", () => {
    const result = checkSaleAccess("broodmare", 0);
    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe("local");
  });

  it("allows broodmare consignment when reputation >= 150", () => {
    const result = checkSaleAccess("broodmare", 150);
    expect(result.allowed).toBe(true);
  });

  it("allows all open sale kinds regardless of reputation", () => {
    const openKinds: AuctionSaleKind[] = [
      "weanling",
      "yearling",
      "weanling_south",
      "yearling_south",
      "mixed",
      "racing_age",
      "liquidation",
    ];
    for (const kind of openKinds) {
      expect(checkSaleAccess(kind, 0).allowed).toBe(true);
    }
  });
});
