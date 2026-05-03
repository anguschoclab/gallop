import { describe, it, expect } from "vitest";
import { resolveFoaling } from "./foalGen";
import type { Horse, Pregnancy } from "./types";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: overrides.id ?? "x",
    name: overrides.name ?? "Test",
    age: 5,
    gender: "horse",
    hemisphere: "Northern",
    silk: "#abcdef",
    stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
    energy: 100,
    form: 0,
    potential: 90,
    raceHistory: [],
    owned: true,
    ...overrides,
  };
}

function mkPregnancy(id: string): Pregnancy {
  return {
    id,
    sireId: "sire",
    damId: "dam",
    sireName: "Sire",
    damName: "Dam",
    conceivedDay: 1,
    dueDay: 31,
    resolved: false,
    reBreedingAttempts: 0,
  };
}

const sire = mkHorse({ id: "sire", name: "Sire", gender: "horse", stats: { speed: 95, stamina: 95, acceleration: 95, consistency: 95 }, potential: 100 });
const dam = mkHorse({ id: "dam", name: "Dam", gender: "mare", stats: { speed: 95, stamina: 95, acceleration: 95, consistency: 95 }, potential: 100 });

describe("resolveFoaling", () => {
  it("foal stats are integers in [1, 100] even with max parents and big compatibility bonuses", () => {
    // Try many pregnancy IDs to surface any rare seed where clamping fails.
    for (let i = 0; i < 200; i++) {
      const outcome = resolveFoaling(mkPregnancy(`preg-${i}`), sire, dam);
      if (outcome.kind === "live") {
        const { stats, potential } = outcome.foal;
        for (const v of [stats.speed, stats.stamina, stats.acceleration, stats.consistency, potential]) {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(1);
          expect(v).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("is deterministic for inheritance overrides given the same pregnancy id", () => {
    const a = resolveFoaling(mkPregnancy("preg-stable"), sire, dam);
    const b = resolveFoaling(mkPregnancy("preg-stable"), sire, dam);
    expect(a.kind).toBe(b.kind);
    if (a.kind === "live" && b.kind === "live") {
      expect(a.foal.stats).toEqual(b.foal.stats);
      expect(a.foal.potential).toBe(b.foal.potential);
      expect(a.foal.conformation).toBe(b.foal.conformation);
      expect(a.foal.temperament).toBe(b.foal.temperament);
      expect(a.foal.runningStyle).toBe(b.foal.runningStyle);
    }
  });

  it("complication outcomes have a recognized type", () => {
    let saw = false;
    for (let i = 0; i < 500 && !saw; i++) {
      const outcome = resolveFoaling(mkPregnancy(`preg-c-${i}`), sire, dam);
      if (outcome.kind === "complication") {
        saw = true;
        expect(["stillborn", "unable to stand"]).toContain(outcome.type);
      }
    }
    // 5% rate over 500 trials → all-or-nothing failure unrealistic; sanity check.
    expect(saw).toBe(true);
  });
});
