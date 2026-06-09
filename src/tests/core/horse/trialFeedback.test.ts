import { describe, it, expect } from "vitest";
import { generateRiderFeedback } from "@/core/horse/trialFeedback";

function makeHorse(overrides: any = {}) {
  return {
    id: "h1",
    name: "Test Horse",
    stats: { speed: 50, stamina: 50, acceleration: 50, temperament: 50, conformation: 50, consistency: 50 },
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 0.95, Dirt: 0.95, Synthetic: 0.95 },
    ...overrides,
  };
}

describe("generateRiderFeedback", () => {
  it("praises smooth surface movement when aptitude is 0.95+", () => {
    const horse = makeHorse({ surfaceAptitude: { Turf: 1.0, Dirt: 0.95, Synthetic: 0.95 } });
    const fb = generateRiderFeedback(horse, 1600, "Turf");
    expect(fb).toContain("moved smoothly");
  });

  it("notes struggle when surface aptitude is below 0.95", () => {
    const horse = makeHorse({ surfaceAptitude: { Turf: 0.9, Dirt: 0.95, Synthetic: 0.95 } });
    const fb = generateRiderFeedback(horse, 1600, "Turf");
    expect(fb).toContain("struggled");
  });

  it("says distance is too long when diff > 400 and distance > aptitude", () => {
    const horse = makeHorse({ distanceAptitude: 1200 });
    const fb = generateRiderFeedback(horse, 2000, "Turf");
    expect(fb).toContain("too long");
  });

  it("says distance is too sharp when diff > 400 and distance < aptitude", () => {
    const horse = makeHorse({ distanceAptitude: 2000 });
    const fb = generateRiderFeedback(horse, 1200, "Turf");
    expect(fb).toContain("too sharp");
  });

  it("praises comfortable distance when diff <= 400", () => {
    const horse = makeHorse({ distanceAptitude: 1600 });
    const fb = generateRiderFeedback(horse, 1600, "Turf");
    expect(fb).toContain("comfortably");
  });

  it("mentions explosive turn of foot when acceleration > 75", () => {
    const horse = makeHorse({ stats: { ...makeHorse().stats, acceleration: 80 } });
    const fb = generateRiderFeedback(horse, 1600, "Turf");
    expect(fb).toContain("explosive turn of foot");
  });

  it("mentions steady grinding run when acceleration <= 75", () => {
    const horse = makeHorse({ stats: { ...makeHorse().stats, acceleration: 70 } });
    const fb = generateRiderFeedback(horse, 1600, "Turf");
    expect(fb).toContain("steady, grinding run");
  });
});
