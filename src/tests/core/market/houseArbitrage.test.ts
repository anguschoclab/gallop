import { describe, it, expect } from "vitest";
import { houseQuote, cheapestHouseBuyPrice } from "@/domains/market/simulation/houseQuotes";
import { AUCTION_HOUSES } from "@/domains/prestige/simulation/auctionHouses";
import { createTestHorse } from "@/tests/helpers";

describe("auction house resale", () => {
  it("no house pays a seller more than the cheapest house charges a buyer, at any standing", () => {
    const horse = createTestHorse();
    for (const rep of [0, 500, 1000]) {
      const quotes = AUCTION_HOUSES.map((h) => houseQuote(horse, [horse], h, rep));
      const cheapestBuy = Math.min(...quotes.map((q) => q.buyPrice));
      for (const q of quotes) expect(q.sellPrice).toBeLessThan(cheapestBuy);
      expect(cheapestHouseBuyPrice(quotes[0]!.fairValue)).toBe(cheapestBuy);
    }
  });
});
