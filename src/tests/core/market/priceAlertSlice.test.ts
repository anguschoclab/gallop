/**
 * priceAlertSlice.test.ts — Tests for the priceAlertSlice store actions.
 *
 * Tests addPriceAlert, removePriceAlert, togglePriceAlert, updatePriceAlert,
 * evaluateMarketAlerts, and the new updateMarketStrategy action.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import {
  createDefaultExchangeState,
  type ExchangeAsk,
  type ExchangeTrade,
} from "@/core/market/exchange";
import { DEFAULT_MARKET_STRATEGY, type MarketStrategy } from "@/core/market/strategy";
import type { PriceAlert } from "@/core/market/priceAlerts";

function seedStore(overrides: Record<string, unknown> = {}) {
  useGame.setState({ ...createDefaultGameState(), ...overrides } as any);
}

function mkAsk(overrides: Partial<ExchangeAsk> & { id: string; horseId: string }): ExchangeAsk {
  return {
    sellerId: "npc-1",
    sellerName: "NPC Stable",
    price: 100_000,
    fairValue: 100_000,
    createdDay: 1,
    expiresDay: 20,
    ...overrides,
  };
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

describe("addPriceAlert", () => {
  beforeEach(() => {
    seedStore({ day: 5 });
  });

  it("creates an alert with a unique id", () => {
    const id1 = useGame.getState().addPriceAlert({ scope: { kind: "market" } });
    const id2 = useGame.getState().addPriceAlert({ scope: { kind: "market" } });
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it("defaults direction to 'either'", () => {
    const id = useGame.getState().addPriceAlert({ scope: { kind: "market" } });
    const alert = useGame.getState().priceAlerts.find((a) => a.id === id);
    expect(alert?.direction).toBe("either");
  });

  it("clamps thresholdPct to minimum 1", () => {
    const id = useGame.getState().addPriceAlert({
      scope: { kind: "market" },
      thresholdPct: 0,
    });
    const alert = useGame.getState().priceAlerts.find((a) => a.id === id);
    expect(alert?.thresholdPct).toBe(1);
  });

  it("clamps windowDays to minimum 1", () => {
    const id = useGame.getState().addPriceAlert({
      scope: { kind: "market" },
      windowDays: 0,
    });
    const alert = useGame.getState().priceAlerts.find((a) => a.id === id);
    expect(alert?.windowDays).toBe(1);
  });

  it("sets createdDay to current day", () => {
    seedStore({ day: 42 });
    const id = useGame.getState().addPriceAlert({ scope: { kind: "market" } });
    const alert = useGame.getState().priceAlerts.find((a) => a.id === id);
    expect(alert?.createdDay).toBe(42);
  });

  it("sets enabled to true", () => {
    const id = useGame.getState().addPriceAlert({ scope: { kind: "market" } });
    const alert = useGame.getState().priceAlerts.find((a) => a.id === id);
    expect(alert?.enabled).toBe(true);
  });
});

describe("removePriceAlert", () => {
  beforeEach(() => {
    seedStore({ day: 5 });
  });

  it("removes the alert by id", () => {
    const id = useGame.getState().addPriceAlert({ scope: { kind: "market" } });
    useGame.getState().removePriceAlert(id);
    expect(useGame.getState().priceAlerts.find((a) => a.id === id)).toBeUndefined();
  });

  it("does nothing if id not found", () => {
    const before = useGame.getState().priceAlerts.length;
    useGame.getState().removePriceAlert("nonexistent");
    expect(useGame.getState().priceAlerts.length).toBe(before);
  });
});

describe("togglePriceAlert", () => {
  beforeEach(() => {
    seedStore({ day: 5 });
  });

  it("toggles enabled flag", () => {
    const id = useGame.getState().addPriceAlert({ scope: { kind: "market" } });
    expect(useGame.getState().priceAlerts.find((a) => a.id === id)?.enabled).toBe(true);
    useGame.getState().togglePriceAlert(id);
    expect(useGame.getState().priceAlerts.find((a) => a.id === id)?.enabled).toBe(false);
    useGame.getState().togglePriceAlert(id);
    expect(useGame.getState().priceAlerts.find((a) => a.id === id)?.enabled).toBe(true);
  });

  it("can explicitly set enabled", () => {
    const id = useGame.getState().addPriceAlert({ scope: { kind: "market" } });
    useGame.getState().togglePriceAlert(id, false);
    expect(useGame.getState().priceAlerts.find((a) => a.id === id)?.enabled).toBe(false);
    useGame.getState().togglePriceAlert(id, true);
    expect(useGame.getState().priceAlerts.find((a) => a.id === id)?.enabled).toBe(true);
  });
});

describe("updatePriceAlert", () => {
  beforeEach(() => {
    seedStore({ day: 5 });
  });

  it("patches the alert by id", () => {
    const id = useGame.getState().addPriceAlert({ scope: { kind: "market" } });
    useGame.getState().updatePriceAlert(id, { thresholdPct: 25, windowDays: 14 });
    const alert = useGame.getState().priceAlerts.find((a) => a.id === id);
    expect(alert?.thresholdPct).toBe(25);
    expect(alert?.windowDays).toBe(14);
  });
});

describe("evaluateMarketAlerts", () => {
  beforeEach(() => {
    seedStore({ day: 10 });
  });

  it("pushes market-category inbox messages for fired alerts", () => {
    const exchange = createDefaultExchangeState();
    exchange.trades = [
      mkTrade({ id: "t1", horseId: "h1", price: 120_000, day: 10 }),
      mkTrade({ id: "t2", horseId: "h1", price: 100_000, day: 3 }),
    ];
    seedStore({ day: 10, exchange, priceAlerts: [] });

    // Add an alert that should fire (20% move, threshold 10%)
    const alertId = useGame.getState().addPriceAlert({
      scope: { kind: "market" },
      thresholdPct: 10,
      windowDays: 7,
    });

    useGame.getState().evaluateMarketAlerts();

    const marketMessages = useGame.getState().inbox.filter((m) => m.category === "market");
    expect(marketMessages.length).toBeGreaterThan(0);
  });

  it("pushes trade-notification messages for player fills", () => {
    const exchange = createDefaultExchangeState();
    exchange.trades = [
      mkTrade({
        id: "t-fill",
        horseId: "h1",
        buyerId: "player",
        sellerId: "npc-1",
        day: 10,
      }),
    ];
    seedStore({ day: 10, exchange, priceAlerts: [] });

    useGame.getState().evaluateMarketAlerts();

    const fillMessages = useGame
      .getState()
      .inbox.filter((m) => m.category === "market" && m.title.includes("Bought"));
    expect(fillMessages.length).toBe(1);
  });

  it("updates lastTriggeredDay on fired alerts", () => {
    const exchange = createDefaultExchangeState();
    exchange.trades = [
      mkTrade({ id: "t1", horseId: "h1", price: 120_000, day: 10 }),
      mkTrade({ id: "t2", horseId: "h1", price: 100_000, day: 3 }),
    ];
    seedStore({ day: 10, exchange, priceAlerts: [] });

    const alertId = useGame.getState().addPriceAlert({
      scope: { kind: "market" },
      thresholdPct: 10,
      windowDays: 7,
    });

    useGame.getState().evaluateMarketAlerts();

    const alert = useGame.getState().priceAlerts.find((a) => a.id === alertId);
    expect(alert?.lastTriggeredDay).toBe(10);
  });

  it("updates notifiedTradeKeys for de-duplication", () => {
    const exchange = createDefaultExchangeState();
    exchange.trades = [
      mkTrade({
        id: "t-dedup",
        horseId: "h1",
        buyerId: "player",
        day: 10,
      }),
    ];
    seedStore({ day: 10, exchange, priceAlerts: [] });

    useGame.getState().evaluateMarketAlerts();
    expect(useGame.getState().notifiedTradeKeys).toContain("t-dedup");
  });

  it("does nothing when no alerts fire and no notifications", () => {
    const exchange = createDefaultExchangeState();
    seedStore({ day: 10, exchange, priceAlerts: [], inbox: [] });

    const inboxBefore = useGame.getState().inbox.length;
    useGame.getState().evaluateMarketAlerts();
    expect(useGame.getState().inbox.length).toBe(inboxBefore);
  });

  it("caps inbox at MAX_INBOX (100)", () => {
    // Pre-fill inbox with 99 messages
    const existingMessages = Array.from({ length: 99 }, (_, i) => ({
      id: `old-${i}`,
      day: 1,
      category: "system" as const,
      priority: "info" as const,
      title: `Old ${i}`,
      body: "body",
    }));
    const exchange = createDefaultExchangeState();
    exchange.trades = [
      mkTrade({
        id: "t-cap",
        horseId: "h1",
        buyerId: "player",
        day: 10,
      }),
    ];
    seedStore({ day: 10, exchange, priceAlerts: [], inbox: existingMessages });

    useGame.getState().evaluateMarketAlerts();
    expect(useGame.getState().inbox.length).toBeLessThanOrEqual(100);
  });
});

describe("updateMarketStrategy", () => {
  beforeEach(() => {
    seedStore({ day: 5 });
  });

  it("patches marketStrategy with partial updates", () => {
    useGame.getState().updateMarketStrategy({ maxPrice: 500_000 });
    expect(useGame.getState().marketStrategy.maxPrice).toBe(500_000);
    // Other fields should remain at defaults
    expect(useGame.getState().marketStrategy.targetGrades).toEqual(["G1", "G2"]);
  });

  it("preserves existing strategy fields not in the patch", () => {
    useGame.getState().updateMarketStrategy({ minTrackPrestige: 80 });
    useGame.getState().updateMarketStrategy({ maxPrice: 400_000 });
    expect(useGame.getState().marketStrategy.minTrackPrestige).toBe(80);
    expect(useGame.getState().marketStrategy.maxPrice).toBe(400_000);
  });

  it("falls back to DEFAULT_MARKET_STRATEGY when marketStrategy is undefined", () => {
    // Clear marketStrategy to simulate a save that predates the field
    useGame.setState({ marketStrategy: undefined } as any);
    useGame.getState().updateMarketStrategy({ maxPrice: 999_999 });
    expect(useGame.getState().marketStrategy.maxPrice).toBe(999_999);
    expect(useGame.getState().marketStrategy.minTrackPrestige).toBe(
      DEFAULT_MARKET_STRATEGY.minTrackPrestige,
    );
  });
});
