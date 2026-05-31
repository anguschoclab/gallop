import { describe, it, expect } from "vitest";
import { buildRunner, runRaceToCompletion } from "@/game/raceSim";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { CourseSpecification } from "@/game/tracks";
import type { Horse, Rng, Jockey, JockeySilk, Genotype, HealthStatus } from "@/game/types";

// Simple deterministic RNG for testing
const mockRng: Rng = {
  next: () => 0.5,
  int: () => 0,
  range: () => 0,
  pick: <T>(arr: readonly T[]) => arr[0],
  gauss: () => 0,
};

// Minimal genotype for testing
const minimalGenotype: Genotype = {
  color: { extension: [0, 0], agouti: [0, 0], gray: [0, 0], cream: [0, 0] },
  stats: { speed: [[0, 0]], stamina: [[0, 0]], acceleration: [[0, 0]], consistency: [[0, 0]] },
  preferences: { distance: [0, 0], surface: [0, 0], climbing: [0, 0], cornering: [0, 0] },
  style: [0, 0],
  mental: [0, 0],
  physical: [0, 0],
  durability: [0, 0],
  size: [0, 0],
  markers: {
    leopardComplex: "recessive",
    csnbRisk: "low",
    sensoryPerception: "good",
    signalTransduction: "good",
    immunity: "good",
    geneticDiversity: 0.5,
    lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
  },
  heart: [[0, 0]],
  fiberType: [0, 0],
  stride: [0, 0],
  trackBias: [0, 0],
  mudAptitude: [0, 0],
  weatherAptitude: [0, 0],
  trainability: [0, 0],
  peakAge: [0, 0],
  recovery: [0, 0],
  fertility: [0, 0],
  foalingEase: [0, 0],
  markings: {
    socks: [0, 0],
    face: [0, 0],
    silverDapple: [0, 0],
    sabino: [0, 0],
    splashWhite: [0, 0],
  },
  health: {
    bleeder: [0, 0],
    roarer: [0, 0],
    ocd: [0, 0],
    efna5: [0, 0],
    pssm: [0, 0],
    rer: [0, 0],
    epm: [0, 0],
  },
};

function createHorse(
  id: string,
  style: "E" | "S" | "P",
  speed: number = 80,
  accel: number = 50,
  overrides: Partial<Horse> = {},
): Horse {
  return createTestHorse({
    id,
    name: `${style}_Horse_${id}`,
    age: 3,
    gender: "colt",
    runningStyle: style,
    stats: {
      speed,
      stamina: 80,
      acceleration: accel,
      consistency: 100,
      temperament: 50,
      conformation: 50,
    },
    corneringAptitude: 1.0,
    climbingAptitude: 1.0,
    ...overrides,
  });
}

function mkJockey(overrides: Partial<Jockey> = {}): Jockey {
  const silk: JockeySilk = {
    pattern: "solid",
    primary: "#ff0000",
    secondary: "#000000",
    cap: "solid",
  };
  return {
    id: overrides.id ?? "j1",
    name: overrides.name ?? "Test J",
    age: 25,
    archetype: overrides.archetype ?? "versatile",
    stats: {
      pacing: 70,
      positioning: 70,
      vigor: 70,
      gateSkill: 70,
      temperament: 70,
    },
    potential: 75,
    traits: overrides.traits ?? [],
    silk: overrides.silk ?? silk,
    careerStarts: 0,
    careerWins: 0,
    fame: 50,
    ridingFee: 100,
    affinityMap: {},
    stableAffinity: 50,
    isApprentice: false,
    loyalty: 50,
    ...overrides,
  };
}

describe("Track Size Influence", () => {
  it("should favor front-runners on tight tracks with short straights", () => {
    const eHorse = createHorse("1", "E");
    const sHorse = createHorse("2", "S");

    // Tight track (bullring): 1200m circ, 200m straight
    const tightTrack: CourseSpecification = {
      surface: "Turf",
      circumference: 1200,
      straightLength: 200,
      sections: [
        { type: "straight", length: 200 },
        { type: "turn", length: 400, radius: 127 },
        { type: "straight", length: 200 },
        { type: "turn", length: 400, radius: 127 },
      ],
    };

    const runnersTight = [
      buildRunner(eHorse, true, 1200, "Turf", { speedMul: 1, staminaDrainMul: 1 }, 1),
      buildRunner(sHorse, true, 1200, "Turf", { speedMul: 1, staminaDrainMul: 1 }, 2),
    ];

    const resultsTight = runRaceToCompletion(runnersTight, 1200, mockRng, 0.1, 600, tightTrack);

    // Large track (galloping): 2400m circ, 600m straight
    const largeTrack: CourseSpecification = {
      surface: "Turf",
      circumference: 2400,
      straightLength: 600,
      sections: [
        { type: "straight", length: 600 },
        { type: "turn", length: 600, radius: 191 },
        { type: "straight", length: 600 },
        { type: "turn", length: 600, radius: 191 },
      ],
    };

    const runnersLarge = [
      buildRunner(eHorse, true, 1200, "Turf", { speedMul: 1, staminaDrainMul: 1 }, 1),
      buildRunner(sHorse, true, 1200, "Turf", { speedMul: 1, staminaDrainMul: 1 }, 2),
    ];

    const resultsLarge = runRaceToCompletion(runnersLarge, 1200, mockRng, 0.1, 600, largeTrack);

    const eTimeTight = resultsTight.result.find((r) => r.horseId === "1")!.time;
    const sTimeTight = resultsTight.result.find((r) => r.horseId === "2")!.time;
    const tightMargin = sTimeTight - eTimeTight;

    const eTimeLarge = resultsLarge.result.find((r) => r.horseId === "1")!.time;
    const sTimeLarge = resultsLarge.result.find((r) => r.horseId === "2")!.time;
    const largeMargin = sTimeLarge - eTimeLarge;

    console.log(`Tight Track (Margin E over S): ${tightMargin.toFixed(3)}s`);
    console.log(`Large Track (Margin E over S): ${largeMargin.toFixed(3)}s`);

    // E should win by more (or lose by less) on the tight track compared to the large track
    expect(tightMargin).toBeGreaterThan(largeMargin);
  });

  it("should favor high-acceleration horses on tight turns", () => {
    // Two horses with same speed but different acceleration
    const agileHorse = createHorse("A", "P", 80, 90);
    const lumberingHorse = createHorse("L", "P", 80, 10);

    const tightTrack: CourseSpecification = {
      surface: "Turf",
      circumference: 1000,
      straightLength: 100,
      sections: [
        { type: "straight", length: 100 },
        { type: "turn", length: 400, radius: 127 },
        { type: "straight", length: 100 },
        { type: "turn", length: 400, radius: 127 },
      ],
    }; // Very tight turns

    const runners = [
      buildRunner(agileHorse, true, 1000, "Turf", { speedMul: 1, staminaDrainMul: 1 }, 1),
      buildRunner(lumberingHorse, true, 1000, "Turf", { speedMul: 1, staminaDrainMul: 1 }, 2),
    ];

    const results = runRaceToCompletion(runners, 1000, mockRng, 0.1, 600, tightTrack);

    const agileTime = results.result.find((r) => r.horseId === "A")!.time;
    const lumberingTime = results.result.find((r) => r.horseId === "L")!.time;

    console.log(`Agile Horse Time: ${agileTime.toFixed(3)}s`);
    console.log(`Lumbering Horse Time: ${lumberingTime.toFixed(3)}s`);

    // Agile horse should win on a tight track
    expect(agileTime).toBeLessThan(lumberingTime);
  });
});
