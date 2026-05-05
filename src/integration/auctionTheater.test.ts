import { describe, it, expect } from "vitest";
import { createAuctionRunner, nextBidAmount } from "@/game/auctionRunner";
import { createRng } from "@/game/rng";
import type { AuctionSale, AuctionLot, Horse, Stable } from "@/game/types";

describe("auctionTheater integration", () => {
  function mkHorse(overrides: Partial<Horse> = {}): Horse {
    return {
      id: "h1",
      name: "Test Horse",
      age: 1,
      gender: "colt",
      hemisphere: "Northern",
      silk: "#aabbcc",
      stats: { speed: 60, stamina: 60, acceleration: 60, consistency: 60 },
      genotype: {
        color: { extension: [1, 1], agouti: [1, 1], gray: [1, 1], cream: [1, 1] },
        stats: {
          speed: [
            [1, 1],
            [1, 1],
          ],
          stamina: [
            [1, 1],
            [1, 1],
          ],
          acceleration: [
            [1, 1],
            [1, 1],
          ],
          consistency: [
            [1, 1],
            [1, 1],
          ],
        },
        preferences: { distance: [1, 1], surface: [1, 1], climbing: [1, 1], cornering: [1, 1] },
        style: [1, 1],
        mental: [1, 1],
        physical: [1, 1],
        durability: [1, 1],
        size: [1, 1],
        markers: {
          leopardComplex: "recessive",
          csnbRisk: "low",
          sensoryPerception: "good",
          signalTransduction: "good",
          immunity: "good",
          geneticDiversity: 0.8,
          lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
        },
        heart: [
          [1, 1],
          [1, 1],
        ],
        fiberType: [1, 1],
        stride: [1, 1],
        trackBias: [1, 1],
        mudAptitude: [1, 1],
        trainability: [1, 1],
        peakAge: [1, 1],
        recovery: [1, 1],
        fertility: [1, 1],
        foalingEase: [1, 1],
        markings: {
          socks: [1, 1],
          face: [1, 1],
          silverDapple: [1, 1],
          sabino: [1, 1],
          splashWhite: [1, 1],
        },
        health: { bleeder: [1, 1], roarer: [1, 1], ocd: [1, 1], efna5: [1, 1] },
      },
      energy: 100,
      form: 0,
      potential: 70,
      raceHistory: [],
      owned: false,
      fame: 0,
      distanceAptitude: 1600,
      surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
      climbingAptitude: 1.0,
      corneringAptitude: 1.0,
      injuryProneness: 0.05,
      height: 16.0,
      weight: 500,
      lifetimeEarnings: 0,
      careerStarts: 0,
      careerWins: 0,
      heartScore: 1.0,
      fiberBias: "balanced",
      strideType: "balanced",
      trackPreference: "balanced",
      mudAptitude: 1.0,
      trainability: 1.0,
      peakAge: 4,
      recoveryRate: 1.0,
      fertility: 1.0,
      foalingEase: 1.0,
      markings: {
        socks: "none",
        face: "none",
        silverDapple: false,
        sabino: false,
        splashWhite: false,
      },
      bleederRisk: 0.05,
      roarerRisk: 0.05,
      ocdRisk: 0.05,
      racingViable: true,
      ...overrides,
    };
  }

  function mkStable(overrides: Partial<Stable> = {}): Stable {
    return {
      id: "s1",
      name: "Test Stable",
      tier: "mid",
      reputation: 75,
      founded: 1,
      cash: 500000,
      horses: [],
      isMajor: true,
      colors: { primary: "#000", secondary: "#fff" },
      country: "USA",
      personality: "aggressive",
      owner: "Owner",
      ...overrides,
    };
  }

  function mkSale(lots: AuctionLot[]): AuctionSale {
    return {
      id: "sale1",
      name: "Test Sale",
      day: 10,
      kind: "yearling",
      lots,
      resolved: false,
    };
  }

  function mkLot(overrides: Partial<AuctionLot> = {}): AuctionLot {
    return {
      id: "lot1",
      horseId: "h1",
      consignorStableId: "s2",
      saleId: "sale1",
      reservePrice: 1000,
      passed: false,
      withdrawn: false,
      ...overrides,
    };
  }

  it("runner determinism: same seed → same bid sequence", () => {
    const horse = mkHorse();
    const bidder = mkStable({ id: "bidder", cash: 1000000 });
    const consignor = mkStable({ id: "consignor" });
    const lot = mkLot({ horseId: horse.id, consignorStableId: consignor.id });
    const sale = mkSale([lot]);

    const seed = 12345;
    const runner1 = createAuctionRunner(sale, [bidder, consignor], [horse], seed, {
      liveMode: true,
    });
    const runner2 = createAuctionRunner(sale, [bidder, consignor], [horse], seed, {
      liveMode: true,
    });

    // Run both to completion
    const events1 = runner1.runToCompletion();
    const events2 = runner2.runToCompletion();

    // Same seed should produce identical event sequences
    expect(events1.length).toBe(events2.length);
    expect(events1).toEqual(events2);
  });

  it("attended vs offline parity: same outcomes", () => {
    const horse = mkHorse({ stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 } });
    const bidder = mkStable({ id: "bidder", cash: 5000000 });
    const consignor = mkStable({ id: "consignor" });
    const lot = mkLot({ horseId: horse.id, consignorStableId: consignor.id });
    const sale = mkSale([lot]);

    const seed = 54321;

    // Live mode (attended)
    const liveRunner = createAuctionRunner(sale, [bidder, consignor], [horse], seed, {
      liveMode: true,
    });
    liveRunner.runToCompletion();
    const liveLots = liveRunner.finalLots();

    // Offline mode (unattended)
    const offlineRunner = createAuctionRunner(sale, [bidder, consignor], [horse], seed, {
      liveMode: false,
    });
    offlineRunner.runToCompletion();
    const offlineLots = offlineRunner.finalLots();

    // Both should produce identical final lots
    expect(liveLots.length).toBe(offlineLots.length);
    expect(liveLots[0].hammerPrice).toBe(offlineLots[0].hammerPrice);
    expect(liveLots[0].soldToStableId).toBe(offlineLots[0].soldToStableId);
    expect(liveLots[0].passed).toBe(offlineLots[0].passed);
  });

  it("player bid integration: bid is accepted when valid", () => {
    const horse = mkHorse({
      stats: { speed: 40, stamina: 40, acceleration: 40, consistency: 40 },
      potential: 50,
    });
    const bidder = mkStable({ id: "bidder" });
    const consignor = mkStable({ id: "consignor" });
    const lot = mkLot({ horseId: horse.id, consignorStableId: consignor.id });
    const sale = mkSale([lot]);

    const runner = createAuctionRunner(sale, [bidder, consignor], [horse], Date.now(), {
      liveMode: true,
    });

    // Step to open the lot first
    runner.step();

    // Place a player bid
    const result = runner.step(5000);

    expect(result.done).toBe(false);
    const lotState = runner.currentLot();
    // The bid should be at least the player's bid amount
    expect(lotState?.currentBid).toBeGreaterThanOrEqual(5000);
  });

  it("nextBidAmount computes correct increment", () => {
    expect(nextBidAmount(0)).toBe(200); // 0 * 1.05 + 200 = 200
    expect(nextBidAmount(1000)).toBe(1300); // 1000 * 1.05 + 200 = 1250 → rounded to 1300
    expect(nextBidAmount(10000)).toBe(10700); // 10000 * 1.05 + 200 = 10700
  });

  it("runner step advances lot index when current lot completes", () => {
    const horse1 = mkHorse({ id: "h1" });
    const horse2 = mkHorse({ id: "h2" });
    const bidder = mkStable({ id: "bidder", cash: 100000 });
    const consignor = mkStable({ id: "consignor" });
    const lot1 = mkLot({ id: "lot1", horseId: horse1.id, consignorStableId: consignor.id });
    const lot2 = mkLot({ id: "lot2", horseId: horse2.id, consignorStableId: consignor.id });
    const sale = mkSale([lot1, lot2]);

    const runner = createAuctionRunner(sale, [bidder, consignor], [horse1, horse2], Date.now(), {
      liveMode: true,
    });

    expect(runner.currentLotIndex()).toBe(0);

    // Run first lot to completion (skip by running to completion on first lot context)
    // For simplicity, just verify that the runner can handle multiple lots
    runner.runToCompletion();

    expect(runner.currentLotIndex()).toBe(2); // Should be at end
  });

  it("finalImpacts emits AuctionResolutionImpact for each lot", () => {
    const horse = mkHorse();
    const bidder = mkStable({ id: "bidder", cash: 5000000 });
    const consignor = mkStable({ id: "consignor" });
    const lot = mkLot({ horseId: horse.id, consignorStableId: consignor.id });
    const sale = mkSale([lot]);

    const runner = createAuctionRunner(sale, [bidder, consignor], [horse], Date.now(), {
      liveMode: true,
    });
    runner.runToCompletion();

    const impacts = runner.finalImpacts({ day: 10, phase: "test" });

    // Should have at least one AuctionResolutionImpact
    const auctionImpacts = impacts.filter((i) => i.type === "auction_resolution");
    expect(auctionImpacts.length).toBeGreaterThan(0);
  });
});
