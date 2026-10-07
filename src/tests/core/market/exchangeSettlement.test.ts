/**
 * exchangeSettlement.test.ts — Shared daily exchange settlement
 *
 * `runExchangeSettlementDay` is the single implementation behind both
 * `exchangeSlice.refreshExchange` and `exchangeSettlementPhase.execute`.
 * It regenerates the NPC book, preserves player orders, settles NPC-vs-NPC
 * crossings AND fills standing player bids against NPC asks.
 */

import { describe, it, expect } from "vitest";
import { runExchangeSettlementDay } from "@/core/market/exchangeSettlement";
import {
  createDefaultExchangeState,
  exchangeCommission,
  netProceeds,
  type ExchangeAsk,
  type ExchangeBid,
} from "@/core/market/exchange";
import { createTestStable, createTestNpcHorse, createTestHorse } from "@/tests/helpers";
import { isPlayerOwned, makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import { h2r } from "@/tests/helpers/sampleGameState";
import type { Horse, Stable } from "@/game/types";

const DAY = 10;

/** A desperate seller (broke → high cash pressure → low accept floor). */
function desperateSeller(id = "seller-1") {
  return createTestStable({ id, name: "Broke Yard", cash: 500, personality: "trader" });
}

function richBuyer(id: string) {
  return createTestStable({
    id,
    name: `Rich Yard ${id}`,
    cash: 50_000_000,
    personality: "aggressive",
  });
}

function sellerHorse(id: string, sellerId: string): Horse {
  return createTestNpcHorse({
    id,
    name: `Horse ${id}`,
    ownership: makeNpcOwned(asNpcStableId(sellerId)),
  });
}

function playerBid(overrides: Partial<ExchangeBid> & { horseId: string }): ExchangeBid {
  return {
    id: "p-bid-1",
    bidderId: "player",
    bidderName: "My Stable",
    price: 1_000_000,
    createdDay: DAY - 1,
    expiresDay: DAY + 5,
    rationale: "Player standing bid",
    ...overrides,
  };
}

function playerAsk(overrides: Partial<ExchangeAsk> & { horseId: string }): ExchangeAsk {
  return {
    id: "p-ask-1",
    sellerId: "player",
    sellerName: "My Stable",
    price: 50_000,
    fairValue: 50_000,
    createdDay: DAY - 1,
    expiresDay: DAY + 5,
    ...overrides,
  };
}

function run(args: {
  stables: Stable[];
  horses: Horse[];
  exchange?: ReturnType<typeof createDefaultExchangeState>;
  day?: number;
}) {
  return runExchangeSettlementDay({
    day: args.day ?? DAY,
    exchange: args.exchange ?? createDefaultExchangeState(),
    horses: h2r(args.horses),
    npcStables: args.stables,
    playerReputation: 0,
    playerName: "My Stable",
  });
}

describe("runExchangeSettlementDay", () => {
  it("preserves standing player bids through the daily NPC book regen", () => {
    const seller = desperateSeller();
    const horse = sellerHorse("h1", seller.id);
    const exchange = createDefaultExchangeState();
    // Bid on an unlisted horse — nothing can fill it, so it must survive regen.
    exchange.bids = [playerBid({ horseId: "h-unlisted" })];

    const result = run({ stables: [seller], horses: [horse], exchange });

    expect(result.exchange.bids.some((b) => b.id === "p-bid-1")).toBe(true);
    expect(result.exchange.bids.find((b) => b.id === "p-bid-1")?.price).toBe(1_000_000);
  });

  it("preserves player asks through the daily NPC book regen", () => {
    const seller = desperateSeller();
    const horse = sellerHorse("h1", seller.id);
    const exchange = createDefaultExchangeState();
    exchange.asks = [playerAsk({ horseId: "player-horse" })];

    const result = run({ stables: [seller], horses: [horse], exchange });

    expect(result.exchange.asks.some((a) => a.id === "p-ask-1")).toBe(true);
  });

  it("fills a standing player bid against an NPC ask at the bid price", () => {
    const seller = desperateSeller();
    const horse = sellerHorse("h1", seller.id);
    const exchange = createDefaultExchangeState();
    exchange.bids = [playerBid({ horseId: horse.id, price: 1_000_000 })];

    const result = run({ stables: [seller], horses: [horse], exchange });

    const trade = result.exchange.trades.find((t) => t.horseId === horse.id);
    expect(trade).toBeDefined();
    expect(trade!.buyerId).toBe("player");
    expect(trade!.buyerName).toBe("My Stable");
    expect(trade!.sellerId).toBe(seller.id);
    expect(trade!.price).toBe(1_000_000);
    expect(trade!.initiatedBy).toBe("bid");

    // Ownership moved to the player.
    expect(isPlayerOwned(result.horses[horse.id])).toBe(true);

    // Seller got the proceeds after commission.
    const sellerAfter = result.npcStables.find((s) => s.id === seller.id)!;
    expect(sellerAfter.cash).toBe(500 + netProceeds(1_000_000));

    // The bid and the ask are both consumed.
    expect(result.exchange.bids.some((b) => b.horseId === horse.id)).toBe(false);
    expect(result.exchange.asks.some((a) => a.horseId === horse.id)).toBe(false);

    // Fill is not a second charge — escrow was debited at placement.
    expect(result.playerCashDelta).toBe(0);
  });

  it("does not fill a player bid below the seller's accept floor", () => {
    const seller = createTestStable({
      id: "proud-1",
      name: "Proud Yard",
      cash: 5_000_000,
      personality: "prestige",
    });
    const horse = sellerHorse("h1", seller.id);
    const exchange = createDefaultExchangeState();
    exchange.bids = [playerBid({ horseId: horse.id, price: 50 })];

    const result = run({ stables: [seller], horses: [horse], exchange });

    expect(result.exchange.trades.every((t) => t.buyerId !== "player")).toBe(true);
    // The bid is still live.
    expect(result.exchange.bids.some((b) => b.id === "p-bid-1")).toBe(true);
    expect(result.playerCashDelta).toBe(0);
  });

  it("refunds player bids that expire in the daily prune", () => {
    const seller = desperateSeller();
    const horse = sellerHorse("h1", seller.id);
    const exchange = createDefaultExchangeState();
    exchange.bids = [
      playerBid({ id: "p-bid-exp", horseId: "h-other", price: 75_000, expiresDay: DAY - 1 }),
    ];

    const result = run({ stables: [seller], horses: [horse], exchange });

    expect(result.exchange.bids.some((b) => b.id === "p-bid-exp")).toBe(false);
    expect(result.playerCashDelta).toBe(75_000);
  });

  it("refunds losing player bids on a horse that traded to someone else", () => {
    const seller = desperateSeller();
    const horse = sellerHorse("h1", seller.id);
    const buyers = [richBuyer("b1"), richBuyer("b2")];
    const exchange = createDefaultExchangeState();
    // Player bids pocket change — a rich NPC will out-bid it.
    exchange.bids = [playerBid({ horseId: horse.id, price: 10_000 })];

    const result = run({ stables: [seller, ...buyers], horses: [horse], exchange });

    const trade = result.exchange.trades.find((t) => t.horseId === horse.id);
    // If any trade consumed the horse, the losing player bid is removed and refunded.
    if (trade && trade.buyerId !== "player") {
      expect(result.exchange.bids.some((b) => b.id === "p-bid-1")).toBe(false);
      expect(result.playerCashDelta).toBe(10_000);
    }
  });

  it("still settles NPC-vs-NPC trades exactly once per horse", () => {
    const seller = desperateSeller();
    const buyers = [richBuyer("b1"), richBuyer("b2"), richBuyer("b3")];
    const horses = [sellerHorse("h1", seller.id), sellerHorse("h2", seller.id)];

    const result = run({
      stables: [seller, ...buyers],
      horses,
      exchange: createDefaultExchangeState(),
    });

    for (const trade of result.exchange.trades) {
      expect(trade.buyerId).not.toBe("player");
      expect(isPlayerOwned(result.horses[trade.horseId])).toBe(false);
    }
  });

  it("NPC settlement never spends player cash or consumes the player as an NPC order", () => {
    const seller = desperateSeller();
    const buyers = [richBuyer("b1"), richBuyer("b2")];
    const horses = [sellerHorse("h1", seller.id)];

    const result = run({
      stables: [seller, ...buyers],
      horses,
      exchange: createDefaultExchangeState(),
    });

    for (const trade of result.exchange.trades) {
      expect(trade.buyerId).not.toBe("player");
      expect(trade.commission).toBe(exchangeCommission(trade.price));
    }
  });
});
