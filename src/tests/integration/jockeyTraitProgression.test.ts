import { describe, it, expect } from "vitest";
import { generateJockeyStatsTrackingImpacts } from "@/core/race/impacts/jockeyStatsTracking";
import { createTestJockey } from "@/tests/helpers/createTestJockey";
import { createTestColt } from "@/tests/helpers/createTestHorse";

function makeOpenRace() {
  return {
    id: "r1",
    name: "Test Race",
    day: 10,
    distance: 1600,
    raceClass: "open",
    entryFee: 100,
    purse: 10000,
    fieldSize: 8,
    entries: [],
    resolved: false,
  } as any;
}

describe("jockey trait XP integration", () => {
  it("emits traitXpAwards in jockey_stats impact for winning jockey", () => {
    const horse = createTestColt({ id: "h1", owned: true });
    const jockey = createTestJockey({ id: "j1", careerStarts: 50, careerWins: 10, fame: 50 });
    const race = makeOpenRace();
    race.surface = "Turf";
    race.distance = 1200;
    const jockeyMap = new Map([["j1", jockey]]);
    const entry = { horseId: "h1", owned: true, jockeyId: "j1" };

    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      entry,
      jockeyMap,
      10,
    );

    const statsImpact = impacts.find((i) => i.type === "jockey_stats");
    expect(statsImpact).toBeDefined();
    expect((statsImpact as any).traitXpAwards).toBeDefined();
    expect(Object.keys((statsImpact as any).traitXpAwards).length).toBeGreaterThan(0);
  });

  it("awards turf_specialist XP when race is on Turf", () => {
    const horse = createTestColt({ id: "h1", owned: true });
    const jockey = createTestJockey({ id: "j1" });
    const race = makeOpenRace();
    race.surface = "Turf";
    const jockeyMap = new Map([["j1", jockey]]);
    const entry = { horseId: "h1", owned: true, jockeyId: "j1" };

    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      entry,
      jockeyMap,
      10,
    );

    const statsImpact = impacts.find((i) => i.type === "jockey_stats") as any;
    expect(statsImpact.traitXpAwards).toBeDefined();
    expect(statsImpact.traitXpAwards["turf_specialist"]).toBeGreaterThan(0);
  });

  it("awards sprint_specialist XP when race distance < 1400m", () => {
    const horse = createTestColt({ id: "h1", owned: true });
    const jockey = createTestJockey({ id: "j1" });
    const race = makeOpenRace();
    race.distance = 1200;
    const jockeyMap = new Map([["j1", jockey]]);
    const entry = { horseId: "h1", owned: true, jockeyId: "j1" };

    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      entry,
      jockeyMap,
      10,
    );

    const statsImpact = impacts.find((i) => i.type === "jockey_stats") as any;
    expect(statsImpact.traitXpAwards["sprint_specialist"]).toBeGreaterThan(0);
  });

  it("does not award XP when jockeyId is missing from entry", () => {
    const horse = createTestColt({ id: "h1", owned: true });
    const race = makeOpenRace();
    const jockeyMap = new Map();
    const entry = { horseId: "h1", owned: true };

    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      entry,
      jockeyMap,
      10,
    );

    const statsImpact = impacts.find((i) => i.type === "jockey_stats");
    expect(statsImpact).toBeUndefined();
  });

  it("awards staying_specialist XP when race distance > 2200m", () => {
    const horse = createTestColt({ id: "h1", owned: true });
    const jockey = createTestJockey({ id: "j1" });
    const race = makeOpenRace();
    race.distance = 2400;
    const jockeyMap = new Map([["j1", jockey]]);
    const entry = { horseId: "h1", owned: true, jockeyId: "j1" };

    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 150 },
      race,
      entry,
      jockeyMap,
      10,
    );

    const statsImpact = impacts.find((i) => i.type === "jockey_stats") as any;
    expect(statsImpact.traitXpAwards["staying_specialist"]).toBeGreaterThan(0);
  });
});
