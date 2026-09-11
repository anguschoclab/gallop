/**
 * priceAlerts.test.ts — Unit tests for the price-alert and trade-notification
 * pure-logic module in @/core/market/priceAlerts.
 */

import { describe, it, expect } from "vitest";
import {
  segmentPriceIndex,
  evaluatePriceAlerts,
  playerTradeNotifications,
  PRICE_ALERT_COOLDOWN_DAYS,
  DEFAULT_ALERT_WINDOW_DAYS,
  type PriceAlert,
  type AlertHorse,
  type PriceAlertDirection,
  type PriceAlertScope,
} from "@/core/market/priceAlerts";
import { priceAlertMessage, tradeNotificationMessage } from "@/core/market/priceAlertMessages";
import type { ExchangeAsk, ExchangeBid, ExchangeTrade } from "@/core/market/exchange";

function mkHorse(id: string, overrides: Partial<AlertHorse> = {}): AlertHorse {
  return { id, name: `Horse ${id}`, raceHistory: [], courseVisits: {}, ...overrides };
}

function mkRaceHistory(
  grade: string,
): { raceId: string; raceName: string; position: number; day: number; grade: string }[] {
  return [{ raceId: "r1", raceName: "Test Race", position: 1, day: 1, grade }];
}

function mkTrade(
  overrides: Partial<ExchangeTrade> & { id: string; horseId: string },
): ExchangeTrade {
  return {
    horseName: "Test Horse",
    price: 100_000,
    commission: 0,
    buyerId: "npc-1",
    buyerName: "NPC Buyer",
    sellerId: "npc-2",
    sellerName: "NPC Seller",
    day: 10,
    initiatedBy: "ask",
    ...overrides,
  };
}

function mkAsk(overrides: Partial<ExchangeAsk> & { id: string; horseId: string }): ExchangeAsk {
  return {
    sellerId: "npc-1",
    sellerName: "NPC Seller",
    price: 100_000,
    fairValue: 100_000,
    createdDay: 1,
    expiresDay: 20,
    ...overrides,
  };
}

function mkBid(overrides: Partial<ExchangeBid> & { id: string; horseId: string }): ExchangeBid {
  return {
    bidderId: "npc-1",
    bidderName: "NPC Bidder",
    price: 90_000,
    createdDay: 1,
    expiresDay: 20,
    rationale: "test",
    ...overrides,
  };
}

function mkAlert(overrides: Partial<PriceAlert> & { id: string }): PriceAlert {
  return {
    scope: { kind: "market" } as PriceAlertScope,
    direction: "either" as PriceAlertDirection,
    thresholdPct: 10,
    windowDays: 7,
    createdDay: 1,
    enabled: true,
    ...overrides,
  };
}

describe("segmentPriceIndex", () => {
  it("computes current vs previous window average", () => {
    const trades: ExchangeTrade[] = [
      mkTrade({ id: "t1", horseId: "h1", price: 100_000, day: 10 }),
      mkTrade({ id: "t2", horseId: "h1", price: 120_000, day: 10 }),
      mkTrade({ id: "t3", horseId: "h1", price: 100_000, day: 3 }),
      mkTrade({ id: "t4", horseId: "h1", price: 100_000, day: 3 }),
    ];
    const horses = [mkHorse("h1")];
    const index = segmentPriceIndex({
      trades,
      horses,
      scope: { kind: "market" },
      day: 10,
      windowDays: 7,
      realWorldWeight: 0,
    });
    // current window = days 4-10 → trades at day 10 (avg 110k)
    // previous window = days -3 to 3 → trades at day 3 (avg 100k)
    expect(index.current).toBe(110_000);
    expect(index.previous).toBe(100_000);
    expect(index.simMovePct).toBeCloseTo(10, 0);
  });

  it("returns 0 movePct when no trades in either window", () => {
    const index = segmentPriceIndex({
      trades: [],
      horses: [mkHorse("h1")],
      scope: { kind: "market" },
      day: 10,
      windowDays: 7,
      realWorldWeight: 0,
    });
    expect(index.movePct).toBe(0);
    expect(index.simMovePct).toBe(0);
  });

  it("returns 0 movePct when previous window is empty", () => {
    const trades = [mkTrade({ id: "t1", horseId: "h1", price: 100_000, day: 10 })];
    const index = segmentPriceIndex({
      trades,
      horses: [mkHorse("h1")],
      scope: { kind: "market" },
      day: 10,
      windowDays: 7,
      realWorldWeight: 0,
    });
    expect(index.previous).toBe(0);
    expect(index.simMovePct).toBe(0);
  });

  it("filters trades by scope (market/grade/track)", () => {
    const horses = [
      mkHorse("h1", { raceHistory: mkRaceHistory("G1") }),
      mkHorse("h2", { raceHistory: mkRaceHistory("G3") }),
    ];
    const trades = [
      mkTrade({ id: "t1", horseId: "h1", price: 100_000, day: 10 }),
      mkTrade({ id: "t2", horseId: "h1", price: 100_000, day: 3 }),
      mkTrade({ id: "t3", horseId: "h2", price: 200_000, day: 10 }),
      mkTrade({ id: "t4", horseId: "h2", price: 200_000, day: 3 }),
    ];
    const index = segmentPriceIndex({
      trades,
      horses,
      scope: { kind: "grade", value: "G1" },
      day: 10,
      windowDays: 7,
      realWorldWeight: 0,
    });
    // Only h1 trades should be counted
    expect(index.current).toBe(100_000);
    expect(index.previous).toBe(100_000);
  });

  it("returns simMovePct only when realWorldWeight is 0", () => {
    const trades = [
      mkTrade({ id: "t1", horseId: "h1", price: 110_000, day: 10 }),
      mkTrade({ id: "t2", horseId: "h1", price: 100_000, day: 3 }),
    ];
    const index = segmentPriceIndex({
      trades,
      horses: [mkHorse("h1")],
      scope: { kind: "market" },
      day: 10,
      windowDays: 7,
      realWorldWeight: 0,
    });
    expect(index.movePct).toBe(index.simMovePct);
    expect(index.realWorldWeight).toBe(0);
  });
});

describe("evaluatePriceAlerts", () => {
  it("fires when |movePct| >= thresholdPct", () => {
    const trades = [
      mkTrade({ id: "t1", horseId: "h1", price: 120_000, day: 10 }),
      mkTrade({ id: "t2", horseId: "h1", price: 100_000, day: 3 }),
    ];
    const alert = mkAlert({ id: "a1", thresholdPct: 10, windowDays: 7 });
    const triggers = evaluatePriceAlerts({
      alerts: [alert],
      trades,
      horses: [mkHorse("h1")],
      day: 10,
      realWorldWeight: 0,
    });
    expect(triggers.length).toBe(1);
    expect(triggers[0].alertId).toBe("a1");
  });

  it("does not fire when |movePct| < thresholdPct", () => {
    const trades = [
      mkTrade({ id: "t1", horseId: "h1", price: 105_000, day: 10 }),
      mkTrade({ id: "t2", horseId: "h1", price: 100_000, day: 3 }),
    ];
    const alert = mkAlert({ id: "a1", thresholdPct: 10, windowDays: 7 });
    const triggers = evaluatePriceAlerts({
      alerts: [alert],
      trades,
      horses: [mkHorse("h1")],
      day: 10,
      realWorldWeight: 0,
    });
    expect(triggers.length).toBe(0);
  });

  it("respects direction 'up' (only positive moves)", () => {
    const trades = [
      mkTrade({ id: "t1", horseId: "h1", price: 80_000, day: 10 }),
      mkTrade({ id: "t2", horseId: "h1", price: 100_000, day: 3 }),
    ];
    const alert = mkAlert({ id: "a1", direction: "up", thresholdPct: 10, windowDays: 7 });
    const triggers = evaluatePriceAlerts({
      alerts: [alert],
      trades,
      horses: [mkHorse("h1")],
      day: 10,
      realWorldWeight: 0,
    });
    // Price dropped 20% — direction "up" should NOT fire
    expect(triggers.length).toBe(0);
  });

  it("respects direction 'down' (only negative moves)", () => {
    const trades = [
      mkTrade({ id: "t1", horseId: "h1", price: 120_000, day: 10 }),
      mkTrade({ id: "t2", horseId: "h1", price: 100_000, day: 3 }),
    ];
    const alert = mkAlert({ id: "a1", direction: "down", thresholdPct: 10, windowDays: 7 });
    const triggers = evaluatePriceAlerts({
      alerts: [alert],
      trades,
      horses: [mkHorse("h1")],
      day: 10,
      realWorldWeight: 0,
    });
    // Price rose 20% — direction "down" should NOT fire
    expect(triggers.length).toBe(0);
  });

  it("skips disabled alerts", () => {
    const trades = [
      mkTrade({ id: "t1", horseId: "h1", price: 120_000, day: 10 }),
      mkTrade({ id: "t2", horseId: "h1", price: 100_000, day: 3 }),
    ];
    const alert = mkAlert({ id: "a1", enabled: false, thresholdPct: 10, windowDays: 7 });
    const triggers = evaluatePriceAlerts({
      alerts: [alert],
      trades,
      horses: [mkHorse("h1")],
      day: 10,
      realWorldWeight: 0,
    });
    expect(triggers.length).toBe(0);
  });

  it("respects cooldown (PRICE_ALERT_COOLDOWN_DAYS)", () => {
    const trades = [
      mkTrade({ id: "t1", horseId: "h1", price: 120_000, day: 10 }),
      mkTrade({ id: "t2", horseId: "h1", price: 100_000, day: 3 }),
    ];
    const alert = mkAlert({
      id: "a1",
      thresholdPct: 10,
      windowDays: 7,
      lastTriggeredDay: 10 - PRICE_ALERT_COOLDOWN_DAYS + 1, // still in cooldown
    });
    const triggers = evaluatePriceAlerts({
      alerts: [alert],
      trades,
      horses: [mkHorse("h1")],
      day: 10,
      realWorldWeight: 0,
    });
    expect(triggers.length).toBe(0);
  });

  it("skips when sampleSize or baselineSize is 0", () => {
    const trades = [mkTrade({ id: "t1", horseId: "h1", price: 120_000, day: 10 })];
    const alert = mkAlert({ id: "a1", thresholdPct: 10, windowDays: 7 });
    const triggers = evaluatePriceAlerts({
      alerts: [alert],
      trades,
      horses: [mkHorse("h1")],
      day: 10,
      realWorldWeight: 0,
    });
    // No trades in previous window → baselineSize = 0 → skip
    expect(triggers.length).toBe(0);
  });
});

describe("playerTradeNotifications", () => {
  it("notifies on player's own fills (buyer side)", () => {
    const trades = [
      mkTrade({ id: "t1", horseId: "h1", buyerId: "player", sellerId: "npc-1", day: 10 }),
    ];
    const notifications = playerTradeNotifications({
      trades,
      asks: [],
      bids: [],
      day: 10,
    });
    expect(notifications.length).toBe(1);
    expect(notifications[0].kind).toBe("fill");
    if (notifications[0].kind === "fill") {
      expect(notifications[0].role).toBe("buyer");
    }
  });

  it("notifies on player's own fills (seller side)", () => {
    const trades = [
      mkTrade({ id: "t1", horseId: "h1", sellerId: "player", buyerId: "npc-1", day: 10 }),
    ];
    const notifications = playerTradeNotifications({
      trades,
      asks: [],
      bids: [],
      day: 10,
    });
    expect(notifications.length).toBe(1);
    if (notifications[0].kind === "fill") {
      expect(notifications[0].role).toBe("seller");
    }
  });

  it("notifies on fillable listings (bid covers ask)", () => {
    const asks = [
      mkAsk({ id: "ask-1", horseId: "h1", sellerId: "player", price: 100_000, expiresDay: 20 }),
    ];
    const bids = [
      mkBid({ id: "bid-1", horseId: "h1", bidderId: "npc-1", price: 110_000, expiresDay: 20 }),
    ];
    const notifications = playerTradeNotifications({
      trades: [],
      asks,
      bids,
      day: 10,
    });
    expect(notifications.length).toBe(1);
    expect(notifications[0].kind).toBe("fillable");
  });

  it("skips already-notified trade keys", () => {
    const trades = [mkTrade({ id: "t1", horseId: "h1", buyerId: "player", day: 10 })];
    const notifications = playerTradeNotifications({
      trades,
      asks: [],
      bids: [],
      day: 10,
      notifiedKeys: ["t1"],
    });
    expect(notifications.length).toBe(0);
  });

  it("skips trades not on the current day", () => {
    const trades = [mkTrade({ id: "t1", horseId: "h1", buyerId: "player", day: 9 })];
    const notifications = playerTradeNotifications({
      trades,
      asks: [],
      bids: [],
      day: 10,
    });
    expect(notifications.length).toBe(0);
  });

  it("skips expired asks/bids", () => {
    const asks = [
      mkAsk({ id: "ask-1", horseId: "h1", sellerId: "player", price: 100_000, expiresDay: 5 }),
    ];
    const bids = [
      mkBid({ id: "bid-1", horseId: "h1", bidderId: "npc-1", price: 110_000, expiresDay: 20 }),
    ];
    const notifications = playerTradeNotifications({
      trades: [],
      asks,
      bids,
      day: 10,
    });
    // Ask expired at day 5, current day is 10 → skip
    expect(notifications.length).toBe(0);
  });
});

describe("priceAlertMessage / tradeNotificationMessage", () => {
  it("priceAlertMessage produces category 'market' message", () => {
    const msg = priceAlertMessage({
      alertId: "a1",
      scope: { kind: "market" },
      day: 10,
      movePct: 15,
      simMovePct: 15,
      realWorldMovePct: 0,
      current: 115_000,
      previous: 100_000,
      sampleSize: 3,
    });
    expect(msg.category).toBe("market");
  });

  it("priceAlertMessage includes scope label and move pct in title", () => {
    const msg = priceAlertMessage({
      alertId: "a1",
      scope: { kind: "market" },
      day: 10,
      movePct: 15,
      simMovePct: 15,
      realWorldMovePct: 0,
      current: 115_000,
      previous: 100_000,
      sampleSize: 3,
    });
    expect(msg.title).toContain("Whole market");
    expect(msg.title).toContain("up");
  });

  it("tradeNotificationMessage (fill) produces category 'market' message", () => {
    const msg = tradeNotificationMessage({
      kind: "fill",
      key: "t1",
      role: "buyer",
      horseName: "Test Horse",
      price: 100_000,
      counterpartyName: "NPC Stable",
      day: 10,
    });
    expect(msg.category).toBe("market");
  });

  it("tradeNotificationMessage (fillable) produces category 'market' message", () => {
    const msg = tradeNotificationMessage({
      kind: "fillable",
      key: "ask-1:bid-1",
      horseName: "Test Horse",
      askPrice: 100_000,
      bidPrice: 110_000,
      bidderName: "NPC Stable",
      day: 10,
    });
    expect(msg.category).toBe("market");
  });
});
