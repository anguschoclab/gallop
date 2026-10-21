import { describe, it, expect } from "vitest";
import { priceAlertMessage, tradeNotificationMessage } from "@/domains/market/simulation/priceAlertMessages";

describe("priceAlertMessages", () => {
  describe("priceAlertMessage", () => {
    it("formats a positive price movement correctly", () => {
      const result = priceAlertMessage({
        alertId: "alert-1",
        scope: { kind: "market" },
        day: 100,
        current: 1100,
        previous: 1000,
        movePct: 10,
        simMovePct: 10,
        realWorldMovePct: 0,
        sampleSize: 5
      } as any);

      expect(result.day).toBe(100);
      expect(result.category).toBe("market");
      expect(result.title).toBe("Whole market: prices up +10.0%");
      expect(result.body).toContain("Average traded price for whole market is now $1,100");
      expect(result.body).toContain("against $1,000 in the previous window (5 trades)");
    });

    it("formats a negative price movement correctly", () => {
      const result = priceAlertMessage({
        alertId: "alert-2",
        scope: { kind: "grade", value: "elite" },
        day: 100,
        current: 900,
        previous: 1000,
        movePct: -10,
        simMovePct: -10,
        realWorldMovePct: 0,
        sampleSize: 1
      } as any);

      expect(result.title).toBe("elite horses: prices down -10.0%");
      expect(result.body).toContain("Average traded price for elite horses is now $900");
      expect(result.body).toContain("against $1,000 in the previous window (1 trade)");
    });

    it("includes real world notes when provided", () => {
      const result = priceAlertMessage({
        alertId: "alert-3",
        scope: { kind: "market" },
        day: 100,
        current: 1100,
        previous: 1000,
        movePct: 10,
        simMovePct: 8,
        realWorldLabel: "Keeneland Sep",
        realWorldMovePct: 12,
        sampleSize: 10
      } as any);

      expect(result.body).toContain("Game trades moved +8.0% while the Keeneland Sep moved +12.0%");
    });
  });

  describe("tradeNotificationMessage", () => {
    it("formats a buy fill correctly", () => {
      const result = tradeNotificationMessage({
        kind: "fill",
        key: "t1",
        day: 50,
        role: "buyer",
        horseName: "Fast Boy",
        price: 5000,
        counterpartyName: "NPC Stable"
      } as any);

      expect(result.title).toBe("Bought Fast Boy for $5,000");
      expect(result.body).toBe("Your exchange order filled from NPC Stable at $5,000.");
      expect(result.priority).toBe("info");
    });

    it("formats a sell fill correctly", () => {
      const result = tradeNotificationMessage({
        kind: "fill",
        key: "t2",
        day: 50,
        role: "seller",
        horseName: "Slow Girl",
        price: 3000,
        counterpartyName: "Rich Player"
      } as any);

      expect(result.title).toBe("Sold Slow Girl for $3,000");
      expect(result.body).toBe("Your exchange order filled to Rich Player at $3,000.");
    });

    it("formats a fillable bid correctly", () => {
      const result = tradeNotificationMessage({
        kind: "fillable",
        key: "t3",
        day: 60,
        horseName: "Star",
        askPrice: 10000,
        bidPrice: 10500,
        bidderName: "Aggressive Buyer"
      } as any);

      expect(result.title).toBe("Bid covers your ask on Star");
      expect(result.body).toBe("Aggressive Buyer is bidding $10,500 against your $10,000 ask. You can take the bid now.");
      expect(result.priority).toBe("action");
    });
  });
});
