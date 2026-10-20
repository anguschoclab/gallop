import { describe, expect, it } from "vitest";
import {
  collectPlayerEntryPlans,
  resolveEntryPlan,
  summarizePlan,
  type PlanRaceLike,
} from "@/domains/tactics/model/racePlan";
import type { JockeyInstructions } from "@/domains/tactics/model/tacticsTypes";

const plan = (over: Partial<JockeyInstructions> = {}): JockeyInstructions => ({
  horseId: "h1",
  raceId: "r1",
  ridingStyle: "closer",
  earlyPosition: "drop_back",
  moveTiming: "late",
  aggressiveness: 75,
  ...over,
});

const race = (over: Partial<PlanRaceLike> = {}): PlanRaceLike => ({
  id: "r1",
  name: "Test Stakes",
  day: 10,
  entries: [],
  ...over,
});

describe("resolveEntryPlan", () => {
  it("prefers the newest pending tactics intent over the plan on the entry", () => {
    const r = race({
      entries: [{ horseId: "h1", jockeyInstructions: plan({ ridingStyle: "stalker" }) }],
    });
    const res = resolveEntryPlan(r, "h1", [
      {
        type: "tactics",
        raceId: "r1",
        horseId: "h1",
        jockeyInstructions: plan({ ridingStyle: "tactical" }),
      },
      {
        type: "tactics",
        raceId: "r1",
        horseId: "h1",
        jockeyInstructions: plan({ ridingStyle: "front_runner" }),
      },
    ]);
    expect(res.source).toBe("pending");
    expect(res.instructions?.ridingStyle).toBe("front_runner");
  });

  it("falls back to the entry's saved plan, then to none", () => {
    const r = race({ entries: [{ horseId: "h1", jockeyInstructions: plan() }, { horseId: "h2" }] });
    expect(resolveEntryPlan(r, "h1", []).source).toBe("set");
    expect(resolveEntryPlan(r, "h2", []).source).toBe("none");
  });
});

describe("collectPlayerEntryPlans", () => {
  it("lists confirmed and pending player entries, skipping NPC, past and withdrawn entries", () => {
    const races = {
      r1: race({ entries: [{ horseId: "h1" }, { horseId: "npc" }] }),
      r2: race({ id: "r2", name: "Later Cup", day: 12 }),
      r3: race({ id: "r3", name: "Old", day: 2, entries: [{ horseId: "h1" }] }),
      r4: race({ id: "r4", name: "Dropped", day: 11, entries: [{ horseId: "h2" }] }),
    };
    const rows = collectPlayerEntryPlans(
      races,
      [
        { type: "race_entry", raceId: "r2", horseId: "h2" },
        { type: "race_withdrawal", raceId: "r4", horseId: "h2" },
      ],
      (id) => id !== "npc",
      5,
    );
    expect(rows.map((r) => [r.raceId, r.horseId, r.entryStatus])).toEqual([
      ["r1", "h1", "entered"],
      ["r2", "h2", "pending"],
    ]);
  });
});

describe("summarizePlan", () => {
  it("describes style, position, timing and push", () => {
    expect(summarizePlan(plan())).toBe("Closer · drop back · late charge · 75% push");
  });
});
