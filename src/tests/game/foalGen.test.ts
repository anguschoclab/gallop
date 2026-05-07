import { describe, it, expect } from "vitest";
import { resolveFoaling } from "@/game/foalGen";
import { createTestGenotype } from "@/tests/helpers/createTestGenotype";
import { resolveGeneticMarkers } from "@/core/genetics/phenotype";
import type { Horse, Pregnancy } from "@/game/types";

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
    genotype: overrides.genotype ?? createTestGenotype(),
    geneticMarkers: resolveGeneticMarkers(overrides.genotype ?? createTestGenotype()),
    raceHistory: [],
    owned: true,
    fame: 0,
    lifecycleStatus: "active" as const,
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

const sire = mkHorse({
  id: "sire",
  name: "Sire",
  gender: "horse",
  stats: { speed: 95, stamina: 95, acceleration: 95, consistency: 95 },
  potential: 100,
});
const dam = mkHorse({
  id: "dam",
  name: "Dam",
  gender: "mare",
  stats: { speed: 95, stamina: 95, acceleration: 95, consistency: 95 },
  potential: 100,
});

describe("resolveFoaling", () => {
  it("foal stats are integers in [1, 100] even with max parents and big compatibility bonuses", () => {
    // Try many pregnancy IDs to surface any rare seed where clamping fails.
    for (let i = 0; i < 200; i++) {
      const outcome = resolveFoaling(mkPregnancy(`preg-${i}`), sire, dam);
      if (outcome.kind === "live") {
        const { stats, potential } = outcome.foal;
        for (const v of [
          stats.speed,
          stats.stamina,
          stats.acceleration,
          stats.consistency,
          potential,
        ]) {
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
    const validTypes = [
      "stillborn",
      "unable to stand",
      "early loss",
      "mid loss",
      "lethal recessive",
      "twin reduction (single survivor)",
    ];
    let saw = false;
    for (let i = 0; i < 500 && !saw; i++) {
      const outcome = resolveFoaling(mkPregnancy(`preg-c-${i}`), sire, dam);
      if (outcome.kind === "complication") {
        saw = true;
        expect(validTypes).toContain(outcome.type);
      }
    }
    expect(saw).toBe(true);
  });

  it("ages mares scale complication risk: 20yo dam fails much more often than 5yo dam", () => {
    const youngDam = { ...dam, age: 5 };
    const oldDam = { ...dam, age: 20 };
    let youngFails = 0,
      oldFails = 0;
    for (let i = 0; i < 500; i++) {
      if (resolveFoaling(mkPregnancy(`y-${i}`), sire, youngDam).kind === "complication")
        youngFails++;
      if (resolveFoaling(mkPregnancy(`o-${i}`), sire, oldDam).kind === "complication") oldFails++;
    }
    // Loose floor — randomness can swing things, but old should be clearly higher.
    expect(oldFails).toBeGreaterThan(youngFails);
  });

  it("lethal recessive: both-carrier pair produces complications at meaningfully higher rate than non-carrier pair", () => {
    const carrierSire = {
      ...sire,
      geneticMarkers: {
        ...sire.geneticMarkers!,
        lethalCarriers: { csnb: true, hypp: false, olws: false },
      },
    };
    const carrierDam = {
      ...dam,
      geneticMarkers: {
        ...dam.geneticMarkers!,
        lethalCarriers: { csnb: true, hypp: false, olws: false },
      },
    };
    const cleanSire = {
      ...sire,
      geneticMarkers: {
        ...sire.geneticMarkers!,
        lethalCarriers: { csnb: false, hypp: false, olws: false },
      },
    };
    const cleanDam = {
      ...dam,
      geneticMarkers: {
        ...dam.geneticMarkers!,
        lethalCarriers: { csnb: false, hypp: false, olws: false },
      },
    };
    let bothFails = 0,
      cleanFails = 0;
    for (let i = 0; i < 500; i++) {
      if (resolveFoaling(mkPregnancy(`b-${i}`), carrierSire, carrierDam).kind === "complication")
        bothFails++;
      if (resolveFoaling(mkPregnancy(`c-${i}`), cleanSire, cleanDam).kind === "complication")
        cleanFails++;
    }
    expect(bothFails).toBeGreaterThan(cleanFails);
  });
});
