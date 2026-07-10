import { describe, it, expect } from "vitest";
import { isLotEligible } from "@/core/auction/engine";
import type { Horse, AuctionSaleKind } from "@/game/types";

// Helper to create a dummy horse for testing
const createTestHorse = (overrides: Partial<Horse>): Horse => {
  return {
    id: "test-horse",
    name: "Test Horse",
    gender: "colt",
    age: 1,
    hemisphere: "Northern",
    racingViable: true,
    ...overrides,
  } as unknown as Horse;
};

describe("isLotEligible", () => {
  it("rejects horses that do not match the eligible age for the sale kind", () => {
    // Weanling sale allows age 0
    expect(isLotEligible(createTestHorse({ age: 0 }), "weanling")).toBe(true);
    expect(isLotEligible(createTestHorse({ age: 1 }), "weanling")).toBe(false);

    // Yearling sale allows age 1 and 2
    expect(isLotEligible(createTestHorse({ age: 1 }), "yearling")).toBe(true);
    expect(isLotEligible(createTestHorse({ age: 2 }), "yearling")).toBe(true);
    expect(isLotEligible(createTestHorse({ age: 3 }), "yearling")).toBe(false);
  });

  it("rejects horses that do not match the required hemisphere for the sale kind", () => {
    // weanling_south requires south hemisphere
    expect(
      isLotEligible(createTestHorse({ age: 0, hemisphere: "Southern" }), "weanling_south")
    ).toBe(true);
    expect(
      isLotEligible(createTestHorse({ age: 0, hemisphere: "Northern" }), "weanling_south")
    ).toBe(false);
  });

  it("applies broodmare specific rules (only mares/fillies)", () => {
    // Broodmares must be mares or fillies and within age range 4-20
    expect(isLotEligible(createTestHorse({ age: 5, gender: "mare" }), "broodmare")).toBe(true);
    expect(isLotEligible(createTestHorse({ age: 5, gender: "filly" }), "broodmare")).toBe(true);
    expect(isLotEligible(createTestHorse({ age: 5, gender: "stallion" }), "broodmare")).toBe(
      false
    );
    expect(isLotEligible(createTestHorse({ age: 5, gender: "colt" }), "broodmare")).toBe(false);
  });

  it("applies racing_age specific rules (no mares, must be racingViable)", () => {
    // Racing age allows 3-7
    expect(
      isLotEligible(
        createTestHorse({ age: 4, gender: "colt", racingViable: true }),
        "racing_age"
      )
    ).toBe(true);
    expect(
      isLotEligible(
        createTestHorse({ age: 4, gender: "stallion", racingViable: true }),
        "racing_age"
      )
    ).toBe(true);
    expect(
      isLotEligible(
        createTestHorse({ age: 4, gender: "filly", racingViable: true }),
        "racing_age"
      )
    ).toBe(true);
    expect(
      isLotEligible(
        createTestHorse({ age: 4, gender: "mare", racingViable: true }),
        "racing_age"
      )
    ).toBe(false); // mares 4+ go to broodmare
    expect(
      isLotEligible(
        createTestHorse({ age: 4, gender: "colt", racingViable: false }),
        "racing_age"
      )
    ).toBe(false); // must be racing viable
  });

  it("applies 2yo_training specific rules (must be racingViable)", () => {
    // 2yo training allows age 2
    expect(
      isLotEligible(
        createTestHorse({ age: 2, racingViable: true }),
        "2yo_training"
      )
    ).toBe(true);
    expect(
      isLotEligible(
        createTestHorse({ age: 2, racingViable: false }),
        "2yo_training"
      )
    ).toBe(false); // must be racing viable
  });
});
