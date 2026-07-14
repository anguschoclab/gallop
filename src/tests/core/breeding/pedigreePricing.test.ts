import { describe, it, expect } from "vitest";
import { pedigreeMultiplier } from "@/core/breeding/pedigreePricing";
import type { Horse } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

function mkHorse(over: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "h",
    name: "H",
    age: 1,
    gender: "colt",
    ...over,
  });
}

describe("pedigreeMultiplier", () => {
  it("returns 1 when no pedigree", () => {
    const horse = mkHorse();
    expect(pedigreeMultiplier(horse, { horses: h2r([horse]) } as any)).toBe(1);
  });

  it("yearling by elite stallion + blue-hen dam → multiplier > 1.2", () => {
    const sire = mkHorse({
      id: "sire",
      name: "Sire",
      age: 8,
      stud: {
        atStud: true,
        standingFee: 200000,
        bookSize: 150,
        seasonBookings: 0,
        lifetimeFoals: 20,
        lifetimeStakesFoals: 5,
        lifetimeG1Foals: 2,
        retiredOnDay: 1,
      },
    });
    const dam = mkHorse({
      id: "dam",
      name: "Dam",
      gender: "mare",
      blueHenStatus: {
        isBlueHen: true,
        stakesWinnersProduced: 3,
        group1WinnersProduced: 1,
        blueHenScore: 80,
        foalsProduced: 5,
      },
    });
    const yearling = mkHorse({
      id: "y",
      age: 1,
      pedigree: {
        name: "Yearling",
        generation: 0,
        sireId: "sire",
        damId: "dam",
        sireName: "Sire",
        damName: "Dam",
      },
    });
    const mul = pedigreeMultiplier(yearling, { horses: h2r([sire, dam, yearling]) } as any);
    expect(mul).toBeGreaterThan(1.2);
  });

  it("older horses lean less on pedigree (lower multiplier than yearling, same parents)", () => {
    const sire = mkHorse({
      id: "sire",
      name: "Sire",
      stud: {
        atStud: true,
        standingFee: 100000,
        bookSize: 150,
        seasonBookings: 0,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 1,
      },
    });
    const dam = mkHorse({ id: "dam", name: "Dam", gender: "mare" });
    const yearling = mkHorse({
      id: "y",
      age: 1,
      pedigree: { name: "Y", generation: 0, sireId: "sire", damId: "dam" },
    });
    const veteran = mkHorse({
      id: "v",
      age: 5,
      pedigree: { name: "V", generation: 0, sireId: "sire", damId: "dam" },
    });
    const horses = [sire, dam, yearling, veteran];
    expect(pedigreeMultiplier(yearling, { horses } as any)).toBeGreaterThan(
      pedigreeMultiplier(veteran, { horses } as any),
    );
  });
});
