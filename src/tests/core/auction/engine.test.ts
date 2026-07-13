import { describe, it, expect } from "vitest";
import { isLotEligible } from "@/core/auction/engine";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

describe("isLotEligible", () => {
  it("rejects horses that do not match the eligible age for the sale kind", () => {
    expect(isLotEligible(createTestHorse({ age: 0 }), "weanling")).toBe(true);
    expect(isLotEligible(createTestHorse({ age: 1 }), "weanling")).toBe(false);

    expect(isLotEligible(createTestHorse({ age: 1 }), "yearling")).toBe(true);
    expect(isLotEligible(createTestHorse({ age: 2 }), "yearling")).toBe(true);
    expect(isLotEligible(createTestHorse({ age: 3 }), "yearling")).toBe(false);
  });

  it("rejects horses that do not match the required hemisphere for the sale kind", () => {
    expect(
      isLotEligible(createTestHorse({ age: 0, hemisphere: "Southern" }), "weanling_south"),
    ).toBe(true);
    expect(
      isLotEligible(createTestHorse({ age: 0, hemisphere: "Northern" }), "weanling_south"),
    ).toBe(false);
  });

  it("applies broodmare specific rules (only mares/fillies, boundary ages)", () => {
    expect(isLotEligible(createTestHorse({ age: 5, gender: "mare" }), "broodmare")).toBe(true);
    expect(isLotEligible(createTestHorse({ age: 5, gender: "filly" }), "broodmare")).toBe(true);
    expect(isLotEligible(createTestHorse({ age: 5, gender: "horse" }), "broodmare")).toBe(false);
    expect(isLotEligible(createTestHorse({ age: 5, gender: "colt" }), "broodmare")).toBe(false);

    // Boundary ages: ELIGIBLE_AGES_BY_KIND.broodmare = [4..20]
    expect(isLotEligible(createTestHorse({ age: 3, gender: "mare" }), "broodmare")).toBe(false);
    expect(isLotEligible(createTestHorse({ age: 4, gender: "mare" }), "broodmare")).toBe(true);
    expect(isLotEligible(createTestHorse({ age: 20, gender: "mare" }), "broodmare")).toBe(true);
    expect(isLotEligible(createTestHorse({ age: 21, gender: "mare" }), "broodmare")).toBe(false);
  });

  it("applies racing_age specific rules (no mares, must be racingViable, boundary ages)", () => {
    // ELIGIBLE_AGES_BY_KIND.racing_age = [3..7]
    expect(
      isLotEligible(createTestHorse({ age: 4, gender: "colt", racingViable: true }), "racing_age"),
    ).toBe(true);
    expect(
      isLotEligible(createTestHorse({ age: 4, gender: "horse", racingViable: true }), "racing_age"),
    ).toBe(true);
    expect(
      isLotEligible(createTestHorse({ age: 4, gender: "filly", racingViable: true }), "racing_age"),
    ).toBe(true);
    expect(
      isLotEligible(createTestHorse({ age: 4, gender: "mare", racingViable: true }), "racing_age"),
    ).toBe(false);
    expect(
      isLotEligible(createTestHorse({ age: 4, gender: "colt", racingViable: false }), "racing_age"),
    ).toBe(false);

    // Boundary ages
    expect(
      isLotEligible(createTestHorse({ age: 2, gender: "colt", racingViable: true }), "racing_age"),
    ).toBe(false);
    expect(
      isLotEligible(createTestHorse({ age: 3, gender: "colt", racingViable: true }), "racing_age"),
    ).toBe(true);
    expect(
      isLotEligible(createTestHorse({ age: 7, gender: "colt", racingViable: true }), "racing_age"),
    ).toBe(true);
    expect(
      isLotEligible(createTestHorse({ age: 8, gender: "colt", racingViable: true }), "racing_age"),
    ).toBe(false);
  });

  it("applies 2yo_training specific rules (must be racingViable)", () => {
    expect(isLotEligible(createTestHorse({ age: 2, racingViable: true }), "2yo_training")).toBe(
      true,
    );
    expect(isLotEligible(createTestHorse({ age: 2, racingViable: false }), "2yo_training")).toBe(
      false,
    );
  });
});
