import { describe, it, expect } from "vitest";
import { buildRunner, runRaceToCompletion } from "@/game/raceSim";
import { createRng, hashStr } from "@/game/rng";
import type { Horse, HorseGender } from "@/game/types";

// Mock Horse generator
function mockHorse(
  id: string,
  gender: HorseGender,
  stats: { speed: number; stamina: number; acceleration: number; consistency: number },
): Horse {
  return {
    id,
    name: `${gender}_${id}`,
    age: 4,
    gender,
    hemisphere: "Northern",
    silk: "#ff0000",
    stats,
    energy: 100,
    form: 0,
    potential: 100,
    raceHistory: [],
    owned: true,
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    climbingAptitude: 1.0,
    corneringAptitude: 1.0,
    injuryProneness: 0,
    height: 16,
    weight: 500,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    genotype: {} as any,
  };
}

describe("Gender and Weight Influence", () => {
  const rng = createRng(hashStr("test_gender"));
  const distance = 1600;

  it("should penalize speed as weight increases", () => {
    const horse = mockHorse("h1", "horse", {
      speed: 80,
      stamina: 80,
      acceleration: 80,
      consistency: 80,
    });

    // Light weight vs Heavy weight
    const runnerLight = buildRunner(
      horse,
      true,
      distance,
      "Turf",
      { speedMul: 1, staminaDrainMul: 1 },
      1,
      undefined,
      115,
    );
    const runnerHeavy = buildRunner(
      horse,
      true,
      distance,
      "Turf",
      { speedMul: 1, staminaDrainMul: 1 },
      1,
      undefined,
      130,
    );

    expect(runnerLight.topSpeed).toBeGreaterThan(runnerHeavy.topSpeed);
    expect(runnerLight.accel).toBeGreaterThan(runnerHeavy.accel);
  });

  it("should give stallions higher peak power but higher noise than geldings", () => {
    const baseStats = { speed: 80, stamina: 80, acceleration: 80, consistency: 80 };
    const stallionHorse = mockHorse("stallion", "horse", baseStats);
    const geldingHorse = mockHorse("gelding", "gelding", baseStats);

    const runnerStallion = buildRunner(
      stallionHorse,
      true,
      distance,
      "Turf",
      { speedMul: 1, staminaDrainMul: 1 },
      1,
      undefined,
      126,
    );
    const runnerGelding = buildRunner(
      geldingHorse,
      true,
      distance,
      "Turf",
      { speedMul: 1, staminaDrainMul: 1 },
      1,
      undefined,
      126,
    );

    // Stallion should have 1.5% speed boost over Gelding (assuming same weight)
    expect(runnerStallion.topSpeed).toBeGreaterThan(runnerGelding.topSpeed);

    // Stallion should have higher noise (consistency penalty)
    // base noise = (110 - 80) / 100 = 0.3
    // stallion noise = 0.3 * 1.25 = 0.375
    // gelding noise = 0.3 * 0.6 = 0.18
    expect(runnerStallion.noise).toBeGreaterThan(runnerGelding.noise);
  });

  it("should show that fillies are slower than stallions but get weight allowance", () => {
    const baseStats = { speed: 80, stamina: 80, acceleration: 80, consistency: 80 };
    const stallionHorse = mockHorse("stallion", "horse", baseStats);
    const fillyHorse = mockHorse("filly", "filly", baseStats);

    // Stallion at 126lbs vs Filly at 121lbs (5lb allowance)
    const runnerStallion = buildRunner(
      stallionHorse,
      true,
      distance,
      "Turf",
      { speedMul: 1, staminaDrainMul: 1 },
      1,
      undefined,
      126,
    );
    const runnerFilly = buildRunner(
      fillyHorse,
      true,
      distance,
      "Turf",
      { speedMul: 1, staminaDrainMul: 1 },
      1,
      undefined,
      121,
    );

    // Stallion topSpeed: (Base * 1.015 * 1.0)
    // Filly topSpeed: (Base * 0.99 * 1.005) -> 1.005 comes from 126 - 121 = 5lb bonus (5 * 0.001)

    // Let's check the math:
    // stallion: 1.015
    // filly: 0.99 * 1.005 = 0.99495
    // Stallion is still slightly faster in top speed, but the gap is closed significantly.
    expect(runnerStallion.topSpeed).toBeGreaterThan(runnerFilly.topSpeed);

    // Without allowance, the gap would be 2.5% (1.015 vs 0.99)
    // With allowance, the gap is ~2.0%
  });

  it("should demonstrate gelding consistency in multi-race simulation", () => {
    const baseStats = { speed: 80, stamina: 80, acceleration: 80, consistency: 80 };
    const stallionHorse = mockHorse("stallion", "horse", baseStats);
    const geldingHorse = mockHorse("gelding", "gelding", baseStats);

    const stallionTimes: number[] = [];
    const geldingTimes: number[] = [];

    for (let i = 0; i < 20; i++) {
      const raceRng = createRng(hashStr(`race_${i}`));
      const rS = buildRunner(
        stallionHorse,
        true,
        distance,
        "Turf",
        { speedMul: 1, staminaDrainMul: 1 },
        1,
        undefined,
        126,
      );
      const rG = buildRunner(
        geldingHorse,
        true,
        distance,
        "Turf",
        { speedMul: 1, staminaDrainMul: 1 },
        1,
        undefined,
        126,
      );

      const resS = runRaceToCompletion([rS], distance, raceRng);
      const resG = runRaceToCompletion([rG], distance, raceRng);

      stallionTimes.push(resS.result[0].time);
      geldingTimes.push(resG.result[0].time);
    }

    const stallionVariance = Math.max(...stallionTimes) - Math.min(...stallionTimes);
    const geldingVariance = Math.max(...geldingTimes) - Math.min(...geldingTimes);

    console.log(`Stallion Variance: ${stallionVariance.toFixed(3)}s`);
    console.log(`Gelding Variance: ${geldingVariance.toFixed(3)}s`);

    expect(geldingVariance).toBeLessThan(stallionVariance);
  });
});
