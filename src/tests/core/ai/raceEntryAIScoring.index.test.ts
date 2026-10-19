import { describe, it, expect } from "vitest";
import {
  calculateStrategicEntryScore,
  buildRaceCompetitorIndex,
} from "@/domains/agents/simulation/raceEntryAIScoring";
import { createRaceEntryAIState } from "@/domains/agents/simulation/raceEntryAITypes";
import { createTestHorse } from "@/tests/helpers";
import type { Horse, Race, Stable } from "@/platform/game/types";
import type { StaffRole } from "@/domains/staff/model/staffTypes";
import { makeNpcOwned } from "@/domains/horse/simulation/ownership";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";

function mkStable(overrides: Partial<Stable> = {}): Stable {
  const staffRoles: StaffRole[] = ["veterinarian", "farrier", "nutritionist", "groom", "trainer"];
  const staff = staffRoles.reduce(
    (acc, role) => ({ ...acc, [role]: null }),
    {} as Record<StaffRole, string | null>,
  );
  return {
    id: "s1",
    name: "Stable",
    tier: "mid",
    reputation: 75,
    founded: 1,
    cash: 500000,
    horses: [],
    isMajor: true,
    colors: { primary: "#000", secondary: "#fff" },
    country: "USA",
    personality: "aggressive",
    owner: generatePersonIdentity({
      id: "owner",
      displayName: "Owner",
      role: "owner",
      ageBand: "adult",
    }),
    staff,
    outposts: [],
    ...overrides,
  };
}

function mkRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "r1",
    name: "Test Race",
    day: 10,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 100,
    purse: 50000,
    minStat: 40,
    fieldSize: 12,
    entries: [],
    resolved: false,
    ...overrides,
  } as Race;
}

/**
 * The competitor-quality index is a memoization of a per-(stable, horse, race)
 * rescan. Every call path must produce bit-identical scores with and without
 * it — including the edge case where the evaluated horse is itself entered.
 */
describe("calculateStrategicEntryScore competitor index equivalence", () => {
  const personalities: Stable["personality"][] = [
    "aggressive",
    "conservative",
    "developer",
    "specialist",
    "trader",
    "prestige",
  ];

  const horses = [
    createTestHorse({ id: "cand1", name: "Candidate", stats: statBlock(60) }),
    createTestHorse({ id: "cand2", name: "Candidate Two", stats: statBlock(85) }),
    createTestHorse({
      id: "comp1",
      name: "Strong Rival",
      stats: statBlock(95),
      ownership: makeNpcOwned("rival" as Stable["id"]),
    }),
    createTestHorse({
      id: "comp2",
      name: "Weak Rival",
      stats: statBlock(30),
      ownership: makeNpcOwned("rival" as Stable["id"]),
    }),
    createTestHorse({
      id: "comp3",
      name: "Average Rival",
      stats: statBlock(50),
      ownership: makeNpcOwned("rival" as Stable["id"]),
    }),
  ];
  const horseMap = new Map(horses.map((h) => [h.id, h]));

  function statBlock(v: number) {
    return {
      speed: v,
      stamina: v,
      acceleration: v,
      consistency: v,
      conformation: v,
      temperament: v,
    };
  }

  const raceFields: Race["entries"] = [
    { horseId: "comp1" },
    { horseId: "comp2" },
    { horseId: "comp3" },
    { horseId: "missing_horse" }, // unresolved competitor — skipped by index and loop
  ] as Race["entries"];

  const scenarios: { name: string; race: Race; horse: Horse }[] = [
    { name: "candidate not entered", race: mkRace({ entries: raceFields }), horse: horses[0] },
    {
      name: "strong candidate not entered",
      race: mkRace({ entries: raceFields }),
      horse: horses[1],
    },
    {
      name: "candidate IS entered (self-exclusion)",
      race: mkRace({ entries: [...raceFields, { horseId: "cand1" }] as Race["entries"] }),
      horse: horses[0],
    },
    {
      name: "empty field",
      race: mkRace({ entries: [] }),
      horse: horses[0],
    },
    {
      name: "only self entered",
      race: mkRace({ entries: [{ horseId: "cand1" }] as Race["entries"] }),
      horse: horses[0],
    },
  ];

  for (const { name, race, horse } of scenarios) {
    for (const personality of personalities) {
      it(`${name} — ${personality}`, () => {
        const stable = mkStable({ personality });
        const aiState = createRaceEntryAIState(stable);
        const index = buildRaceCompetitorIndex(race, horseMap);

        const without = calculateStrategicEntryScore(aiState, horse, race, stable, 10, horseMap);
        const withIndex = calculateStrategicEntryScore(
          aiState,
          horse,
          race,
          stable,
          10,
          horseMap,
          index,
        );

        expect(withIndex).toBe(without);
      });
    }
  }

  it("index excludes the evaluated horse exactly like the loop", () => {
    const race = mkRace({
      entries: [
        { horseId: "comp1" },
        { horseId: "cand1" },
        { horseId: "cand1" }, // duplicate self-entry — loop skips all copies
      ] as Race["entries"],
    });
    const stable = mkStable();
    const aiState = createRaceEntryAIState(stable);
    const index = buildRaceCompetitorIndex(race, horseMap);
    expect(
      calculateStrategicEntryScore(aiState, horses[0], race, stable, 10, horseMap, index),
    ).toBe(calculateStrategicEntryScore(aiState, horses[0], race, stable, 10, horseMap));
  });
});
