import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import { horseMarketValue, horseCareerValuation } from "@/core/horse/pricing";
import { DEFAULT_PLAYER_RESERVE_RATIO } from "@/constants";
import {
  createTestHorse,
  createTestColt,
  createTestStallion,
  createTestMare,
  createTestGelding,
  createTestFilly,
} from "@/tests/helpers/createTestHorse";
import type { Horse, AuctionSale } from "@/game/types";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

function mkSale(overrides: Partial<AuctionSale> = {}): AuctionSale {
  return {
    id: "sale1",
    name: "Test Sale",
    day: 10,
    kind: "yearling",
    lots: [],
    resolved: false,
    ...overrides,
  };
}

function seedStore(horses: Horse[], overrides: Record<string, unknown> = {}) {
  const horseRecord: Record<string, Horse> = {};
  for (const h of horses) horseRecord[h.id] = h;
  useGame.setState({
    ...createDefaultGameState(),
    horses: horseRecord,
    auctions: [mkSale()],
    pendingIntents: [],
    ...overrides,
  } as any);
}

function getLastConsignmentIntent() {
  const intents = useGame.getState().pendingIntents ?? [];
  const consignment = intents.find((i: any) => i.type === "consignment");
  if (!consignment) throw new Error("No consignment intent found in pendingIntents");
  return consignment as any;
}

describe("auctionSlice consignHorse — valuation & reserve behavior", () => {
  beforeEach(() => {
    useGame.setState({ ...createDefaultGameState(), pendingIntents: [] } as any);
  });

  // ---------------------------------------------------------------------------
  // 1: Yearling colt default reserve
  // ---------------------------------------------------------------------------
  it("yearling colt (age 1) default reserve ≈ horseMarketValue * 0.7", () => {
    const horse = createTestColt({ id: "h1", age: 1, ownership: makePlayerOwned() });
    seedStore([horse]);

    const expectedBase = horseMarketValue(horse, [horse]);
    const expectedReserve = Math.round(expectedBase * DEFAULT_PLAYER_RESERVE_RATIO);

    const result = useGame.getState().consignHorse("h1", "sale1");
    expect(result.ok).toBe(true);

    const intent = getLastConsignmentIntent();
    expect(intent.reservePrice).toBe(expectedReserve);
  });

  // ---------------------------------------------------------------------------
  // 2: Racing-age stallion at stud — reserve reflects stud capitalization
  // ---------------------------------------------------------------------------
  it("racing-age stallion at stud has reserve reflecting breeding value", () => {
    const stallion = createTestStallion({
      id: "h1",
      age: 5,
      ownership: makePlayerOwned(),
      stud: {
        atStud: true,
        standingFee: 50000,
        lifetimeStakesFoals: 10,
        lifetimeG1Foals: 2,
        bookSize: 120,
        seasonBookings: 100,
        lifetimeFoals: 200,
      },
    });
    seedStore([stallion]);

    const expectedBase = horseMarketValue(stallion, [stallion]);
    const expectedReserve = Math.round(expectedBase * DEFAULT_PLAYER_RESERVE_RATIO);

    const result = useGame.getState().consignHorse("h1", "sale1");
    expect(result.ok).toBe(true);

    const intent = getLastConsignmentIntent();
    expect(intent.reservePrice).toBe(expectedReserve);
    // Stallion at stud should have a higher base value than a plain stallion
    const plainStallion = createTestStallion({ age: 5 });
    expect(expectedBase).toBeGreaterThan(horseMarketValue(plainStallion, [plainStallion]));
  });

  // ---------------------------------------------------------------------------
  // 3: Gelding — reserve is purely racing-based (no breeding value)
  // ---------------------------------------------------------------------------
  it("gelding reserve is purely racing-based (breeding value = 0)", () => {
    const gelding = createTestGelding({ id: "h1", age: 5, ownership: makePlayerOwned() });
    seedStore([gelding]);

    const valuation = horseCareerValuation(gelding, [gelding]);
    expect(valuation.breeding).toBe(0);
    expect(valuation.postCareer).toBe(Math.round((valuation.racing * 0.1) / 100) * 100);

    const expectedBase = horseMarketValue(gelding, [gelding]);
    const expectedReserve = Math.round(expectedBase * DEFAULT_PLAYER_RESERVE_RATIO);

    const result = useGame.getState().consignHorse("h1", "sale1");
    expect(result.ok).toBe(true);

    const intent = getLastConsignmentIntent();
    expect(intent.reservePrice).toBe(expectedReserve);
  });

  // ---------------------------------------------------------------------------
  // 4: Retired mare with blue-hen status — reserve is breeding-dominant
  // ---------------------------------------------------------------------------
  it("retired mare with blue-hen status has breeding-dominant reserve", () => {
    const mare = createTestMare({
      id: "h1",
      age: 8,
      ownership: makePlayerOwned(),
      lifecycleStatus: "retired",
      racingViable: false,
      isBlueHen: true,
      blueHenStatus: {
        isBlueHen: true,
        stakesWinnersProduced: 5,
        group1WinnersProduced: 2,
        blueHenScore: 80,
        foalsProduced: 10,
      },
    });
    seedStore([mare]);

    const valuation = horseCareerValuation(mare, [mare]);
    // For retired mares, breeding should dominate current value
    expect(valuation.breeding).toBeGreaterThan(valuation.racing);

    const expectedBase = horseMarketValue(mare, [mare]);
    const expectedReserve = Math.round(expectedBase * DEFAULT_PLAYER_RESERVE_RATIO);

    const result = useGame.getState().consignHorse("h1", "sale1");
    expect(result.ok).toBe(true);

    const intent = getLastConsignmentIntent();
    expect(intent.reservePrice).toBe(expectedReserve);
  });

  // ---------------------------------------------------------------------------
  // 5: Explicit reserve override
  // ---------------------------------------------------------------------------
  it("explicit reservePrice override is used instead of default", () => {
    const horse = createTestColt({ id: "h1", age: 3, ownership: makePlayerOwned() });
    seedStore([horse]);

    const explicitReserve = 99999;
    const result = useGame.getState().consignHorse("h1", "sale1", explicitReserve);
    expect(result.ok).toBe(true);

    const intent = getLastConsignmentIntent();
    expect(intent.reservePrice).toBe(explicitReserve);
  });

  // ---------------------------------------------------------------------------
  // 6: Already-consigned horse
  // ---------------------------------------------------------------------------
  it("already-consigned horse returns error", () => {
    const horse = createTestColt({
      id: "h1",
      age: 3,
      ownership: makePlayerOwned(),
      consignedSaleId: "other-sale",
    });
    seedStore([horse]);

    const result = useGame.getState().consignHorse("h1", "sale1");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("Already consigned");
  });

  // ---------------------------------------------------------------------------
  // 7: Resolved sale
  // ---------------------------------------------------------------------------
  it("resolved sale returns error", () => {
    const horse = createTestColt({ id: "h1", age: 3, ownership: makePlayerOwned() });
    seedStore([horse], { auctions: [mkSale({ resolved: true })] });

    const result = useGame.getState().consignHorse("h1", "sale1");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("already resolved");
  });

  // ---------------------------------------------------------------------------
  // 8: Non-owned horse
  // ---------------------------------------------------------------------------
  it("non-owned horse returns error", () => {
    const horse = createTestColt({ id: "h1", age: 3, ownership: makeUnowned() });
    seedStore([horse]);

    const result = useGame.getState().consignHorse("h1", "sale1");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("don't own");
  });

  // ---------------------------------------------------------------------------
  // 9: Missing sale
  // ---------------------------------------------------------------------------
  it("missing sale returns error", () => {
    const horse = createTestColt({ id: "h1", age: 3, ownership: makePlayerOwned() });
    seedStore([horse], { auctions: [] });

    const result = useGame.getState().consignHorse("h1", "no-such-sale");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("Sale not found");
  });

  // ---------------------------------------------------------------------------
  // 10: Withdraw consignment enqueues withdrawal intent
  // ---------------------------------------------------------------------------
  it("withdrawConsignment enqueues consignment_withdrawal intent", () => {
    const horse = createTestColt({
      id: "h1",
      age: 3,
      ownership: makePlayerOwned(),
      consignedSaleId: "sale1",
    });
    seedStore([horse]);

    const result = useGame.getState().withdrawConsignment("h1");
    expect(result.ok).toBe(true);

    const intents = useGame.getState().pendingIntents ?? [];
    const withdrawal = intents.find((i: any) => i.type === "consignment_withdrawal");
    expect(withdrawal).toBeDefined();
    expect((withdrawal as any).horseId).toBe("h1");
    expect((withdrawal as any).saleId).toBe("sale1");
  });

  // ---------------------------------------------------------------------------
  // 11: Verify reserve across genders uses horseCareerValuation.current
  // ---------------------------------------------------------------------------
  it("reserve for all genders equals round(horseMarketValue * 0.7)", () => {
    const horses = [
      createTestColt({ id: "colt1", age: 1, ownership: makePlayerOwned() }),
      createTestStallion({ id: "stallion1", age: 5, ownership: makePlayerOwned() }),
      createTestMare({ id: "mare1", age: 6, ownership: makePlayerOwned() }),
      createTestGelding({ id: "gelding1", age: 4, ownership: makePlayerOwned() }),
    ];

    for (const horse of horses) {
      seedStore([horse]);
      const expectedBase = horseMarketValue(horse, [horse]);
      const expectedReserve = Math.round(expectedBase * DEFAULT_PLAYER_RESERVE_RATIO);

      const result = useGame.getState().consignHorse(horse.id, "sale1");
      expect(result.ok).toBe(true);

      const intent = getLastConsignmentIntent();
      expect(intent.reservePrice).toBe(expectedReserve);

      // Clear for next iteration
      useGame.setState({ pendingIntents: [] } as any);
    }
  });

  // ---------------------------------------------------------------------------
  // 12: Filly (age 3) default reserve
  // ---------------------------------------------------------------------------
  it("filly (age 3) default reserve ≈ horseMarketValue * 0.7", () => {
    const filly = createTestFilly({ id: "h1", age: 3, ownership: makePlayerOwned() });
    seedStore([filly]);

    const expectedBase = horseMarketValue(filly, [filly]);
    const expectedReserve = Math.round(expectedBase * DEFAULT_PLAYER_RESERVE_RATIO);

    const result = useGame.getState().consignHorse("h1", "sale1");
    expect(result.ok).toBe(true);

    const intent = getLastConsignmentIntent();
    expect(intent.reservePrice).toBe(expectedReserve);
  });

  // ---------------------------------------------------------------------------
  // 13: Older active stallion (age 8) reserve
  // ---------------------------------------------------------------------------
  it("older active stallion (age 8) default reserve ≈ horseMarketValue * 0.7", () => {
    const stallion = createTestStallion({ id: "h1", age: 8, ownership: makePlayerOwned() });
    seedStore([stallion]);

    const expectedBase = horseMarketValue(stallion, [stallion]);
    const expectedReserve = Math.round(expectedBase * DEFAULT_PLAYER_RESERVE_RATIO);

    const result = useGame.getState().consignHorse("h1", "sale1");
    expect(result.ok).toBe(true);

    const intent = getLastConsignmentIntent();
    expect(intent.reservePrice).toBe(expectedReserve);
  });

  // ---------------------------------------------------------------------------
  // 14: Retired stallion at stud reserve
  // ---------------------------------------------------------------------------
  it("retired stallion at stud default reserve ≈ horseMarketValue * 0.7", () => {
    const stallion = createTestStallion({
      id: "h1",
      age: 10,
      ownership: makePlayerOwned(),
      lifecycleStatus: "retired",
      racingViable: false,
      stud: {
        atStud: true,
        standingFee: 100000,
        bookSize: 120,
        seasonBookings: 0,
        lifetimeFoals: 50,
        lifetimeStakesFoals: 10,
        lifetimeG1Foals: 3,
      },
    });
    seedStore([stallion]);

    const expectedBase = horseMarketValue(stallion, [stallion]);
    const expectedReserve = Math.round(expectedBase * DEFAULT_PLAYER_RESERVE_RATIO);

    const result = useGame.getState().consignHorse("h1", "sale1");
    expect(result.ok).toBe(true);

    const intent = getLastConsignmentIntent();
    expect(intent.reservePrice).toBe(expectedReserve);

    // Retired stallion at stud should have higher base value than a plain retired stallion
    const plainRetired = createTestStallion({
      age: 10,
      lifecycleStatus: "retired",
      racingViable: false,
    });
    expect(expectedBase).toBeGreaterThan(horseMarketValue(plainRetired, [plainRetired]));
  });

  // ---------------------------------------------------------------------------
  // 15: horseCareerValuation.current === horseMarketValue for all genders
  // ---------------------------------------------------------------------------
  it("horseCareerValuation.current equals horseMarketValue for all genders", () => {
    const horses = [
      createTestColt({ id: "colt1", age: 1, ownership: makePlayerOwned() }),
      createTestFilly({ id: "filly1", age: 3, ownership: makePlayerOwned() }),
      createTestStallion({ id: "stallion1", age: 5, ownership: makePlayerOwned() }),
      createTestMare({ id: "mare1", age: 6, ownership: makePlayerOwned() }),
      createTestGelding({ id: "gelding1", age: 4, ownership: makePlayerOwned() }),
    ];

    for (const horse of horses) {
      const valuation = horseCareerValuation(horse, [horse]);
      const marketValue = horseMarketValue(horse, [horse]);
      expect(valuation.current).toBe(marketValue);
    }
  });

  // ---------------------------------------------------------------------------
  // 16: High fan count produces higher reserve than fanCount 0
  // ---------------------------------------------------------------------------
  it("horseMarketValue with high fanCount produces higher reserve than with fanCount 0", () => {
    const h0 = createTestColt({
      id: "h-fan-0",
      age: 3,
      ownership: makePlayerOwned(),
      fanCount: 0,
    });
    const hHigh = createTestColt({
      id: "h-fan-high",
      age: 3,
      ownership: makePlayerOwned(),
      fanCount: 100000,
    });

    const val0 = horseMarketValue(h0, [h0]);
    const valHigh = horseMarketValue(hHigh, [hHigh]);

    expect(valHigh).toBeGreaterThan(val0);
  });

  // ---------------------------------------------------------------------------
  // 17: horseCareerValuation.current with high fanCount produces higher value
  // ---------------------------------------------------------------------------
  it("horseCareerValuation.current with high fanCount produces higher value", () => {
    const h0 = createTestColt({ id: "h-cv-0", age: 3, ownership: makePlayerOwned(), fanCount: 0 });
    const hHigh = createTestColt({
      id: "h-cv-high",
      age: 3,
      ownership: makePlayerOwned(),
      fanCount: 100000,
    });

    const cv0 = horseCareerValuation(h0, [h0]);
    const cvHigh = horseCareerValuation(hHigh, [hHigh]);

    expect(cvHigh.current).toBeGreaterThan(cv0.current);
  });
});
