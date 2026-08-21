import { describe, it, expect } from "vitest";
import { suggestBestSires } from "@/core/breeding/sireSuggestions";
import { createTestMare, createTestStallion } from "@/tests/helpers";
import { BREEDING_FEE } from "@/constants";
import type { Horse, StudCareer } from "@/game/types";

function mkStud(overrides: Partial<StudCareer> = {}): StudCareer {
  return {
    atStud: true,
    standingFee: 10000,
    previousStandingFee: undefined,
    lifetimeStakesFoals: 0,
    lifetimeG1Foals: 0,
    bookSize: 120,
    seasonBookings: 0,
    lifetimeFoals: 0,
    ...overrides,
  };
}

const day = 100;

describe("suggestBestSires", () => {
  it("returns sorted array by compatibilityScore descending", () => {
    const mare = createTestMare({ id: "mare1", name: "Mare 1" });
    const s1 = createTestStallion({
      id: "s1",
      name: "Sire A",
      stud: mkStud(),
      sireName: "Sire A Sire",
    });
    const s2 = createTestStallion({
      id: "s2",
      name: "Sire B",
      stud: mkStud(),
      sireName: "Sire B Sire",
    });
    const results = suggestBestSires(mare, [s1, s2], day);
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].compatibilityScore).toBeLessThanOrEqual(results[i - 1].compatibilityScore);
    }
  });

  it("filters out stallions with mismatched hemisphere", () => {
    const mare = createTestMare({ id: "mare1", hemisphere: "Northern" });
    const northern = createTestStallion({
      id: "s-n",
      hemisphere: "Northern",
      stud: mkStud(),
    });
    const southern = createTestStallion({
      id: "s-s",
      hemisphere: "Southern",
      stud: mkStud(),
    });
    const results = suggestBestSires(mare, [northern, southern], day);
    expect(results).toHaveLength(1);
    expect(results[0].stallion.id).toBe("s-n");
  });

  it("filters out stallions with full book", () => {
    const mare = createTestMare({ id: "mare1" });
    const available = createTestStallion({
      id: "s-avail",
      stud: mkStud({ seasonBookings: 0, bookSize: 120 }),
    });
    const full = createTestStallion({
      id: "s-full",
      stud: mkStud({ seasonBookings: 120, bookSize: 120 }),
    });
    const results = suggestBestSires(mare, [available, full], day);
    expect(results).toHaveLength(1);
    expect(results[0].stallion.id).toBe("s-avail");
  });

  it("filters out deceased stallions", () => {
    const mare = createTestMare({ id: "mare1" });
    const alive = createTestStallion({ id: "s-alive", stud: mkStud() });
    const dead = createTestStallion({
      id: "s-dead",
      stud: mkStud(),
      lifecycleStatus: "deceased",
    });
    const results = suggestBestSires(mare, [alive, dead], day);
    expect(results).toHaveLength(1);
    expect(results[0].stallion.id).toBe("s-alive");
  });

  it("filters out stallions with covering_sickness", () => {
    const mare = createTestMare({ id: "mare1" });
    const healthy = createTestStallion({ id: "s-healthy", stud: mkStud() });
    const sick = createTestStallion({
      id: "s-sick",
      stud: mkStud(),
      healthStatus: "covering_sickness",
    });
    const results = suggestBestSires(mare, [healthy, sick], day);
    expect(results).toHaveLength(1);
    expect(results[0].stallion.id).toBe("s-healthy");
  });

  it("filters out stallions not at stud", () => {
    const mare = createTestMare({ id: "mare1" });
    const atStud = createTestStallion({
      id: "s-at",
      stud: mkStud({ atStud: true }),
    });
    const notAtStud = createTestStallion({
      id: "s-not",
      stud: mkStud({ atStud: false }),
    });
    const results = suggestBestSires(mare, [atStud, notAtStud], day);
    expect(results).toHaveLength(1);
    expect(results[0].stallion.id).toBe("s-at");
  });

  it("respects limit parameter", () => {
    const mare = createTestMare({ id: "mare1" });
    const stallions = Array.from({ length: 10 }, (_, i) =>
      createTestStallion({
        id: `s${i}`,
        name: `Sire ${i}`,
        stud: mkStud(),
        sireName: `Sire ${i} Sire`,
      }),
    );
    const results = suggestBestSires(mare, stallions, day, 3);
    expect(results).toHaveLength(3);
  });

  it("defaults limit to 5", () => {
    const mare = createTestMare({ id: "mare1" });
    const stallions = Array.from({ length: 10 }, (_, i) =>
      createTestStallion({
        id: `s${i}`,
        name: `Sire ${i}`,
        stud: mkStud(),
        sireName: `Sire ${i} Sire`,
      }),
    );
    const results = suggestBestSires(mare, stallions, day);
    expect(results).toHaveLength(5);
  });

  it("returns empty array when no stallions available", () => {
    const mare = createTestMare({ id: "mare1" });
    const results = suggestBestSires(mare, [], day);
    expect(results).toEqual([]);
  });

  it("returns empty array when mare is undefined", () => {
    const stallion = createTestStallion({ id: "s1", stud: mkStud() });
    const results = suggestBestSires(undefined, [stallion], day);
    expect(results).toEqual([]);
  });

  it("calculates fee as BREEDING_FEE + standingFee for external stallions", () => {
    const mare = createTestMare({ id: "mare1" });
    const external = createTestStallion({
      id: "s-ext",
      stud: mkStud({ standingFee: 25000 }),
      stableId: "npc-stable-1",
      ownership: { type: "unowned" },
    });
    const results = suggestBestSires(mare, [external], day);
    expect(results).toHaveLength(1);
    expect(results[0].fee).toBe(BREEDING_FEE + 25000);
  });

  it("calculates fee as 0 for player-owned stallions", () => {
    const mare = createTestMare({ id: "mare1" });
    const owned = createTestStallion({
      id: "s-owned",
      stud: mkStud({ standingFee: 25000 }),
      ownership: { type: "player" },
    });
    const results = suggestBestSires(mare, [owned], day);
    expect(results).toHaveLength(1);
    expect(results[0].fee).toBe(0);
  });

  it("includes reason string derived from compatibility score", () => {
    const mare = createTestMare({ id: "mare1" });
    const stallion = createTestStallion({
      id: "s1",
      stud: mkStud(),
      sireName: "Unique Sire Name",
    });
    const results = suggestBestSires(mare, [stallion], day);
    expect(results).toHaveLength(1);
    expect(typeof results[0].reason).toBe("string");
    expect(results[0].reason.length).toBeGreaterThan(0);
  });
});
