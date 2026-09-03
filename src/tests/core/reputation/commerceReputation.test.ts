import { describe, it, expect } from "vitest";
import {
  CHURN_WINDOW_DAYS,
  daysSincePlayerAcquired,
  marketTradeReputation,
  priceWeight,
  syndicationStakeReputation,
} from "@/core/reputation/commerceReputation";
import { applyReputationEvents, emptyReputation } from "@/game/store/helpers/reputation";

const base = {
  horseName: "Silver Comet",
  horseId: "h1",
  counterpartyName: "Crownhill",
  day: 100,
};

describe("priceWeight", () => {
  it("is 0 for non-positive amounts and capped at 1", () => {
    expect(priceWeight(0)).toBe(0);
    expect(priceWeight(-5)).toBe(0);
    expect(priceWeight(10_000_000)).toBe(1);
  });

  it("grows with price", () => {
    expect(priceWeight(200_000)).toBeGreaterThan(priceWeight(20_000));
  });
});

describe("daysSincePlayerAcquired", () => {
  const trades = [
    { horseId: "h1", buyerId: "player", sellerId: "npc-1", day: 80 },
    { horseId: "h1", buyerId: "npc-2", sellerId: "player", day: 90 },
    { horseId: "h1", buyerId: "player", sellerId: "npc-2", day: 95 },
  ];

  it("uses the latest player purchase", () => {
    expect(daysSincePlayerAcquired(trades, "h1", 100)).toBe(5);
  });

  it("is undefined for a horse the player never bought", () => {
    expect(daysSincePlayerAcquired(trades, "h2", 100)).toBeUndefined();
  });
});

describe("marketTradeReputation", () => {
  it("rewards buying quality stock", () => {
    const ev = marketTradeReputation({
      ...base,
      role: "buyer",
      price: 250_000,
      fairValue: 250_000,
    });
    expect(ev?.source).toBe("market_purchase");
    expect(ev?.amount).toBeGreaterThan(0);
  });

  it("rewards selling at or above fair value", () => {
    const ev = marketTradeReputation({
      ...base,
      role: "seller",
      price: 300_000,
      fairValue: 250_000,
      daysOwned: 200,
    });
    expect(ev?.source).toBe("market_sale");
    expect(ev?.amount).toBeGreaterThan(0);
  });

  it("penalises dumping a horse well below value", () => {
    const ev = marketTradeReputation({
      ...base,
      role: "seller",
      price: 100_000,
      fairValue: 400_000,
      daysOwned: 200,
    });
    expect(ev?.source).toBe("market_sale");
    expect(ev!.amount).toBeLessThan(0);
  });

  it("penalises flipping a recently bought horse", () => {
    const ev = marketTradeReputation({
      ...base,
      role: "seller",
      price: 300_000,
      fairValue: 200_000,
      daysOwned: CHURN_WINDOW_DAYS - 1,
    });
    expect(ev?.source).toBe("trade_churn");
    expect(ev!.amount).toBeLessThan(0);
  });

  it("ignores worthless trades", () => {
    expect(marketTradeReputation({ ...base, role: "buyer", price: 0, fairValue: 0 })).toBeNull();
  });
});

describe("syndicationStakeReputation", () => {
  it("scales with stake size", () => {
    const small = syndicationStakeReputation({
      direction: "buy",
      shares: 1,
      totalShares: 40,
      pricePerShare: 10_000,
      syndicateName: "Storm Cat",
      day: 10,
    });
    const large = syndicationStakeReputation({
      direction: "buy",
      shares: 20,
      totalShares: 40,
      pricePerShare: 10_000,
      syndicateName: "Storm Cat",
      day: 10,
    });
    expect(large!.amount).toBeGreaterThan(small!.amount);
    expect(large?.source).toBe("syndication_stake");
  });

  it("costs reputation to sell a stake down", () => {
    const ev = syndicationStakeReputation({
      direction: "sell",
      shares: 20,
      totalShares: 40,
      pricePerShare: 10_000,
      syndicateName: "Storm Cat",
      day: 10,
    });
    expect(ev?.source).toBe("syndication_exit");
    expect(ev!.amount).toBeLessThan(0);
  });

  it("ignores empty stakes", () => {
    expect(
      syndicationStakeReputation({
        direction: "buy",
        shares: 0,
        totalShares: 40,
        pricePerShare: 10_000,
        syndicateName: "Storm Cat",
        day: 10,
      }),
    ).toBeNull();
  });
});

describe("applyReputationEvents", () => {
  it("clamps the score and keeps the tier in sync", () => {
    const ev = marketTradeReputation({
      ...base,
      role: "buyer",
      price: 250_000,
      fairValue: 250_000,
    })!;
    const rep = applyReputationEvents({ ...emptyReputation(), score: 148 }, [ev]);
    expect(rep.score).toBe(148 + ev.amount);
    expect(rep.tier).toBe("local");
    expect(rep.events).toHaveLength(1);

    const floored = applyReputationEvents(emptyReputation(), [{ ...ev, amount: -50 }]);
    expect(floored.score).toBe(0);
  });

  it("returns the record untouched when nothing applies", () => {
    const start = emptyReputation();
    expect(applyReputationEvents(start, [null, undefined])).toBe(start);
  });
});
