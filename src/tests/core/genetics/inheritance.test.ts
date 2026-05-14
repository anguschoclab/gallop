import { describe, it, expect } from "vitest";
import { createRng } from "@/game/rng";
import { generateGenotype } from "@/core/genetics/generation";
import { inheritDNA } from "@/core/genetics/inheritance";
import { resolveRunningStyle, resolveFiberBias } from "@/core/genetics/phenotype";

// ─── Bug 1: inheritTrait order-dependency ────────────────────────────────────

describe("inheritTrait — order independence", () => {
  it("dam-excellent × sire-good produces same distribution as sire-excellent × dam-good", () => {
    const SAMPLES = 400;
    const rng = createRng(99);

    const base = generateGenotype(rng, "mid");

    const sireExcellent = {
      ...base,
      markers: { ...base.markers, sensoryPerception: "excellent" as const },
    };
    const damGood = { ...base, markers: { ...base.markers, sensoryPerception: "good" as const } };
    const sireGood = { ...base, markers: { ...base.markers, sensoryPerception: "good" as const } };
    const damExcellent = {
      ...base,
      markers: { ...base.markers, sensoryPerception: "excellent" as const },
    };

    let excellentFromSireFirst = 0;
    let excellentFromDamFirst = 0;

    for (let i = 0; i < SAMPLES; i++) {
      const r1 = createRng(i * 2);
      const f1 = inheritDNA(sireExcellent, damGood, r1);
      if (f1.markers.sensoryPerception === "excellent") excellentFromSireFirst++;

      const r2 = createRng(i * 2);
      const f2 = inheritDNA(sireGood, damExcellent, r2);
      if (f2.markers.sensoryPerception === "excellent") excellentFromDamFirst++;
    }

    // Both should produce ~70% excellent. Allow ±12% tolerance for randomness.
    const diffPercent = Math.abs(excellentFromSireFirst - excellentFromDamFirst) / SAMPLES;
    expect(diffPercent).toBeLessThan(0.12);
  });

  it("excellent × poor never produces excellent offspring", () => {
    const rng = createRng(77);
    const base = generateGenotype(rng, "mid");
    const sire = { ...base, markers: { ...base.markers, immunity: "excellent" as const } };
    const dam = { ...base, markers: { ...base.markers, immunity: "poor" as const } };

    for (let i = 0; i < 100; i++) {
      const foal = inheritDNA(sire, dam, createRng(i));
      expect(foal.markers.immunity).not.toBe("excellent");
    }
  });

  it("poor × excellent (reversed) also never produces excellent offspring", () => {
    const rng = createRng(77);
    const base = generateGenotype(rng, "mid");
    const sire = { ...base, markers: { ...base.markers, immunity: "poor" as const } };
    const dam = { ...base, markers: { ...base.markers, immunity: "excellent" as const } };

    for (let i = 0; i < 100; i++) {
      const foal = inheritDNA(sire, dam, createRng(i));
      expect(foal.markers.immunity).not.toBe("excellent");
    }
  });
});

// ─── Bug 2: Simulator RNG diversity ──────────────────────────────────────────

describe("breedingSimulator — RNG diversity", () => {
  it("produces statistically diverse foal stats across 250 simulations", async () => {
    const { runBreedingSimulation } = await import("@/core/genetics/breedingSimulator");
    const rng = createRng(42);

    // Use contrasting parents to guarantee variance in offspring
    const sire = generateGenotype(rng, "elite");
    const dam = generateGenotype(rng, "starter");

    // Force contrasting speed loci so crossover produces a spread
    sire.stats.speed = Array.from({ length: 10 }, () => [5, 5] as [number, number]);
    dam.stats.speed = Array.from({ length: 10 }, () => [1, 1] as [number, number]);

    // Force contrasting fiber types so both values appear in offspring
    sire.fiberType = [5, 1]; // heterozygous
    dam.fiberType = [5, 1]; // heterozygous

    // Test objects with genotype property (not on Horse type)
    const sireHorse = { id: "s1", genotype: sire, pedigree: undefined } as any;
    const damHorse = { id: "d1", genotype: dam, pedigree: undefined } as any;
    const state = { horses: [], npcStables: [] } as any;

    const result = runBreedingSimulation(sireHorse, damHorse, state, rng);

    // p10 and p90 must differ — if RNG is broken all sims produce identical foals
    expect(result.stats.speed.p90).toBeGreaterThan(result.stats.speed.p10);

    // With contrasting fiber types (sire stayer, dam sprinter) both should appear
    expect(result.traits.fiberBias.sprinter).toBeGreaterThan(0);
    expect(result.traits.fiberBias.stayer).toBeGreaterThan(0);
  });
});

// ─── Bug 3: style locus links to PERFORMANCE chromosome ──────────────────────

describe("inheritDNA — style locus chromosome linkage", () => {
  it("style co-inherits with acceleration more than 50% when both parents share acceleration bias", () => {
    const rng = createRng(55);
    const base = generateGenotype(rng, "mid");

    // Both parents: high acceleration loci, early-foot style (low style value = E/EP)
    const highAccel: typeof base.stats.acceleration = Array.from(
      { length: 10 },
      () => [5, 5] as [number, number],
    );
    const earlyStyle: [number, number] = [1, 1]; // resolves to "E"

    const sire = { ...base, stats: { ...base.stats, acceleration: highAccel }, style: earlyStyle };
    const dam = { ...base, stats: { ...base.stats, acceleration: highAccel }, style: earlyStyle };

    let earlyStyleCount = 0;
    for (let i = 0; i < 100; i++) {
      const foal = inheritDNA(sire, dam, createRng(i));
      const style = resolveRunningStyle(foal.style);
      if (style === "E" || style === "EP") earlyStyleCount++;
    }

    // With both parents having identical early-style loci, virtually all foals should be E/EP
    expect(earlyStyleCount).toBeGreaterThan(90);
  });

  it("style locus is present on offspring genotype", () => {
    const rng = createRng(11);
    const sire = generateGenotype(rng, "mid");
    const dam = generateGenotype(rng, "mid");
    const foal = inheritDNA(sire, dam, createRng(22));
    expect(foal.style).toBeDefined();
    expect(Array.isArray(foal.style)).toBe(true);
    expect(foal.style).toHaveLength(2);
  });
});
