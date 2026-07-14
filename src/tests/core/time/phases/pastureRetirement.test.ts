/**
 * pastureRetirement.test.ts - Comprehensive tests for the pasture retirement phase.
 *
 * Covers all three sections: player intent processing, NPC auto-retirement,
 * and horse deletion. Also covers edge cases and impact accumulation.
 */
import { describe, it, expect } from "vitest";
import { pastureRetirementPhase } from "@/core/time/phases/pastureRetirement";
import { createTestHorse, createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import { makePipelineContext } from "@/tests/helpers/sampleGameState";
import { createRng } from "@/core/common/rng";
import type { PipelineContext } from "@/core/time/pipeline";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

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

function makeContext(stateOverrides: any, intents: any[] = [], newDay = 200): PipelineContext {
  return {
    ...makePipelineContext({
      state: stateOverrides,
      intents,
      newDay,
    }),
    dailyRng: createRng(42),
  } as PipelineContext;
}

function findImpacts(impacts: AnyImpact[], type: string) {
  return impacts.filter((i: any) => i.type === type);
}

// ---------------------------------------------------------------------------
// Section 1 — Player Intent Processing
// ---------------------------------------------------------------------------
describe("Pasture Retirement — Section 1: Player Intent Processing", () => {
  it("retires an active horse via intent and emits pasture_retirement + log impacts", () => {
    const horse = createTestHorse({ id: "h1", name: "Speedy", lifecycleStatus: "active" });
    const ctx = makeContext({ horses: h2r([horse]) }, [
      { id: "intent-1", type: "pasture_retirement", horseId: "h1" },
    ]);
    const out = pastureRetirementPhase.execute(ctx);

    const retireImpacts = findImpacts(out.impacts, "pasture_retirement");
    expect(retireImpacts.length).toBe(1);
    expect(retireImpacts[0]).toMatchObject({
      horseId: "h1",
      reason: "Voluntary retirement to pasture",
    });

    const logImpacts = findImpacts(out.impacts, "log");
    expect(logImpacts.length).toBe(1);
    expect((logImpacts[0] as any).text).toContain("Speedy has been retired to pasture");
  });

  it("skips intent for non-existent horseId — no impacts", () => {
    const ctx = makeContext({ horses: {} }, [
      { id: "intent-1", type: "pasture_retirement", horseId: "ghost" },
    ]);
    const out = pastureRetirementPhase.execute(ctx);
    expect(out.impacts.length).toBe(0);
  });

  it("skips intent for already-retired horse — no impacts", () => {
    const horse = createTestHorse({ id: "h1", name: "Old Timer", lifecycleStatus: "retired" });
    const ctx = makeContext({ horses: h2r([horse]) }, [
      { id: "intent-1", type: "pasture_retirement", horseId: "h1" },
    ]);
    const out = pastureRetirementPhase.execute(ctx);
    expect(findImpacts(out.impacts, "pasture_retirement").length).toBe(0);
  });

  it("skips intent for deceased horse — no impacts", () => {
    const horse = createTestHorse({ id: "h1", name: "Ghost", lifecycleStatus: "deceased" });
    const ctx = makeContext({ horses: h2r([horse]) }, [
      { id: "intent-1", type: "pasture_retirement", horseId: "h1" },
    ]);
    const out = pastureRetirementPhase.execute(ctx);
    expect(findImpacts(out.impacts, "pasture_retirement").length).toBe(0);
  });

  it("emits inbox_message for a top player-owned horse (no stableId)", () => {
    const horse = createTestHorse({
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
    const ctx = makeContext({ horses: h2r([horse]) }, [
      { id: "intent-1", type: "pasture_retirement", horseId: "top-horse" },
    ]);
    const out = pastureRetirementPhase.execute(ctx);
    const inboxMsgs = findImpacts(out.impacts, "inbox_message");
    expect(inboxMsgs.length).toBe(1);
    expect((inboxMsgs[0] as any).message.category).toBe("retirement");
    expect((inboxMsgs[0] as any).message.title).toBe("Champion Flash Retired to Pasture");
  });

  it("does NOT emit inbox_message for a non-top player-owned horse", () => {
    const horse = createTestHorse({
      id: "avg-horse",
      name: "Plain Jane",
      fame: 30,
      lifetimeEarnings: 15_000,
      careerStarts: 5,
      careerWins: 1,
      raceHistory: [],
    });
    const ctx = makeContext({ horses: h2r([horse]) }, [
      { id: "intent-1", type: "pasture_retirement", horseId: "avg-horse" },
    ]);
    const out = pastureRetirementPhase.execute(ctx);
    expect(findImpacts(out.impacts, "inbox_message").length).toBe(0);
  });

  it("does NOT emit inbox_message for an NPC horse (has stableId)", () => {
    const horse = createTestNpcHorse({
      id: "npc-horse",
      name: "NPC Star",
      fame: 75,
      lifetimeEarnings: 300_000,
      raceHistory: [G1_RACE],
      lifecycleStatus: "active" as const,
    });
    const ctx = makeContext({ horses: h2r([horse]) }, [
      { id: "intent-1", type: "pasture_retirement", horseId: "npc-horse" },
    ]);
    const out = pastureRetirementPhase.execute(ctx);
    expect(findImpacts(out.impacts, "inbox_message").length).toBe(0);
  });

  it("processes multiple intents in one call", () => {
    const h1 = createTestHorse({ id: "h1", name: "Horse One", lifecycleStatus: "active" });
    const h2 = createTestHorse({ id: "h2", name: "Horse Two", lifecycleStatus: "active" });
    const ctx = makeContext({ horses: h2r([h1, h2]) }, [
      { id: "i1", type: "pasture_retirement", horseId: "h1" },
      { id: "i2", type: "pasture_retirement", horseId: "h2" },
    ]);
    const out = pastureRetirementPhase.execute(ctx);
    expect(findImpacts(out.impacts, "pasture_retirement").length).toBe(2);
    expect(findImpacts(out.impacts, "log").length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Section 2 — NPC Auto-Retirement
// ---------------------------------------------------------------------------
describe("Pasture Retirement — Section 2: NPC Auto-Retirement", () => {
  it("retires NPC horse age >= 8 with reason 'old age'", () => {
    const horse = createTestNpcHorse({
      id: "npc-old",
      name: "Old NPC",
      age: 8,
      lifecycleStatus: "active" as const,
      raceHistory: [{ ...G1_RACE, raceId: "r1", day: 195, position: 5 }],
    });
    const ctx = makeContext({ horses: h2r([horse]) }, [], 200);
    const out = pastureRetirementPhase.execute(ctx);

    const retireImpacts = findImpacts(out.impacts, "pasture_retirement");
    expect(retireImpacts.length).toBe(1);
    expect((retireImpacts[0] as any).reason).toContain("old age");
  });

  it("retires NPC horse age >= 6 + inactive > 90 days with reason 'age and inactivity'", () => {
    const horse = createTestNpcHorse({
      id: "npc-inactive",
      name: "Rusty NPC",
      age: 6,
      fame: 50,
      lifecycleStatus: "active" as const,
      raceHistory: [{ ...G1_RACE, raceId: "r1", day: 100, position: 3 }],
    });
    const ctx = makeContext({ horses: h2r([horse]) }, [], 200);
    const out = pastureRetirementPhase.execute(ctx);

    const retireImpacts = findImpacts(out.impacts, "pasture_retirement");
    expect(retireImpacts.length).toBe(1);
    expect((retireImpacts[0] as any).reason).toContain("age and inactivity");
  });

  it("retires NPC horse age >= 5 + low fame + no graded wins with reason 'limited career success'", () => {
    const horse = createTestNpcHorse({
      id: "npc-low",
      name: "Slow NPC",
      age: 5,
      fame: 10,
      lifecycleStatus: "active" as const,
      raceHistory: [{ ...G1_RACE, raceId: "r1", day: 195, position: 5 }],
    });
    const ctx = makeContext({ horses: h2r([horse]) }, [], 200);
    const out = pastureRetirementPhase.execute(ctx);

    const retireImpacts = findImpacts(out.impacts, "pasture_retirement");
    expect(retireImpacts.length).toBe(1);
    expect((retireImpacts[0] as any).reason).toContain("limited career success");
  });

  it("skips NPC horse at stud — no retirement", () => {
    const horse = createTestNpcHorse({
      id: "npc-stud",
      name: "Stud NPC",
      age: 10,
      fame: 10,
      lifecycleStatus: "active" as const,
      stud: { atStud: true, studFee: 5000, seasonStart: 1, bookSize: 0, totalBookings: 0 } as any,
    });
    const ctx = makeContext({ horses: h2r([horse]) }, [], 200);
    const out = pastureRetirementPhase.execute(ctx);
    expect(findImpacts(out.impacts, "pasture_retirement").length).toBe(0);
  });

  it("does NOT retire a young active NPC horse with recent race", () => {
    const horse = createTestNpcHorse({
      id: "npc-young",
      name: "Young NPC",
      age: 4,
      fame: 50,
      lifecycleStatus: "active" as const,
      raceHistory: [{ ...G1_RACE, raceId: "r1", day: 195, position: 2 }],
    });
    const ctx = makeContext({ horses: h2r([horse]) }, [], 200);
    const out = pastureRetirementPhase.execute(ctx);
    expect(findImpacts(out.impacts, "pasture_retirement").length).toBe(0);
  });

  it("does NOT retire NPC horse with a graded win as low achiever", () => {
    const horse = createTestNpcHorse({
      id: "npc-graded",
      name: "Graded NPC",
      age: 5,
      fame: 10,
      lifecycleStatus: "active" as const,
      raceHistory: [{ ...G1_RACE, raceId: "r1", day: 195, position: 1, grade: "G3" as const }],
    });
    const ctx = makeContext({ horses: h2r([horse]) }, [], 200);
    const out = pastureRetirementPhase.execute(ctx);
    expect(findImpacts(out.impacts, "pasture_retirement").length).toBe(0);
  });

  it("excludes player-owned horses (no stableId) from NPC auto-retirement", () => {
    const horse = createTestHorse({
      id: "player-old",
      name: "Old Player Horse",
      age: 10,
      fame: 10,
      lifecycleStatus: "active" as const,
    });
    const ctx = makeContext({ horses: h2r([horse]) }, [], 200);
    const out = pastureRetirementPhase.execute(ctx);
    expect(findImpacts(out.impacts, "pasture_retirement").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Section 3 — Horse Deletion
// ---------------------------------------------------------------------------
describe("Pasture Retirement — Section 3: Horse Deletion", () => {
  it("emits horse_deletion for deceased horse with 0 wins", () => {
    const horse = createTestHorse({
      id: "dead-0",
      name: "Dead Zero",
      lifecycleStatus: "deceased",
      careerWins: 0,
    });
    const ctx = makeContext({ horses: h2r([horse]) }, []);
    const out = pastureRetirementPhase.execute(ctx);
    const deletions = findImpacts(out.impacts, "horse_deletion");
    expect(deletions.length).toBe(1);
    expect((deletions[0] as any).horseId).toBe("dead-0");
  });

  it("emits horse_deletion for retired horse with 0 wins", () => {
    const horse = createTestHorse({
      id: "ret-0",
      name: "Retired Zero",
      lifecycleStatus: "retired",
      careerWins: 0,
    });
    const ctx = makeContext({ horses: h2r([horse]) }, []);
    const out = pastureRetirementPhase.execute(ctx);
    expect(findImpacts(out.impacts, "horse_deletion").length).toBe(1);
  });

  it("does NOT delete deceased horse with 1+ wins", () => {
    const horse = createTestHorse({
      id: "dead-1",
      name: "Dead Winner",
      lifecycleStatus: "deceased",
      careerWins: 3,
    });
    const ctx = makeContext({ horses: h2r([horse]) }, []);
    const out = pastureRetirementPhase.execute(ctx);
    expect(findImpacts(out.impacts, "horse_deletion").length).toBe(0);
  });

  it("does NOT delete active horse with 0 wins", () => {
    const horse = createTestHorse({
      id: "active-0",
      name: "Active Zero",
      lifecycleStatus: "active",
      careerWins: 0,
    });
    const ctx = makeContext({ horses: h2r([horse]) }, []);
    const out = pastureRetirementPhase.execute(ctx);
    expect(findImpacts(out.impacts, "horse_deletion").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------
describe("Pasture Retirement — Integration", () => {
  it("empty horses + empty intents → no impacts, context preserved", () => {
    const ctx = makeContext({ horses: {} }, []);
    const out = pastureRetirementPhase.execute(ctx);
    expect(out.impacts.length).toBe(0);
    expect(out.newDay).toBe(ctx.newDay);
    expect(out.state).toBe(ctx.state);
  });

  it("preserves existing context.impacts and appends new ones", () => {
    const horse = createTestHorse({ id: "h1", name: "Speedy", lifecycleStatus: "active" });
    const existingImpact = { id: "old-1", type: "log", text: "pre-existing" } as any;
    const ctx = makeContext({ horses: h2r([horse]) }, [
      { id: "intent-1", type: "pasture_retirement", horseId: "h1" },
    ]);
    ctx.impacts = [existingImpact];
    const out = pastureRetirementPhase.execute(ctx);
    expect(out.impacts.length).toBe(1 + 2); // existing + pasture_retirement + log
    expect(out.impacts[0]).toBe(existingImpact);
  });
});
