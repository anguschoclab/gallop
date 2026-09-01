import { describe, it, expect } from "vitest";
import { findPendingOfferForStable } from "@/core/stable/pendingOfferForStable";
import type { PrivateSaleOffer } from "@/game/types";

const mkOffer = (overrides: Partial<PrivateSaleOffer> = {}): PrivateSaleOffer => ({
  id: "o1",
  horseId: "h1" as never,
  fromStableId: "player" as never,
  toStableId: "s1" as never,
  amount: 50000,
  status: "pending",
  createdDay: 1,
  expiresDay: 10,
  ...overrides,
});

describe("findPendingOfferForStable", () => {
  it("returns the first pending offer to the given stable", () => {
    const offers: PrivateSaleOffer[] = [mkOffer({ id: "o1", toStableId: "s1", status: "pending" })];
    expect(findPendingOfferForStable(offers, "s1")?.id).toBe("o1");
  });

  it("ignores non-pending offers", () => {
    const offers: PrivateSaleOffer[] = [
      mkOffer({ id: "o1", toStableId: "s1", status: "accepted" }),
      mkOffer({ id: "o2", toStableId: "s1", status: "countered" }),
      mkOffer({ id: "o3", toStableId: "s1", status: "declined" }),
      mkOffer({ id: "o4", toStableId: "s1", status: "expired" }),
    ];
    expect(findPendingOfferForStable(offers, "s1")).toBeUndefined();
  });

  it("ignores offers to other stables", () => {
    const offers: PrivateSaleOffer[] = [mkOffer({ id: "o1", toStableId: "s2", status: "pending" })];
    expect(findPendingOfferForStable(offers, "s1")).toBeUndefined();
  });

  it("returns undefined when no offers match", () => {
    expect(findPendingOfferForStable([], "s1")).toBeUndefined();
  });

  it("returns the first matching pending offer when multiple exist", () => {
    const offers: PrivateSaleOffer[] = [
      mkOffer({ id: "o1", toStableId: "s1", status: "pending", amount: 10000 }),
      mkOffer({ id: "o2", toStableId: "s1", status: "pending", amount: 20000 }),
    ];
    expect(findPendingOfferForStable(offers, "s1")?.id).toBe("o1");
  });
});
