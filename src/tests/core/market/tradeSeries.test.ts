/**
 * tradeSeries.test.ts - Tests for tradeSeries and housePriceSeries
 *
 * Written BEFORE the H3 extraction (Phase 0.2). Locks down the daily
 * volume/turnover/avgPrice aggregation behaviour, including the carry-forward
 * difference between the two functions.
 */

import { describe, it, expect } from "vitest";
import {
  tradeSeries,
  createDefaultExchangeState,
  type ExchangeTrade,
} from "@/core/market/exchange";
import { housePriceSeries } from "@/core/market/houseQuotes";

function trade(overrides: Partial<ExchangeTrade> & { id: string; day: number }): ExchangeTrade {
  return {
    horseId: "h1",
    horseName: "Horse",
    price: 100_000,
    commission: 4_000,
    buyerId: "buyer",
    buyerName: "Buyer",
    sellerId: "seller",
    sellerName: "Seller",
    initiatedBy: "ask",
    ...overrides,
  };
}

describe("tradeSeries", () => {
  it("returns all-zero entries for empty trades", () => {
    const state = createDefaultExchangeState();
    const series = tradeSeries(state, 10, 5);
    expect(series).toHaveLength(5);
    for (const s of series) {
      expect(s.volume).toBe(0);
      expect(s.turnover).toBe(0);
      expect(s.avgPrice).toBe(0);
    }
  });

  it("aggregates volume, turnover and avgPrice per day", () => {
    const state = {
      ...createDefaultExchangeState(),
      trades: [
        trade({ id: "t1", day: 8, price: 100_000 }),
        trade({ id: "t2", day: 8, price: 200_000 }),
        trade({ id: "t3", day: 9, price: 50_000 }),
      ],
    };
    const series = tradeSeries(state, 10, 5);
    const day8 = series.find((s) => s.day === 8)!;
    expect(day8.volume).toBe(2);
    expect(day8.turnover).toBe(300_000);
    expect(day8.avgPrice).toBe(150_000);
    const day9 = series.find((s) => s.day === 9)!;
    expect(day9.volume).toBe(1);
    expect(day9.turnover).toBe(50_000);
    expect(day9.avgPrice).toBe(50_000);
  });

  it("clips the window to day 1 when day < windowDays", () => {
    const state = createDefaultExchangeState();
    const series = tradeSeries(state, 3, 30);
    expect(series[0].day).toBe(1);
    expect(series).toHaveLength(3);
  });
});

describe("housePriceSeries", () => {
  it("returns zero avgPrice for empty trades (no carry yet)", () => {
    const series = housePriceSeries([], 10, 5);
    expect(series).toHaveLength(5);
    expect(series[0].avgPrice).toBe(0);
  });

  it("carries forward the last known avgPrice on empty days", () => {
    const trades = [
      { day: 7, price: 100_000 },
      { day: 7, price: 200_000 },
    ];
    const series = housePriceSeries(trades, 10, 5);
    const day7 = series.find((s) => s.day === 7)!;
    expect(day7.avgPrice).toBe(150_000);
    const day8 = series.find((s) => s.day === 8)!;
    expect(day8.avgPrice).toBe(150_000); // carried forward
    const day9 = series.find((s) => s.day === 9)!;
    expect(day9.avgPrice).toBe(150_000); // still carried
  });

  it("updates carry when a new day has trades", () => {
    const trades = [
      { day: 7, price: 100_000 },
      { day: 9, price: 300_000 },
    ];
    const series = housePriceSeries(trades, 10, 5);
    const day8 = series.find((s) => s.day === 8)!;
    expect(day8.avgPrice).toBe(100_000); // carried from day 7
    const day9 = series.find((s) => s.day === 9)!;
    expect(day9.avgPrice).toBe(300_000); // new day, new carry
    const day10 = series.find((s) => s.day === 10)!;
    expect(day10.avgPrice).toBe(300_000); // carried from day 9
  });

  it("clips the window to day 1 when day < windowDays", () => {
    const series = housePriceSeries([], 3, 30);
    expect(series[0].day).toBe(1);
    expect(series).toHaveLength(3);
  });
});
