import { describe, it, expect } from "vitest";
import { buildRunner, runRaceToCompletion } from "@/game/raceSim";
import type { CourseSpecification } from "@/game/tracks";
import type { Horse, Rng, Jockey } from "@/game/types";

// Simple deterministic RNG for testing
const mockRng: Rng = {
  next: () => 0.5,
  seed: "test",
};

function createHorse(
  id: string,
  style: "E" | "S" | "P",
  speed: number = 80,
  accel: number = 50,
  overrides: Partial<Horse> = {},
): Horse {
  return {
    id,
    name: `${style}_Horse_${id}`,
    age: 3,
    gender: "colt",
    hemisphere: "Northern",
    silk: "#ff0000",
    stats: { speed, stamina: 80, acceleration: accel, consistency: 100 },
    energy: 100,
    form: 0,
    potential: 100,
    raceHistory: [],
    owned: true,
    runningStyle: style,
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    climbingAptitude: 1.0,
    corneringAptitude: 1.0,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
    fame: 0,
    ...overrides,
  };
}

function mkJockey(overrides: Partial<Jockey> = {}): Jockey {
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
    traits: overrides.traits ?? [],
    careerStarts: 0,
    careerWins: 0,
    fame: 50,
    ridingFee: 100,
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
