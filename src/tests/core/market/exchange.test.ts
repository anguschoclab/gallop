import { describe, it, expect } from "vitest";
import { buildOrderBooks, buildMarketDepth } from "@/core/market/exchange";
import { generateHorse } from "@/core/horse/horseFactory";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";
import type { ExchangeState, ExchangeAsk, ExchangeBid, ExchangeTrade } from "@/core/market/exchange";

describe("buildOrderBooks", () => {
  it("builds a book for a horse with live asks and bids", () => {
    const horse = generateHorse({ tier: "mid", ownership: makePlayerOwned() });
    horse.id = "h1";
    horse.name = "Test Horse";

    const asks: ExchangeAsk[] = [
      { id: "a1", horseId: "h1", sellerId: "player", sellerName: "Player", price: 10000, fairValue: 12000, createdDay: 1, expiresDay: 40, intent: "raising cash", pressureMeter: 0, acceptFloor: 8000, sellerTier: "Local" },
      { id: "a2", horseId: "h1", sellerId: "npc1", sellerName: "NPC", price: 11000, fairValue: 12000, createdDay: 1, expiresDay: 40, intent: "raising cash", pressureMeter: 0, acceptFloor: 8000, sellerTier: "Local" },
    ];

    const bids: ExchangeBid[] = [
      { id: "b1", horseId: "h1", bidderId: "npc2", bidderName: "NPC 2", price: 9000, createdDay: 2, expiresDay: 40, intent: "opportunistic", conviction: 0.5, bidderTier: "Local", rationale: "" },
      { id: "b2", horseId: "h1", bidderId: "npc3", bidderName: "NPC 3", price: 9500, createdDay: 2, expiresDay: 40, intent: "opportunistic", conviction: 0.5, bidderTier: "Local", rationale: "" },
    ];

    const state: ExchangeState = { asks, bids, lastRefreshDay: 1,
      trades: [] };
    const books = buildOrderBooks(state, [horse], 5);

    expect(books).toHaveLength(1);
    const book = books[0];

    expect(book.horseId).toBe("h1");
    expect(book.horseName).toBe("Test Horse");
    expect(book.asks).toHaveLength(2);
    expect(book.bids).toHaveLength(2);

    // Sorts asks ascending
    expect(book.asks[0].price).toBe(10000);
    // Sorts bids descending
    expect(book.bids[0].price).toBe(9500);

    expect(book.bestAsk).toBe(10000);
    expect(book.bestBid).toBe(9500);
    expect(book.spread).toBe(500); // 10000 - 9500
    expect(book.mid).toBe(9750); // (10000 + 9500) / 2
  });

  it("excludes expired orders", () => {
    const horse = generateHorse({ tier: "mid", ownership: makePlayerOwned() });
    horse.id = "h1";

    const asks: ExchangeAsk[] = [
      { id: "a1", horseId: "h1", sellerId: "player", sellerName: "Player", price: 10000, fairValue: 12000, createdDay: 1, expiresDay: 5, intent: "raising cash", pressureMeter: 0, acceptFloor: 8000, sellerTier: "Local" },
    ];

    const state: ExchangeState = { asks, bids: [], lastRefreshDay: 1,
      trades: [] };
    // Current day is 6, so ask has expired
    const books = buildOrderBooks(state, [horse], 6);

    expect(books).toHaveLength(0);
  });

  it("ignores deceased horses", () => {
    const horse = generateHorse({ tier: "mid", ownership: makePlayerOwned() });
    horse.id = "h1";
    horse.lifecycleStatus = "deceased";

    const asks: ExchangeAsk[] = [
      { id: "a1", horseId: "h1", sellerId: "player", sellerName: "Player", price: 10000, fairValue: 12000, createdDay: 1, expiresDay: 40, intent: "raising cash", pressureMeter: 0, acceptFloor: 8000, sellerTier: "Local" },
    ];

    const state: ExchangeState = { asks, bids: [], lastRefreshDay: 1,
      trades: [] };
    const books = buildOrderBooks(state, [horse], 5);

    expect(books).toHaveLength(0);
  });
});

describe("buildMarketDepth", () => {
  it("calculates aggregate depth and volume", () => {
    const horse1 = generateHorse({ tier: "mid", ownership: makePlayerOwned() });
    horse1.id = "h1";
    const horse2 = generateHorse({ tier: "budget", ownership: makeUnowned() });
    horse2.id = "h2";

    const state: ExchangeState = {
      asks: [
        { id: "a1", horseId: "h1", sellerId: "player", sellerName: "Player", price: 12000, fairValue: 12000, createdDay: 1, expiresDay: 40, intent: "raising cash", pressureMeter: 0, acceptFloor: 8000, sellerTier: "Local" },
        { id: "a2", horseId: "h2", sellerId: "npc1", sellerName: "NPC 1", price: 4000, fairValue: 5000, createdDay: 1, expiresDay: 40, intent: "raising cash", pressureMeter: 0, acceptFloor: 3000, sellerTier: "Local" },
      ],
      bids: [
        { id: "b1", horseId: "h1", bidderId: "npc2", bidderName: "NPC 2", price: 10000, createdDay: 2, expiresDay: 40, intent: "opportunistic", conviction: 0.5, bidderTier: "Local", rationale: "" },
      ],
      lastRefreshDay: 1,
      trades: [
        { id: "t1", horseId: "h1", buyerId: "npc2", buyerName: "NPC 2", sellerId: "player", sellerName: "Player", price: 11000, day: 25, horseName: "Test", commission: 100, initiatedBy: "bid" },
        { id: "t2", horseId: "h2", buyerId: "npc1", buyerName: "NPC 1", sellerId: "npc3", sellerName: "NPC 3", price: 4500, day: 2, horseName: "Test 2", commission: 100, initiatedBy: "ask" }, // > 30 days ago, day 35
      ]
    };

    const books = buildOrderBooks(state, [horse1, horse2], 35);
    const depth = buildMarketDepth(books, state, 35);

    expect(depth.openAsks).toBe(2);
    expect(depth.openBids).toBe(1);
    expect(depth.totalAskValue).toBe(16000); // 12000 + 4000
    expect(depth.totalBidValue).toBe(10000);

    // Only t1 is within 30 days of day 35
    expect(depth.volume30d).toBe(1);
    expect(depth.turnover30d).toBe(11000);

    // Spread on h1 is 12000 - 10000 = 2000. h2 has no bids so no spread.
    expect(depth.medianSpread).toBe(2000);
  });
});
