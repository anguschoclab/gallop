import { describe, it, expect, vi } from "vitest";
import {
  houseQuote,
  houseQuotes,
  buildHouseCatalogue,
} from "@/domains/market/simulation/houseQuotes";
import { AUCTION_HOUSES } from "@/domains/prestige/simulation/auctionHouses";
import { createTestHorse } from "@/tests/helpers";
import { makeNpcOwned } from "@/domains/horse/simulation/ownership";
import { asNpcStableId } from "@/shared/types/branded";
import type { Horse } from "@/platform/game/types";

vi.mock("@/domains/horse/simulation/pricing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/domains/horse/simulation/pricing")>();
  return {
    ...actual,
    horseMarketValue: vi.fn(() => 10000),
  };
});

describe("houseQuote", () => {
  it("calculates quotes and applies reputation modifiers correctly", () => {
    const horse = createTestHorse({ id: "h1", age: 3 });
    const allHorses = [horse];
    const house = AUCTION_HOUSES[0]; // Assuming at least one house exists

    const quote1 = houseQuote(horse, allHorses, house, 0);
    const quote2 = houseQuote(horse, allHorses, house, 1000); // Max rep

    expect(quote1.fairValue).toBe(10000);
    expect(quote1.commission).toBeGreaterThan(0);

    // Better standing should yield a higher standingFactor and higher sellPrice
    expect(quote2.standingFactor).toBeGreaterThan(quote1.standingFactor);
    expect(quote2.sellPrice).toBeGreaterThan(quote1.sellPrice);
  });
});

describe("houseQuotes", () => {
  it("returns quotes sorted by sellPrice descending", () => {
    const horse = createTestHorse({ id: "h1", age: 3 });
    const quotes = houseQuotes(horse, [horse], AUCTION_HOUSES, 500);

    expect(quotes.length).toBe(AUCTION_HOUSES.length);
    for (let i = 1; i < quotes.length; i++) {
      expect(quotes[i - 1].sellPrice).toBeGreaterThanOrEqual(quotes[i].sellPrice);
    }
  });
});

describe("buildHouseCatalogue", () => {
  it("generates deterministic catalogue filtering player-owned, deceased and consigned horses", () => {
    const house = AUCTION_HOUSES[0];
    const horses = [
      createTestHorse({ id: "h1", age: 2, ownership: { type: "player" } as Horse["ownership"] }), // Player owned
      createTestHorse({
        id: "h2",
        age: 2,
        ownership: makeNpcOwned(asNpcStableId("stable-x")),
        lifecycleStatus: "deceased",
      }), // Deceased
      createTestHorse({
        id: "h3",
        age: 2,
        ownership: makeNpcOwned(asNpcStableId("stable-x")),
        consignedSaleId: "sale1",
      }), // Consigned
      createTestHorse({ id: "h4", age: 2, ownership: makeNpcOwned(asNpcStableId("stable-x")) }), // Eligible
      createTestHorse({ id: "h5", age: 2, ownership: makeNpcOwned(asNpcStableId("stable-x")) }), // Eligible
    ];

    const cat1 = buildHouseCatalogue({ day: 10, house, horses, size: 5 });
    const cat2 = buildHouseCatalogue({ day: 10, house, horses, size: 5 });

    expect(cat1).toEqual(cat2); // Deterministic

    // h4 and h5 might be selected, but definitely not h1, h2, h3
    const ids = cat1.map((c) => c.horse.id);
    expect(ids).not.toContain("h1");
    expect(ids).not.toContain("h2");
    expect(ids).not.toContain("h3");
  });

  it("caps the maximum lots per stable to 2", () => {
    const house = AUCTION_HOUSES[0];
    // Create many horses from the same stable
    const horses = Array.from({ length: 10 }, (_, i) =>
      createTestHorse({
        id: `h${i}`,
        age: 2,
        ownership: makeNpcOwned(asNpcStableId("stable1")),
      }),
    );

    const catalogue = buildHouseCatalogue({ day: 10, house, horses, size: 10 });

    // Cap is 2 MAX_LOTS_PER_STABLE
    expect(catalogue.length).toBe(2);
  });
});
