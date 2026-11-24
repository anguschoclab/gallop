import { describe, expect, it } from "vitest";
import {
  computeMarketIndex,
  flowPressure,
  marketMultiplier,
  stableMoneyFlows,
} from "@/domains/market/simulation/marketIndex";
import type { ExchangeTrade } from "@/domains/market/simulation/exchange";

const t = (
  day: number,
  price: number,
  fairValue: number,
  buyerId = "b",
  sellerId = "s",
): ExchangeTrade => ({
  id: `${day}-${price}`,
  horseId: "h",
  horseName: "H",
  price,
  commission: price * 0.025,
  buyerId,
  buyerName: buyerId,
  sellerId,
  sellerName: sellerId,
  day,
  initiatedBy: "ask",
  fairValue,
});

describe("market index", () => {
  it("is 100 with fewer than 3 trades", () => {
    expect(computeMarketIndex([t(5, 120, 100), t(6, 120, 100)], 10).value).toBe(100);
  });
  it("rises when horses trade above value", () => {
    const idx = computeMarketIndex([t(8, 120, 100), t(9, 120, 100), t(10, 120, 100)], 10);
    expect(idx.value).toBe(120);
    expect(idx.multiplier).toBeCloseTo(1.1);
  });
  it("caps rival quote multiplier at ±15%", () => {
    expect(marketMultiplier(200)).toBe(1.15);
    expect(marketMultiplier(50)).toBe(0.85);
  });
  it("money outflow adds cash pressure, capped at 0.3", () => {
    const flows = stableMoneyFlows([t(9, 100_000, 100_000, "buyer", "seller")], 10);
    expect(flows.get("buyer")!.net).toBe(-100_000);
    expect(flowPressure(flows.get("buyer"), 0)).toBe(0.3);
    expect(flowPressure(flows.get("seller"), 0)).toBe(0);
  });
});
