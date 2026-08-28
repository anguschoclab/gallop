import { describe, it, expect } from "vitest";
import {
  prestigeMultiplier,
  housePrestigeMultiplier,
  houseCommissionRate,
  racecoursePrestigeMultiplier,
  getRacecoursePrestigeByName,
  AUCTION_HOUSES,
  resolveSaleHouse,
  RACECOURSE_FLOOR_PRESTIGE,
  RACECOURSE_PRESTIGE_SPREAD,
  NEUTRAL_PRESTIGE_SCORE,
  MAX_PRESTIGE_SCORE,
  MIN_FAME_GAIN,
  HOUSE_PRESTIGE_SPREAD,
} from "@/core/prestige";
import { netProceeds, commissionAmount } from "@/core/auction/engine";
import { CONSIGNMENT_COMMISSION, FAME_GAIN_G1_WIN } from "@/constants";
import { buildAuctionImpacts } from "@/core/auction/auctionRunnerImpacts";
import type { LotState } from "@/core/auction/auctionRunnerTypes";
import type { AuctionSale, Horse } from "@/game/types";

const FLOOR_MUL = prestigeMultiplier(RACECOURSE_FLOOR_PRESTIGE, RACECOURSE_PRESTIGE_SPREAD);

const crownhill = AUCTION_HOUSES.find((h) => h.id === "house-crownhill")!;
const tattersleigh = AUCTION_HOUSES.find((h) => h.id === "house-tattersleigh")!;
const southernCross = AUCTION_HOUSES.find((h) => h.id === "house-southern-cross")!;
const droverYard = AUCTION_HOUSES.find((h) => h.id === "house-drover")!;

describe("prestige scaling — house surcharge", () => {
  it("houseCommissionRate adds Crownhill surcharge (0.02)", () => {
    expect(houseCommissionRate(0.06, crownhill)).toBe(0.08);
  });

  it("houseCommissionRate adds Tattersleigh surcharge (0.015)", () => {
    expect(houseCommissionRate(0.06, tattersleigh)).toBe(0.075);
  });

  it("houseCommissionRate adds no surcharge for Southern Cross (0)", () => {
    expect(houseCommissionRate(0.06, southernCross)).toBe(0.06);
  });

  it("houseCommissionRate returns base rate when no house", () => {
    expect(houseCommissionRate(0.06, undefined)).toBe(0.06);
  });

  it("netProceeds applies Crownhill commission (8%)", () => {
    expect(netProceeds(100000, crownhill)).toBe(92000);
  });

  it("netProceeds without house uses base rate (backward compat)", () => {
    expect(netProceeds(100000)).toBe(94000);
  });

  it("netProceeds(0, house) returns 0", () => {
    expect(netProceeds(0, crownhill)).toBe(0);
  });

  it("commissionAmount with Crownhill = 8000", () => {
    expect(commissionAmount(100000, crownhill)).toBe(8000);
  });

  it("commissionAmount without house = 6000 (backward compat)", () => {
    expect(commissionAmount(100000)).toBe(6000);
  });
});

describe("prestige scaling — reserve multiplier", () => {
  it("housePrestigeMultiplier for Crownhill (prestige 94) = 1.22", () => {
    expect(housePrestigeMultiplier(crownhill)).toBeCloseTo(1.22, 10);
  });

  it("housePrestigeMultiplier for Tattersleigh (prestige 88) = 1.19", () => {
    expect(housePrestigeMultiplier(tattersleigh)).toBeCloseTo(1.19, 10);
  });

  it("housePrestigeMultiplier for Drover Yard (prestige 28) = 0.89", () => {
    expect(housePrestigeMultiplier(droverYard)).toBeCloseTo(0.89, 10);
  });

  it("housePrestigeMultiplier for undefined = 1.0", () => {
    expect(housePrestigeMultiplier(undefined)).toBe(1);
  });

  it("base reserve 50000 at Crownhill → 61000", () => {
    expect(Math.round(50000 * housePrestigeMultiplier(crownhill))).toBe(61000);
  });

  it("base reserve 50000 at Drover Yard → 44500", () => {
    expect(Math.round(50000 * housePrestigeMultiplier(droverYard))).toBe(44500);
  });
});

describe("prestige scaling — fame multiplier", () => {
  it("unknown course returns floor multiplier", () => {
    expect(racecoursePrestigeMultiplier(undefined, "Nowhere Park")).toBeCloseTo(FLOOR_MUL, 10);
  });

  it("no track info returns floor multiplier", () => {
    expect(racecoursePrestigeMultiplier(undefined, undefined)).toBeCloseTo(FLOOR_MUL, 10);
  });

  it("top-ranked real course has multiplier > 1.0", () => {
    const topCourses = [
      racecoursePrestigeMultiplier(undefined, "Epsom Downs"),
      racecoursePrestigeMultiplier(undefined, "Ascot"),
      racecoursePrestigeMultiplier(undefined, "Churchill Downs"),
    ];
    expect(topCourses.some((m) => m > 1.0)).toBe(true);
  });

  it("G1 win base fame 20 × 1.2 (score 100) = 24", () => {
    const mul = prestigeMultiplier(MAX_PRESTIGE_SCORE, RACECOURSE_PRESTIGE_SPREAD);
    expect(Math.max(MIN_FAME_GAIN, Math.round(FAME_GAIN_G1_WIN * mul))).toBe(24);
  });

  it("G1 win base fame 20 × floor multiplier = 17", () => {
    const mul = racecoursePrestigeMultiplier(undefined, "Unknown Track");
    expect(Math.max(MIN_FAME_GAIN, Math.round(FAME_GAIN_G1_WIN * mul))).toBe(17);
  });

  it("fame gain of 1 × floor multiplier floors to min", () => {
    const mul = racecoursePrestigeMultiplier(undefined, "Unknown Track");
    expect(Math.max(MIN_FAME_GAIN, Math.round(MIN_FAME_GAIN * mul))).toBe(MIN_FAME_GAIN);
  });
});

describe("prestige scaling — cross-consistency", () => {
  it(`prestigeMultiplier(${NEUTRAL_PRESTIGE_SCORE}, any spread) = 1.0`, () => {
    expect(prestigeMultiplier(NEUTRAL_PRESTIGE_SCORE, HOUSE_PRESTIGE_SPREAD)).toBe(1);
    expect(prestigeMultiplier(NEUTRAL_PRESTIGE_SCORE, RACECOURSE_PRESTIGE_SPREAD)).toBe(1);
  });

  it(`prestigeMultiplier(${MAX_PRESTIGE_SCORE}, ${HOUSE_PRESTIGE_SPREAD}) = ${1 + HOUSE_PRESTIGE_SPREAD}`, () => {
    expect(prestigeMultiplier(MAX_PRESTIGE_SCORE, HOUSE_PRESTIGE_SPREAD)).toBe(1 + HOUSE_PRESTIGE_SPREAD);
  });

  it(`prestigeMultiplier(0, ${HOUSE_PRESTIGE_SPREAD}) = ${1 - HOUSE_PRESTIGE_SPREAD}`, () => {
    expect(prestigeMultiplier(0, HOUSE_PRESTIGE_SPREAD)).toBe(1 - HOUSE_PRESTIGE_SPREAD);
  });

  it(`prestigeMultiplier(${MAX_PRESTIGE_SCORE}, ${RACECOURSE_PRESTIGE_SPREAD}) = ${1 + RACECOURSE_PRESTIGE_SPREAD}`, () => {
    expect(prestigeMultiplier(MAX_PRESTIGE_SCORE, RACECOURSE_PRESTIGE_SPREAD)).toBe(1 + RACECOURSE_PRESTIGE_SPREAD);
  });

  it(`prestigeMultiplier(0, ${RACECOURSE_PRESTIGE_SPREAD}) = ${1 - RACECOURSE_PRESTIGE_SPREAD}`, () => {
    expect(prestigeMultiplier(0, RACECOURSE_PRESTIGE_SPREAD)).toBe(1 - RACECOURSE_PRESTIGE_SPREAD);
  });

  it("prestigeMultiplier clamps above max", () => {
    expect(prestigeMultiplier(150, RACECOURSE_PRESTIGE_SPREAD)).toBe(1 + RACECOURSE_PRESTIGE_SPREAD);
  });

  it("prestigeMultiplier clamps below 0", () => {
    expect(prestigeMultiplier(-10, RACECOURSE_PRESTIGE_SPREAD)).toBe(1 - RACECOURSE_PRESTIGE_SPREAD);
  });
});

describe("prestige scaling — buildAuctionImpacts integration", () => {
  it("player consignment at yearling sale applies Crownhill surcharge", () => {
    const playerHorse: Horse = {
      id: "player-horse-1",
      name: "Test Horse",
      age: 1,
      gender: "colt",
      fame: 0,
      ownership: { type: "player" },
    } as unknown as Horse;

    const horseMap = new Map<string, Horse>([[playerHorse.id, playerHorse]]);

    const sale: AuctionSale = {
      id: "test-yearling-sale",
      name: "Test Yearling Sale",
      day: 2,
      kind: "yearling",
      lots: [],
      resolved: false,
    };

    const lotState: LotState = {
      lot: {
        id: "lot-1",
        horseId: playerHorse.id,
        consignorStableId: undefined,
        saleId: sale.id,
        reservePrice: 1000,
        hammerPrice: 100_000,
        soldToStableId: "npc-buyer-1",
        passed: false,
        withdrawn: false,
      },
      currentBid: 100_000,
      leadingBidder: "npc-buyer-1",
      bidHistory: [],
      chant: "sold",
      silentSteps: 0,
      consecutiveBidders: [],
    };

    const impacts = buildAuctionImpacts([lotState], sale, horseMap, false, 2, "auctions");

    const proceedsImpact = impacts.find(
      (i): i is Extract<typeof i, { type: "cash_change" }> =>
        i.type === "cash_change" && i.reason === "auction_proceeds_player",
    );

    expect(proceedsImpact).toBeDefined();
    expect(proceedsImpact!.amount).toBe(92_000);
  });
});
