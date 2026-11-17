import { describe, it, expect } from "vitest";
import { trendFromMove } from "@/domains/market/model/syndicationTrend";

describe("syndication trend", () => {
  it("sells 5% into a rising market", () => {
    expect(trendFromMove(3)).toMatchObject({ action: "sell", shareFraction: 0.05 });
  });
  it("sells 10% into a strong rise", () => {
    expect(trendFromMove(9).shareFraction).toBe(0.1);
  });
  it("buys back in a falling market", () => {
    expect(trendFromMove(-3).action).toBe("buy");
  });
  it("holds in a flat market", () => {
    expect(trendFromMove(1).action).toBe("hold");
  });
  it("caps share price between 85% and 120%", () => {
    expect(trendFromMove(-40).priceMultiplier).toBe(0.85);
    expect(trendFromMove(40).priceMultiplier).toBe(1.2);
  });
});
