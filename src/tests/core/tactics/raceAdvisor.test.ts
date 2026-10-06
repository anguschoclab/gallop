import { describe, it, expect } from "vitest";
import { adviseRace } from "@/core/tactics/raceAdvisor";
import { generateHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { generateRace } from "@/core/race/generation/raceGen";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";
import type { Race } from "@/core/race/types";

describe("raceAdvisor", () => {
  it("evaluates a hot pace scenario for a low-stamina front-runner", () => {
    const horse = ensurePhenotypeResolved(generateHorse({ tier: "mid", ownership: makePlayerOwned() }));
    horse.runningStyle = "E"; // Front runner
    horse.stats.speed = 80;
    horse.stats.stamina = 50; // Low stamina

    // Create rivals with early speed
    const rivals = [
      ensurePhenotypeResolved(generateHorse({ tier: "elite", ownership: makeUnowned() })),
      ensurePhenotypeResolved(generateHorse({ tier: "elite", ownership: makeUnowned() })),
      ensurePhenotypeResolved(generateHorse({ tier: "elite", ownership: makeUnowned() })),
    ];
    for (const rival of rivals) {
      rival.runningStyle = "E";
    }

    const race = generateRace(10);
    race.distance = 1600;

    const advice = adviseRace(horse, race, rivals);

    // With a hot pace (3+ front runners) and low stamina (< 70), a front runner should be advised to stalk
    expect(advice.ridingStyle).toBe("stalker");
    expect(advice.reasons.some((r) => r.includes("want the lead") || r.includes("speed duel"))).toBe(true);
  });

  it("evaluates a lone pace scenario for a high-speed stalker", () => {
    const horse = ensurePhenotypeResolved(generateHorse({ tier: "mid", ownership: makePlayerOwned() }));
    horse.runningStyle = "EP"; // Stalker
    horse.stats.speed = 80; // High speed

    // Create rivals with NO early speed
    const rivals = [
      ensurePhenotypeResolved(generateHorse({ tier: "elite", ownership: makeUnowned() })),
      ensurePhenotypeResolved(generateHorse({ tier: "elite", ownership: makeUnowned() })),
    ];
    for (const rival of rivals) {
      rival.runningStyle = "S"; // Closer
    }

    const race = generateRace(10);
    race.distance = 1600;

    const advice = adviseRace(horse, race, rivals);

    // With a lone pace (0 front runners) and high speed (>= 60), a stalker should be advised to take the lead
    expect(advice.ridingStyle).toBe("front_runner");
    expect(advice.reasons.some((r) => r.includes("No other early speed") || r.includes("free lead"))).toBe(true);
  });

  it("evaluates an outsider correctly and increases aggressiveness", () => {
    const horse = ensurePhenotypeResolved(generateHorse({ tier: "budget", ownership: makePlayerOwned() }));
    horse.stats.speed = 30;
    horse.stats.stamina = 30;
    horse.stats.acceleration = 30;
    horse.stats.temperament = 50; // Ensure temperament doesn't lower aggressiveness

    // Create much better rivals
    const rivals = [
      ensurePhenotypeResolved(generateHorse({ tier: "elite", ownership: makeUnowned() })),
      ensurePhenotypeResolved(generateHorse({ tier: "elite", ownership: makeUnowned() })),
      ensurePhenotypeResolved(generateHorse({ tier: "elite", ownership: makeUnowned() })),
    ];
    for (const rival of rivals) {
      rival.stats.speed = 90;
      rival.stats.stamina = 90;
      rival.stats.acceleration = 90;
    }

    const race = generateRace(10);
    race.distance = 1600;

    const advice = adviseRace(horse, race, rivals);

    expect(advice.outlook).toBe("outsider");
    expect(advice.risks.some((r) => r.includes("rivals rate higher on paper"))).toBe(true);
    // Base aggressiveness 50 + 15 for outsider
    expect(advice.aggressiveness).toBeGreaterThanOrEqual(65);
  });

  it("adjusts advice based on surface aptitude, distance suitability, and condition", () => {
    const horse = ensurePhenotypeResolved(generateHorse({ tier: "mid", ownership: makePlayerOwned() }));
    horse.surfaceAptitude = { Turf: 40, Dirt: 90, Synthetic: 50 }; // High Dirt, Low Turf
    horse.recoveryPoints = 50; // Poor condition (< 60)
    horse.lastRaceDay = 10;
    horse.stats.stamina = 40;
    horse.stats.temperament = 40;

    const rivals = [ensurePhenotypeResolved(generateHorse({ tier: "mid", ownership: makeUnowned() }))];
    const race = generateRace(20);
    race.distance = 2400; // Manually set to bypass raceGen bounds
    race.surface = "Turf";

    const advice = adviseRace(horse, race, rivals);

    expect(advice.risks.some((r) => r.includes("Condition is"))).toBe(true);
    expect(advice.risks.some((r) => r.includes("not its preferred surface"))).toBe(true);
    expect(advice.risks.some((r) => r.includes("Stamina") && r.includes("is light for"))).toBe(true);
    expect(advice.risks.some((r) => r.includes("Temperament is fragile"))).toBe(true);
  });

  it("determines a strong outlook for a horse superior to the field", () => {
    const horse = ensurePhenotypeResolved(generateHorse({ tier: "elite", ownership: makePlayerOwned() }));
    horse.stats.speed = 90;
    horse.stats.stamina = 90;
    horse.stats.acceleration = 90;

    const rivals = [
      ensurePhenotypeResolved(generateHorse({ tier: "budget", ownership: makeUnowned() })),
      ensurePhenotypeResolved(generateHorse({ tier: "budget", ownership: makeUnowned() })),
    ];
    for (const rival of rivals) {
      rival.stats.speed = 30;
      rival.stats.stamina = 30;
      rival.stats.acceleration = 30;
    }

    const race = generateRace(10);
    race.distance = 1600;

    const advice = adviseRace(horse, race, rivals);

    expect(advice.outlook).toBe("strong");
    expect(advice.reasons.some((r) => r.includes("Rates as the best horse"))).toBe(true);
  });

  it("uses horse history for tendencies if present", () => {
    const horse = ensurePhenotypeResolved(generateHorse({ tier: "mid", ownership: makePlayerOwned() }));
    horse.runningStyle = "E"; // Natural front runner
    horse.stats.speed = 30; // Prevent overriding natural back to front_runner from a lone pace check

    // Simulate history where horse wins from mid-pack. "mid" tendency: fieldSize * 0.25 < pos <= fieldSize * 0.65.
    // For 10 horses: > 2.5 and <= 6.5. So 3, 4, 5, 6.
    horse.raceHistory = [
      { id: "r1", day: 1, horseAge: 3, distance: 1600, surface: "Dirt", position: 1, purse: 10000,
        prizeMoney: 6000, grade: "G1", className: "Allowance", status: "official",
        pacePositions: [6, 4, 1], fieldSize: 10 },
      { id: "r2", day: 10, horseAge: 3, distance: 1600, surface: "Dirt", position: 1, purse: 10000,
        prizeMoney: 6000, grade: "G1", className: "Allowance", status: "official",
        pacePositions: [5, 3, 1], fieldSize: 10 },
      { id: "r3", day: 20, horseAge: 3, distance: 1600, surface: "Dirt", position: 1, purse: 10000,
        prizeMoney: 6000, grade: "G1", className: "Allowance", status: "official",
        pacePositions: [6, 2, 1], fieldSize: 10 },
    ] as any;

    const rivals = [ensurePhenotypeResolved(generateHorse({ tier: "elite", ownership: makeUnowned() }))];
    for (const rival of rivals) {
      rival.stats.speed = 90;
      rival.stats.stamina = 90;
    }
    const race = generateRace(10);
    race.distance = 1600;

    const advice = adviseRace(horse, race, rivals);

    expect(advice.ridingStyle).toBe("stalker"); // "mid" maps to stalker
    expect(advice.reasons.some((r) => r.includes("Form book shows its best placings"))).toBe(true);
  });
});
