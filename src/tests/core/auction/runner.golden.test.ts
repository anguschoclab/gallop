import { describe, it, expect } from "vitest";
import { createAuctionRunner } from "@/core/auction/runner";
import type { AuctionSale, AuctionLot, Horse, Stable } from "@/game/types";
import type { StaffRole } from "@/core/staff/staffTypes";
import { createTestHorse } from "@/tests/helpers";
import { makeNpcOwned } from "@/core/horse/ownership";

const PERSONALITIES: Stable["personality"][] = [
  "aggressive",
  "conservative",
  "developer",
  "win-now",
  "specialist",
  "breeder",
  "trader",
  "prestige",
];

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "h0",
    name: "Horse",
    age: 1,
    gender: "colt",
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
    id: "s0",
    name: "Stable",
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

/**
 * Regression guard for the hot-path auction optimization: memoizing the
 * per-(stable, horse) valuation must not change any observable outcome —
 * hammer prices, winners, pass flags, or bid history — bit for bit.
 * The snapshot was captured from the unoptimized runner.
 */
describe("createAuctionRunner golden outcomes", () => {
  const horses = [
    mkHorse({
      id: "h1",
      name: "Alpha",
      age: 1,
      gender: "colt",
      ownership: makeNpcOwned("consignor1" as Stable["id"]),
      stats: {
        speed: 70,
        stamina: 65,
        acceleration: 72,
        consistency: 60,
        conformation: 55,
        temperament: 58,
      },
      pedigree: { name: "Alpha", generation: 0, sireId: "sire1", damId: "dam1" },
    }),
    mkHorse({
      id: "h2",
      name: "Beta",
      age: 2,
      gender: "filly",
      ownership: makeNpcOwned("consignor1" as Stable["id"]),
      stats: {
        speed: 55,
        stamina: 80,
        acceleration: 50,
        consistency: 75,
        conformation: 92,
        temperament: 45,
      },
      blueHenStatus: {
        isBlueHen: true,
        blueHenScore: 80,
        stakesWinnersProduced: 2,
        group1WinnersProduced: 1,
        foalsProduced: 6,
      },
    }),
    mkHorse({
      id: "h3",
      name: "Gamma",
      age: 1,
      gender: "colt",
      ownership: makeNpcOwned("consignor2" as Stable["id"]),
      stats: {
        speed: 40,
        stamina: 45,
        acceleration: 38,
        consistency: 42,
        conformation: 40,
        temperament: 40,
      },
    }),
    // A broke-consignor horse and a high-fame horse for more variety
    mkHorse({
      id: "h4",
      name: "Delta",
      age: 3,
      gender: "filly",
      fame: 80,
      fanCount: 50000,
      racingViable: true,
      ownership: makeNpcOwned("consignor2" as Stable["id"]),
      stats: {
        speed: 85,
        stamina: 82,
        acceleration: 80,
        consistency: 88,
        conformation: 78,
        temperament: 90,
      },
    }),
    mkHorse({ id: "sire1", name: "Sire", age: 8, gender: "horse" }),
    mkHorse({ id: "dam1", name: "Dam", age: 7, gender: "mare" }),
  ];

  const stables = PERSONALITIES.map((p, i) =>
    mkStable({
      id: `stable_${p}`,
      name: `${p} Stables`,
      personality: p,
      cash: 250000 + i * 150000,
      preferredDistance: 1200 + i * 200,
    }),
  );
  stables.push(
    mkStable({ id: "consignor1", name: "Consignor One", cash: 400000 }),
    mkStable({ id: "consignor2", name: "Consignor Two", cash: 300000 }),
    // A stable too broke to bid anything — must still be scanned.
    mkStable({ id: "stable_broke", name: "Broke", cash: 10, personality: "aggressive" }),
  );

  function saleOf(lots: AuctionLot[]): AuctionSale {
    return {
      id: "golden-sale",
      name: "Golden Sale",
      day: 44,
      kind: "mixed",
      lots,
      resolved: false,
    };
  }

  it("produces identical final lots (hammer, winner, pass, bid history)", () => {
    const lots: AuctionLot[] = [
      {
        id: "lot1",
        horseId: "h1",
        consignorStableId: "consignor1",
        saleId: "golden-sale",
        reservePrice: 500,
        passed: false,
        withdrawn: false,
      },
      {
        id: "lot2",
        horseId: "h2",
        consignorStableId: "consignor1",
        saleId: "golden-sale",
        reservePrice: 500,
        passed: false,
        withdrawn: false,
      },
      {
        id: "lot3",
        horseId: "h3",
        consignorStableId: "consignor2",
        saleId: "golden-sale",
        reservePrice: 99999999, // reserve never met
        passed: false,
        withdrawn: false,
      },
      {
        id: "lot4",
        horseId: "h4",
        consignorStableId: "consignor2",
        saleId: "golden-sale",
        reservePrice: 1000,
        passed: false,
        withdrawn: false,
      },
      {
        id: "lot5",
        horseId: "h1",
        consignorStableId: "consignor1",
        saleId: "golden-sale",
        reservePrice: 600,
        passed: false,
        withdrawn: true, // skipped entirely
      },
    ];

    const runner = createAuctionRunner(saleOf(lots), stables, horses);
    const events = runner.runToCompletion();
    const finalLots = runner.finalLots();
    const impacts = runner.finalImpacts({ day: 44, phase: "auctions" });

    expect(
      finalLots.map((l) => ({
        id: l.id,
        hammerPrice: l.hammerPrice ?? null,
        soldTo: l.soldToStableId ?? null,
        passed: l.passed ?? null,
        bids: l.bidHistory ?? [],
      })),
    ).toMatchSnapshot();

    expect(events.map((e) => e.type)).toMatchSnapshot();
    expect(impacts.map((i) => i.type)).toMatchSnapshot();
  });

  it("repeats identical outcomes on a second identical run", () => {
    const mk = () =>
      [
        {
          id: "lotA",
          horseId: "h1",
          consignorStableId: "consignor1",
          saleId: "golden-sale",
          reservePrice: 500,
          passed: false,
          withdrawn: false,
        },
        {
          id: "lotB",
          horseId: "h2",
          consignorStableId: "consignor1",
          saleId: "golden-sale",
          reservePrice: 500,
          passed: false,
          withdrawn: false,
        },
      ] as AuctionLot[];

    const r1 = createAuctionRunner(saleOf(mk()), stables, horses);
    r1.runToCompletion();
    const r2 = createAuctionRunner(saleOf(mk()), stables, horses);
    r2.runToCompletion();
    expect(r1.finalLots()).toEqual(r2.finalLots());
  });
});
