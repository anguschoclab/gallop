import { describe, it, expect } from "vitest";
import { runRaceToCompletion, calculateWindEffect } from "@/core/race/engine/simulation";
import { buildRunner, getConditionsModifier } from "@/core/race/engine/runnerBuilder";
import { createRng } from "@/core/common/rng";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { CourseSpecification, TrackSection } from "@/data/tracks";

const distance = 1200;
const conditions = getConditionsModifier({});

function makeRunner(id: string, topSpeedOverride?: number) {
  const horse = createTestHorse({
    id,
    name: id,
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      consistency: 80,
      temperament: 50,
      conformation: 50,
    },
  });
  const runner = buildRunner(horse, false, distance, "Turf", conditions, 1);
  if (topSpeedOverride) {
    runner.topSpeed = topSpeedOverride;
  }
  return runner;
}

const straightTrack: CourseSpecification = {
  surface: "Turf",
  circumference: 2000,
  straightLength: 1200,
  width: 20,
  sections: [{ type: "straight", length: 1200, orientationDeg: 0 }],
};

describe("wind integration", () => {
  it("headwind slows finish time vs no-wind baseline", () => {
    const rng = createRng(42);
    const baseline = runRaceToCompletion(
      [makeRunner("h1")],
      distance,
      rng,
      0.1,
      600,
      straightTrack,
    );

    const rng2 = createRng(42);
    const headwind = runRaceToCompletion(
      [makeRunner("h1")],
      distance,
      rng2,
      0.1,
      600,
      straightTrack,
      false,
      80,
      0, // wind from North, running North = headwind
    );

    expect(headwind.result[0].time).toBeGreaterThan(baseline.result[0].time);
  });

  it("tailwind speeds finish time vs no-wind baseline", () => {
    const rng = createRng(42);
    const baseline = runRaceToCompletion(
      [makeRunner("h1")],
      distance,
      rng,
      0.1,
      600,
      straightTrack,
    );

    const rng2 = createRng(42);
    const tailwind = runRaceToCompletion(
      [makeRunner("h1")],
      distance,
      rng2,
      0.1,
      600,
      straightTrack,
      false,
      80,
      180, // wind from South, running North = tailwind
    );

    expect(tailwind.result[0].time).toBeLessThan(baseline.result[0].time);
  });

  it("crosswind has minimal effect", () => {
    const rng = createRng(42);
    const baseline = runRaceToCompletion(
      [makeRunner("h1")],
      distance,
      rng,
      0.1,
      600,
      straightTrack,
    );

    const rng2 = createRng(42);
    const crosswind = runRaceToCompletion(
      [makeRunner("h1")],
      distance,
      rng2,
      0.1,
      600,
      straightTrack,
      false,
      80,
      90, // wind from East, running North = crosswind
    );

    const delta = Math.abs(crosswind.result[0].time - baseline.result[0].time);
    expect(delta).toBeLessThan(baseline.result[0].time * 0.02); // < 2% difference
  });

  it("amplifies headwind effect for sprinters on long straights", () => {
    const sprinter = makeRunner("sprinter", 19);
    const router = makeRunner("router", 16);

    const section: TrackSection = { type: "straight", length: 500, orientationDeg: 0 };
    const course: CourseSpecification = {
      surface: "Turf",
      circumference: 2000,
      straightLength: 1200,
      width: 20,
      sections: [section],
    };

    const sprinterEffect = calculateWindEffect(sprinter, course, 80, 0, section, 0.5);
    const routerEffect = calculateWindEffect(router, course, 80, 0, section, 0.5);

    // Sprinter faces a stronger slowdown (lower speedMod)
    expect(sprinterEffect.speedMod).toBeLessThan(routerEffect.speedMod);
    // Both get the same stamina penalty on a straight
    expect(sprinterEffect.staminaMod).toBe(routerEffect.staminaMod);
  });

  it("is deterministic", () => {
    const a = runRaceToCompletion(
      [makeRunner("h1")],
      distance,
      createRng(77),
      0.1,
      600,
      straightTrack,
      false,
      60,
      45,
    );
    const b = runRaceToCompletion(
      [makeRunner("h1")],
      distance,
      createRng(77),
      0.1,
      600,
      straightTrack,
      false,
      60,
      45,
    );

    expect(a.result[0].time).toBeCloseTo(b.result[0].time, 10);
  });
});
