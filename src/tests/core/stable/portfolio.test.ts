/**
 * portfolio.test.ts - Tests for buildStablePortfolios, portfolioTotals, sortPortfolios
 *
 * Written BEFORE the H4 extraction (Phase 0.3). Locks down the portfolio
 * derivation so the toRosterEntry extraction can be verified against it.
 */

import { describe, it, expect } from "vitest";
import {
  buildStablePortfolios,
  portfolioTotals,
  sortPortfolios,
  type StablePortfolio,
} from "@/core/stable/portfolio";
import { createTestHorse } from "@/tests/helpers";
import { makePlayerOwned, makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId, asStableId } from "@/core/types/branded";
import type { Horse, Stable } from "@/game/types";

function mkStable(overrides: Partial<Stable> & { id: string }): Stable {
  return {
    name: `Stable ${overrides.id}`,
    owner: "Owner",
    tier: "mid",
    reputation: 50,
    founded: 1990,
    cash: 200_000,
    horses: [],
    isMajor: false,
    colors: { primary: "#fff", secondary: "#000" },
    personality: "trader",
    staff: { trainer: null, groom: null, nutritionist: null, farrier: null, veterinarian: null },
    outposts: [],
    ...overrides,
  } as Stable;
}

const baseArgs = {
  playerName: "My Stable",
  playerOwnerName: "You",
  playerCash: 500_000,
  playerPrestige: 400,
  playerCountry: "USA",
  horses: [] as Horse[],
  npcStables: [] as Stable[],
  syndicates: {},
};

describe("buildStablePortfolios", () => {
  it("includes the player row plus one row per NPC stable", () => {
    const rows = buildStablePortfolios({
      ...baseArgs,
      npcStables: [mkStable({ id: "npc-1" }), mkStable({ id: "npc-2" })],
    });
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.isPlayer)).toHaveLength(1);
    expect(rows.filter((r) => !r.isPlayer).map((r) => r.id)).toEqual(["npc-1", "npc-2"]);
  });

  it("counts horses and computes horseValue for each stable", () => {
    const playerHorse = createTestHorse({
      id: "h-p",
      ownership: makePlayerOwned(),
      name: "Player Horse",
    });
    const npcHorse = createTestHorse({
      id: "h-n",
      ownership: makeNpcOwned(asNpcStableId("npc-1")),
      name: "NPC Horse",
    });
    const rows = buildStablePortfolios({
      ...baseArgs,
      horses: [playerHorse, npcHorse],
      npcStables: [mkStable({ id: "npc-1" })],
    });
    const player = rows.find((r) => r.isPlayer)!;
    expect(player.horseCount).toBe(1);
    expect(player.horseValue).toBeGreaterThan(0);
    expect(player.topHorseName).toBe("Player Horse");

    const npc = rows.find((r) => r.id === "npc-1")!;
    expect(npc.horseCount).toBe(1);
    expect(npc.horseValue).toBeGreaterThan(0);
    expect(npc.topHorseName).toBe("NPC Horse");
  });

  it("populates the roster with RosterEntry-shaped entries sorted by value desc", () => {
    const h1 = createTestHorse({ id: "h1", ownership: makePlayerOwned(), name: "Cheap" });
    const h2 = createTestHorse({
      id: "h2",
      ownership: makePlayerOwned(),
      name: "Pricey",
      stats: {
        speed: 90,
        stamina: 90,
        acceleration: 90,
        consistency: 90,
        temperament: 80,
        conformation: 80,
      },
    });
    const rows = buildStablePortfolios({ ...baseArgs, horses: [h1, h2] });
    const player = rows.find((r) => r.isPlayer)!;
    expect(player.roster).toHaveLength(2);
    expect(player.roster[0]).toHaveProperty("id");
    expect(player.roster[0]).toHaveProperty("name");
    expect(player.roster[0]).toHaveProperty("age");
    expect(player.roster[0]).toHaveProperty("gender");
    expect(player.roster[0]).toHaveProperty("rating");
    expect(player.roster[0]).toHaveProperty("value");
    expect(player.roster[0]).toHaveProperty("starts");
    expect(player.roster[0]).toHaveProperty("wins");
    expect(player.roster[0]).toHaveProperty("retired");
    // sorted by value desc
    expect(player.roster[0].value).toBeGreaterThanOrEqual(player.roster[1].value);
  });

  it("computes netWorth = cash + horseValue + syndicateValue", () => {
    const rows = buildStablePortfolios({ ...baseArgs });
    const player = rows.find((r) => r.isPlayer)!;
    expect(player.netWorth).toBe(player.cash + player.horseValue + player.syndicateValue);
  });

  it("assigns prestige tier from the prestige score (passed directly, clamped 0-100)", () => {
    const rows = buildStablePortfolios({ ...baseArgs, playerPrestige: 95 });
    const player = rows.find((r) => r.isPlayer)!;
    expect(player.prestige).toBe(95);
    expect(player.prestigeTier).toBe("world");
  });

  it("excludes deceased horses from the roster", () => {
    const h = createTestHorse({
      id: "h-d",
      ownership: makePlayerOwned(),
      lifecycleStatus: "deceased",
    });
    const rows = buildStablePortfolios({ ...baseArgs, horses: [h] });
    const player = rows.find((r) => r.isPlayer)!;
    expect(player.horseCount).toBe(0);
  });
});

describe("portfolioTotals", () => {
  it("sums cash, horseCount, horseValue, syndicateValue, netWorth across rows", () => {
    const rows: StablePortfolio[] = [
      {
        cash: 100,
        horseCount: 2,
        horseValue: 500,
        syndicateValue: 50,
        netWorth: 650,
      } as StablePortfolio,
      {
        cash: 200,
        horseCount: 3,
        horseValue: 1000,
        syndicateValue: 100,
        netWorth: 1300,
      } as StablePortfolio,
    ];
    const totals = portfolioTotals(rows);
    expect(totals.cash).toBe(300);
    expect(totals.horseCount).toBe(5);
    expect(totals.horseValue).toBe(1500);
    expect(totals.syndicateValue).toBe(150);
    expect(totals.netWorth).toBe(1950);
  });

  it("returns zeros for an empty list", () => {
    const totals = portfolioTotals([]);
    expect(totals.cash).toBe(0);
    expect(totals.horseCount).toBe(0);
  });
});

describe("sortPortfolios", () => {
  const rows: StablePortfolio[] = [
    {
      name: "Bravo",
      netWorth: 200,
      cash: 50,
      horseCount: 3,
      horseValue: 100,
      syndicateValue: 10,
      prestige: 60,
      lifetimeEarnings: 500,
    } as StablePortfolio,
    {
      name: "Alpha",
      netWorth: 300,
      cash: 100,
      horseCount: 1,
      horseValue: 200,
      syndicateValue: 20,
      prestige: 80,
      lifetimeEarnings: 1000,
    } as StablePortfolio,
  ];

  it("sorts by name alphabetically ascending", () => {
    const sorted = sortPortfolios(rows, "name", "asc");
    expect(sorted[0].name).toBe("Alpha");
  });

  it("sorts by netWorth descending", () => {
    const sorted = sortPortfolios(rows, "netWorth", "desc");
    expect(sorted[0].netWorth).toBe(300);
  });

  it("sorts by cash ascending", () => {
    const sorted = sortPortfolios(rows, "cash", "asc");
    expect(sorted[0].cash).toBe(50);
  });

  it("does not mutate the input array", () => {
    const original = [...rows];
    sortPortfolios(rows, "netWorth", "desc");
    expect(rows).toEqual(original);
  });
});
