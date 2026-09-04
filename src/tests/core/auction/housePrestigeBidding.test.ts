import { describe, it, expect } from "vitest";
import { calculateLotValuation, calculateNpcBid } from "@/core/auction/engine";
import { createRng } from "@/core/common/rng";
import { AUCTION_HOUSE_BY_ID, housePrestigeMultiplier } from "@/core/prestige";
import type { Horse, Stable } from "@/game/types";
import type { StaffRole } from "@/core/staff/staffTypes";
import { createTestHorse } from "@/tests/helpers";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({ id: "h1", name: "Prestige Test", age: 1, gender: "colt", ...overrides });
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
    owner: "Owner",
    tier: "mid",
    reputation: 75,
    founded: 1,
    cash: 50_000_000,
    horses: [],
    isMajor: true,
    colors: { primary: "#000", secondary: "#fff" },
    country: "USA",
    personality: "developer",
    staff,
    outposts: [],
    ...overrides,
  };
}

const TOP = AUCTION_HOUSE_BY_ID["house-crownhill"]!;
const BOTTOM = AUCTION_HOUSE_BY_ID["house-drover"]!;

describe("house prestige scales NPC bidding ceilings", () => {
  it("top house lifts the multiplier above 1 and bottom house below 1", () => {
    expect(housePrestigeMultiplier(TOP)).toBeGreaterThan(1);
    expect(housePrestigeMultiplier(BOTTOM)).toBeLessThan(1);
    expect(housePrestigeMultiplier(undefined)).toBe(1);
  });

  it("a bid just above the base ceiling survives at a prestige house but not a bargain house", () => {
    const horse = mkHorse();
    const stable = mkStable();
    const ceiling = calculateLotValuation(horse, stable, "yearling");
    // Sit just under the base ceiling: only the prestige uplift can keep bidding alive.
    const currentBid = Math.round(ceiling * 0.97);

    const atTop = calculateNpcBid(
      stable,
      horse,
      currentBid,
      "yearling",
      createRng(7),
      undefined,
      undefined,
      undefined,
      undefined,
      TOP,
    );
    const atBottom = calculateNpcBid(
      stable,
      horse,
      currentBid,
      "yearling",
      createRng(7),
      undefined,
      undefined,
      undefined,
      undefined,
      BOTTOM,
    );

    expect(atTop).not.toBeNull();
    expect(atBottom).toBeNull();
  });

  it("hammer prices at a prestige house are never below the bargain house for the same lot", () => {
    const horse = mkHorse();
    const stable = mkStable();
    const ceiling = calculateLotValuation(horse, stable, "yearling");

    for (const frac of [0, 0.25, 0.5, 0.75]) {
      const currentBid = Math.round(ceiling * frac);
      const top = calculateNpcBid(
        stable,
        horse,
        currentBid,
        "yearling",
        createRng(11),
        undefined,
        undefined,
        undefined,
        undefined,
        TOP,
      );
      const bottom = calculateNpcBid(
        stable,
        horse,
        currentBid,
        "yearling",
        createRng(11),
        undefined,
        undefined,
        undefined,
        undefined,
        BOTTOM,
      );
      if (bottom !== null) expect(top).not.toBeNull();
      if (top !== null && bottom !== null) expect(top).toBeGreaterThanOrEqual(bottom);
    }
  });
});
