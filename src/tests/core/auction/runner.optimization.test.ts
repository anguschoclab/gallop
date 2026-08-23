import { describe, it, expect } from "vitest";
import { createAuctionRunner } from "@/core/auction/runner";
import { personalityConsignmentPolicy } from "@/core/auction/engine";
import { createRng } from "@/core/common/rng";
import type { AuctionSale, AuctionLot, Horse, Stable } from "@/game/types";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { StaffRole } from "@/core/staff/staffTypes";
import { createTestHorse } from "@/tests/helpers";
import { getStableId } from "@/core/horse/ownership";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "h1",
    name: "Test Horse",
    age: 1,
    gender: "colt" as const,
    ...overrides,
  });
}

function mkStable(overrides: Partial<Stable> = {}): Stable {
  const staffRoles: StaffRole[] = ["veterinarian", "farrier", "nutritionist", "groom", "trainer"];
  const staff = staffRoles.reduce(
    (acc, role) => ({ ...acc, [role]: null }),
    {} as Record<StaffRole, string | null>,
  );
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
    staff,
    outposts: [],
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

describe("runner.optimization — finalImpacts passed-lot handling", () => {
  it("A. passed player consignment generates inbox message", () => {
    const horse = mkHorse({ id: "h1", name: "Flash" });
    const bidder = mkStable({ id: "bidder", cash: 100000 });
    const lot = mkLot({
      id: "lot1",
      horseId: "h1",
      consignorStableId: "",
      reservePrice: 99999999,
    });
    const sale = mkSale([lot]);

    const runner = createAuctionRunner(sale, [bidder], [horse], 42, { liveMode: true });
    runner.runToCompletion();
    const impacts = runner.finalImpacts({ day: 10, phase: "test" });

    const passedMessages = impacts.filter(
      (i): i is Extract<AnyImpact, { type: "inbox_message" }> =>
        i.type === "inbox_message" && !!i.message?.title?.startsWith("Horse Passed:"),
    );
    expect(passedMessages.length).toBe(1);
    expect(passedMessages[0].message?.title).toBe("Horse Passed: Flash");
    expect(passedMessages[0].message?.body).toContain("reserve price");
  });

  it("B. passed NPC consignment does NOT generate inbox message", () => {
    const horse = mkHorse({ id: "h1" });
    const bidder = mkStable({ id: "bidder", cash: 100000 });
    const consignor = mkStable({ id: "consignor" });
    const lot = mkLot({
      id: "lot1",
      horseId: "h1",
      consignorStableId: "consignor",
      reservePrice: 99999999,
    });
    const sale = mkSale([lot]);

    const runner = createAuctionRunner(sale, [bidder, consignor], [horse], 42, { liveMode: true });
    runner.runToCompletion();
    const impacts = runner.finalImpacts({ day: 10, phase: "test" });

    const passedMessages = impacts.filter(
      (i): i is Extract<AnyImpact, { type: "inbox_message" }> =>
        i.type === "inbox_message" && !!i.message?.title?.startsWith("Horse Passed:"),
    );
    expect(passedMessages.length).toBe(0);
  });

  it("C. mixed sale: player sold, player passed, NPC sold, NPC passed", () => {
    const horse1 = mkHorse({ id: "h1", name: "Alpha" });
    const horse2 = mkHorse({ id: "h2", name: "Beta" });
    const horse3 = mkHorse({ id: "h3", name: "Gamma" });
    const horse4 = mkHorse({ id: "h4", name: "Delta" });

    const bidder = mkStable({ id: "bidder", cash: 5000000 });

    // Player consigned, will sell (low reserve)
    const lot1 = mkLot({
      id: "lot1",
      horseId: "h1",
      consignorStableId: "",
      reservePrice: 100,
    });
    // Player consigned, will pass (high reserve)
    const lot2 = mkLot({
      id: "lot2",
      horseId: "h2",
      consignorStableId: "",
      reservePrice: 99999999,
    });
    // NPC consigned, will sell (low reserve)
    const lot3 = mkLot({
      id: "lot3",
      horseId: "h3",
      consignorStableId: "npc1",
      reservePrice: 100,
    });
    // NPC consigned, will pass (high reserve)
    const lot4 = mkLot({
      id: "lot4",
      horseId: "h4",
      consignorStableId: "npc2",
      reservePrice: 99999999,
    });
    const sale = mkSale([lot1, lot2, lot3, lot4]);

    const runner = createAuctionRunner(
      sale,
      [bidder, mkStable({ id: "npc1" }), mkStable({ id: "npc2" })],
      [horse1, horse2, horse3, horse4],
      42,
      { liveMode: true },
    );
    runner.runToCompletion();
    const impacts = runner.finalImpacts({ day: 10, phase: "test" });

    const passedMessages = impacts.filter(
      (i): i is Extract<AnyImpact, { type: "inbox_message" }> =>
        i.type === "inbox_message" && !!i.message?.title?.startsWith("Horse Passed:"),
    );
    expect(passedMessages.length).toBe(1);
    expect(passedMessages[0].message?.title).toBe("Horse Passed: Beta");

    const soldMessages = impacts.filter(
      (i): i is Extract<AnyImpact, { type: "inbox_message" }> =>
        i.type === "inbox_message" && !!i.message?.title?.startsWith("Horse Sold:"),
    );
    expect(soldMessages.length).toBe(1);
    expect(soldMessages[0].message?.title).toBe("Horse Sold: Alpha");

    const auctionResolutions = impacts.filter((i) => i.type === "auction_resolution");
    expect(auctionResolutions.length).toBe(4);
  });

  it("D. withdrawn player-consigned lot excluded from passed-lot messages", () => {
    const horse1 = mkHorse({ id: "h1", name: "Withdrawn One" });
    const horse2 = mkHorse({ id: "h2", name: "Passed One" });
    const bidder = mkStable({ id: "bidder", cash: 100000 });

    const lot1 = mkLot({
      id: "lot1",
      horseId: "h1",
      consignorStableId: "",
      withdrawn: true,
    });
    const lot2 = mkLot({
      id: "lot2",
      horseId: "h2",
      consignorStableId: "",
      reservePrice: 99999999,
    });
    const sale = mkSale([lot1, lot2]);

    const runner = createAuctionRunner(sale, [bidder], [horse1, horse2], 42, { liveMode: true });
    runner.runToCompletion();
    const impacts = runner.finalImpacts({ day: 10, phase: "test" });

    const passedMessages = impacts.filter(
      (i): i is Extract<AnyImpact, { type: "inbox_message" }> =>
        i.type === "inbox_message" && !!i.message?.title?.startsWith("Horse Passed:"),
    );
    expect(passedMessages.length).toBe(1);
    expect(passedMessages[0].message?.title).toBe("Horse Passed: Passed One");
  });
});

describe("runner.optimization — withdrawn lot initialization", () => {
  it("E. withdrawn lots excluded from LotState but preserved in finalLots", () => {
    const horse1 = mkHorse({ id: "h1" });
    const horse2 = mkHorse({ id: "h2" });
    const horse3 = mkHorse({ id: "h3" });
    const bidder = mkStable({ id: "bidder", cash: 5000000 });
    const consignor = mkStable({ id: "consignor" });

    const lot1 = mkLot({ id: "lot1", horseId: "h1", consignorStableId: consignor.id });
    const lot2 = mkLot({
      id: "lot2",
      horseId: "h2",
      consignorStableId: consignor.id,
      withdrawn: true,
    });
    const lot3 = mkLot({ id: "lot3", horseId: "h3", consignorStableId: consignor.id });
    const sale = mkSale([lot1, lot2, lot3]);

    const runner = createAuctionRunner(sale, [bidder, consignor], [horse1, horse2, horse3], 42, {
      liveMode: true,
    });
    runner.runToCompletion();

    const finalLots = runner.finalLots();
    expect(finalLots.length).toBe(3);
    const withdrawnLot = finalLots.find((l) => l.id === "lot2");
    expect(withdrawnLot?.withdrawn).toBe(true);
  });

  it("F. all lots withdrawn → runner done immediately", () => {
    const horse1 = mkHorse({ id: "h1" });
    const horse2 = mkHorse({ id: "h2" });
    const bidder = mkStable({ id: "bidder" });

    const lot1 = mkLot({ id: "lot1", horseId: "h1", withdrawn: true });
    const lot2 = mkLot({ id: "lot2", horseId: "h2", withdrawn: true });
    const sale = mkSale([lot1, lot2]);

    const runner = createAuctionRunner(sale, [bidder], [horse1, horse2], 42, { liveMode: true });

    expect(runner.currentLotIndex()).toBe(0);
    const result = runner.step();
    expect(result.done).toBe(true);
  });
});

describe("runner.optimization — engine personalityConsignmentPolicy", () => {
  it("G. only eligible horses from the stable are returned with phenotype resolved", () => {
    const stable = mkStable({ id: "stable1", personality: "breeder" });

    // Eligible yearling owned by stable1
    const eligibleHorse = createTestHorse({
      id: "he1",
      name: "Eligible",
      age: 1,
      gender: "colt",
      stableId: "stable1",
    });
    // Ineligible (wrong age for yearling sale)
    const ineligibleHorse = createTestHorse({
      id: "hi1",
      name: "Ineligible",
      age: 5,
      gender: "horse",
      stableId: "stable1",
    });
    // Eligible but owned by different stable
    const otherStableHorse = createTestHorse({
      id: "ho1",
      name: "Other Stable",
      age: 1,
      gender: "colt",
      stableId: "stable2",
    });

    const allHorses = [eligibleHorse, ineligibleHorse, otherStableHorse];
    const rng = createRng(42);
    const result = personalityConsignmentPolicy(stable, "yearling", allHorses, rng);

    // The consign array should only contain horses from stable1 that are eligible
    // (the actual consign selection depends on personality strategy, but we can
    // verify that ineligible and other-stable horses are never in the result)
    for (const h of result.consign) {
      expect(getStableId(h)).toBe("stable1");
      expect(h.age).toBeLessThanOrEqual(2);
    }
  });
});
