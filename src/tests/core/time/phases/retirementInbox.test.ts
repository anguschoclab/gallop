/**
 * retirementInbox.test.ts - Tests for commemorative inbox messages on retirement/HOF.
 *
 * Covers: player pasture retirement, player stud retirement, and Hall of Fame induction.
 */
import { describe, it, expect } from "vitest";
import { pastureRetirementPhase } from "@/core/time/phases/pastureRetirement";
import { managementResolutionPhase } from "@/core/time/phases/managementResolution";
import { hallOfFamePhase } from "@/core/time/phases/hallOfFame";
import { createTestHorse, createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import { makePipelineContext } from "@/tests/helpers/sampleGameState";
import { createRng } from "@/core/common/rng";
import type { PipelineContext } from "@/core/time/pipeline";

const G1_RACE = {
  raceId: "g1-test",
  raceName: "Test Derby",
  position: 1,
  day: 10,
  beyer: 105,
  grade: "G1" as const,
  distance: 2000,
  surface: "Dirt" as const,
  purse: 2_000_000,
  purseEarned: 1_200_000,
  fieldSize: 12,
  raceClass: "Graded" as const,
};

function topPlayerHorse() {
  return createTestHorse({
    id: "top-horse",
    name: "Champion Flash",
    fame: 75,
    lifetimeEarnings: 300_000,
    careerStarts: 10,
    careerWins: 8,
    raceHistory: [G1_RACE],
    gender: "horse" as const,
    age: 5,
  });
}

function nonTopPlayerHorse() {
  return createTestHorse({
    id: "average-horse",
    name: "Plain Jane",
    fame: 30,
    lifetimeEarnings: 15_000,
    careerStarts: 5,
    careerWins: 1,
    raceHistory: [],
  });
}

function hofEligiblePlayerHorse() {
  return createTestHorse({
    id: "hof-horse",
    name: "Legendary Spirit",
    fame: 90,
    lifetimeEarnings: 800_000,
    careerStarts: 20,
    careerWins: 15,
    raceHistory: [
      { ...G1_RACE, raceId: "g1-1", day: 10 },
      { ...G1_RACE, raceId: "g1-2", day: 50 },
      { ...G1_RACE, raceId: "g1-3", day: 100 },
    ],
    lifecycleStatus: "retired" as const,
  });
}

function makeContext(stateOverrides: any, intents: any[] = []): PipelineContext {
  return {
    ...makePipelineContext({
      state: stateOverrides,
      intents,
      newDay: 200,
    }),
    dailyRng: createRng(42),
  } as PipelineContext;
}

function findInboxMessages(impacts: any[]) {
  return impacts.filter((i) => i.type === "inbox_message");
}

describe("Pasture Retirement — commemorative inbox", () => {
  it("creates an inbox_message for a top player-owned horse", () => {
    const horse = topPlayerHorse();
    const ctx = makeContext({ horses: [horse] }, [
      { type: "pasture_retirement", horseId: horse.id },
    ]);
    const out = pastureRetirementPhase.execute(ctx);
    const inboxMsgs = findInboxMessages(out.impacts);

    expect(inboxMsgs.length).toBe(1);
    expect(inboxMsgs[0].message.category).toBe("retirement");
    expect(inboxMsgs[0].message.title).toBe("Champion Flash Retired to Pasture");
    expect(inboxMsgs[0].message.body).toContain("Champion Flash has been retired to pasture");
    expect(inboxMsgs[0].message.body).toContain("1 G1 win");
    expect(inboxMsgs[0].message.cta?.route).toBe("stable.$horseId");
    expect(inboxMsgs[0].message.cta?.params?.horseId).toBe(horse.id);
  });

  it("does NOT create an inbox_message for a non-top player-owned horse", () => {
    const horse = nonTopPlayerHorse();
    const ctx = makeContext({ horses: [horse] }, [
      { type: "pasture_retirement", horseId: horse.id },
    ]);
    const out = pastureRetirementPhase.execute(ctx);
    const inboxMsgs = findInboxMessages(out.impacts);

    expect(inboxMsgs.length).toBe(0);
  });

  it("does NOT create an inbox_message for an NPC horse", () => {
    const horse = createTestNpcHorse({
      id: "npc-horse",
      name: "NPC Star",
      fame: 75,
      lifetimeEarnings: 300_000,
      raceHistory: [G1_RACE],
      lifecycleStatus: "active" as const,
    });
    const ctx = makeContext({ horses: [horse] }, [
      { type: "pasture_retirement", horseId: horse.id },
    ]);
    const out = pastureRetirementPhase.execute(ctx);
    const inboxMsgs = findInboxMessages(out.impacts);

    expect(inboxMsgs.length).toBe(0);
  });
});

describe("Stud Retirement — commemorative inbox", () => {
  it("creates an inbox_message for a top player-owned horse", () => {
    const horse = topPlayerHorse();
    const ctx = makeContext({ horses: [horse] }, [
      {
        type: "stud_retirement",
        horseId: horse.id,
        standingFee: 5000,
        bookSize: 20,
      },
    ]);
    const out = managementResolutionPhase.execute(ctx);
    const inboxMsgs = findInboxMessages(out.impacts);

    expect(inboxMsgs.length).toBe(1);
    expect(inboxMsgs[0].message.category).toBe("retirement");
    expect(inboxMsgs[0].message.title).toBe("Champion Flash Retired to Stud");
    expect(inboxMsgs[0].message.body).toContain("Standing Fee: $5,000");
    expect(inboxMsgs[0].message.cta?.route).toBe("stable.$horseId");
  });

  it("does NOT create an inbox_message for a non-top player-owned horse", () => {
    const horse = nonTopPlayerHorse();
    const ctx = makeContext({ horses: [horse] }, [
      {
        type: "stud_retirement",
        horseId: horse.id,
        standingFee: 500,
        bookSize: 20,
      },
    ]);
    const out = managementResolutionPhase.execute(ctx);
    const inboxMsgs = findInboxMessages(out.impacts);

    expect(inboxMsgs.length).toBe(0);
  });
});

describe("Hall of Fame — commemorative inbox", () => {
  it("creates an inbox_message for a player-owned HOF-eligible horse", () => {
    const horse = hofEligiblePlayerHorse();
    const ctx = makeContext({ horses: [horse], hallOfFame: [] });
    const out = hallOfFamePhase.execute(ctx);
    const inboxMsgs = findInboxMessages(out.impacts);

    expect(inboxMsgs.length).toBe(1);
    expect(inboxMsgs[0].message.category).toBe("hall_of_fame");
    expect(inboxMsgs[0].message.priority).toBe("action");
    expect(inboxMsgs[0].message.title).toBe("Legendary Spirit — Hall of Fame Inductee");
    expect(inboxMsgs[0].message.body).toContain("3 G1 Wins");
    expect(inboxMsgs[0].message.cta?.route).toBe("stable.$horseId");
  });

  it("does NOT create an inbox_message for an NPC HOF-eligible horse", () => {
    const horse = createTestNpcHorse({
      id: "npc-hof",
      name: "NPC Legend",
      fame: 90,
      lifetimeEarnings: 800_000,
      careerStarts: 20,
      careerWins: 15,
      raceHistory: [
        { ...G1_RACE, raceId: "g1-1", day: 10 },
        { ...G1_RACE, raceId: "g1-2", day: 50 },
        { ...G1_RACE, raceId: "g1-3", day: 100 },
      ],
      lifecycleStatus: "retired" as const,
    });
    const ctx = makeContext({ horses: [horse], hallOfFame: [] });
    const out = hallOfFamePhase.execute(ctx);
    const inboxMsgs = findInboxMessages(out.impacts);

    expect(inboxMsgs.length).toBe(0);
  });
});
