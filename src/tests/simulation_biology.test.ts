import { describe, it, expect } from "vitest";
import { createRng } from "@/game/rng";
import { generateHorse } from "@/game/horseGen";
import { buildRunner } from "@/game/raceSim";

describe("Biological Simulation Bridge - Stress Test", () => {
  const rng = createRng(789);

  it("should apply size-based weight capacity bonuses", () => {
    const largeHorse = generateHorse({ tier: "mid" });
    largeHorse.weight = 600; // Giant

    const smallHorse = generateHorse({ tier: "mid" });
    smallHorse.weight = 440; // Pony

    // Reset stats to identical for fair comparison
    largeHorse.stats = { speed: 80, stamina: 80, acceleration: 80, consistency: 80 };
    smallHorse.stats = { speed: 80, stamina: 80, acceleration: 80, consistency: 80 };

    const topWeight = 132; // Heavy lead

    const largeRunner = buildRunner(
      largeHorse,
      false,
      1600,
      "Turf",
      { speedMul: 1, staminaDrainMul: 1 },
      1,
      undefined,
      topWeight,
    );
    const smallRunner = buildRunner(
      smallHorse,
      false,
      1600,
      "Turf",
      { speedMul: 1, staminaDrainMul: 1 },
      1,
      undefined,
      topWeight,
    );

    // Large horse should have higher top speed under top-weight
    expect(largeRunner.topSpeed).toBeGreaterThan(smallRunner.topSpeed);
  });

  it("should apply conformation-based stamina efficiency", () => {
    const goodConf = generateHorse({ tier: "mid" });
    goodConf.conformation = "excellent";

    const poorConf = generateHorse({ tier: "mid" });
    poorConf.conformation = "poor";

    goodConf.stats = { speed: 80, stamina: 80, acceleration: 80, consistency: 80 };
    poorConf.stats = { speed: 80, stamina: 80, acceleration: 80, consistency: 80 };

    const goodRunner = buildRunner(
      goodConf,
      false,
      2400,
      "Turf",
      { speedMul: 1, staminaDrainMul: 1 },
      1,
    );
    const poorRunner = buildRunner(
      poorConf,
      false,
      2400,
      "Turf",
      { speedMul: 1, staminaDrainMul: 1 },
      1,
    );

    // Good conformation should result in a HIGHER staminaFactor (less fade)
    // Actually, in my implementation, conformationMod is applied to staminaDrainMul.
    // Higher drain = lower staminaFactor.
    expect(goodRunner.staminaFactor).toBeGreaterThan(poorRunner.staminaFactor);
  });

  it("should verify gelding consistency bonus", () => {
    const horse = generateHorse({ tier: "mid" });
    horse.gender = "horse";
    horse.stats.consistency = 80;

    const gelding = { ...horse, gender: "gelding" as const };

    const horseRunner = buildRunner(
      horse,
      false,
      1200,
      "Turf",
      { speedMul: 1, staminaDrainMul: 1 },
      1,
    );
    const geldingRunner = buildRunner(
      gelding,
      false,
      1200,
      "Turf",
      { speedMul: 1, staminaDrainMul: 1 },
      1,
    );

    // Gelding should have lower noise (higher consistency)
    expect(geldingRunner.noise).toBeLessThan(horseRunner.noise);
  });
});
