import { describe, it, expect } from "vitest";
import { schedulerPhase } from "@/platform/time/phases/schedulerPhase";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse, createTestJockey } from "@/tests/helpers";
import type { GameState } from "@/platform/game/types";
import type { PipelineContext } from "@/platform/time/pipeline";
import { makePlayerOwned, makeUnowned } from "@/domains/horse/simulation/ownership";

describe("schedulerPhase", () => {
  it("should return context unchanged when no campaigns exist", () => {
    const state = makeGameState({ campaigns: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should return context unchanged when campaigns is undefined", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should skip campaigns for non-owned horses", () => {
    const horse = createTestHorse({ id: "horse-1", ownership: makeUnowned() });
    const campaign = {
      id: "camp-1",
      horseId: "horse-1",
      autoManaged: true,
      slots: [],
      lastReviewedDay: 0,
      confirmedAptitudes: {},
      flags: {},
    };
    const state = makeGameState({
      horses: h2r([horse]),
      campaigns: [campaign as any],
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);
    expect(result.state.campaigns).toHaveLength(1);
  });

  it("should handle empty state gracefully", () => {
    const state = makeGameState({ campaigns: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);
    expect(result).toBe(context);
  });

  it("schedulerPhase does not emit cash_change for entry fees", () => {
    const horse = createTestHorse({ id: "horse-1", ownership: makePlayerOwned() });
    const campaign = {
      id: "camp-1",
      horseId: "horse-1",
      autoManaged: true,
      slots: [
        {
          raceId: "race-1",
          status: "planned",
          dayTarget: 1,
        },
      ],
      lastReviewedDay: 0,
      confirmedAptitudes: {},
      flags: {},
    };
    const state = makeGameState({
      day: 1,
      cash: 100000,
      horses: h2r([horse]),
      campaigns: [campaign as any],
      races: {
        "race-1": {
          id: "race-1",
          name: "Test Race",
          day: 1,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          fieldSize: 8,
          entries: [],
          resolved: false,
        },
      } as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);

    const cashChangeImpacts = result.impacts.filter((i) => i.type === "cash_change");
    expect(cashChangeImpacts).toHaveLength(0);

    const raceEntryImpacts = result.impacts.filter((i) => i.type === "race_entry");
    expect(raceEntryImpacts.length).toBeGreaterThan(0);
  });

  it("schedulerPhase does not double-enter horse already entered via intentCollection", () => {
    const horse = createTestHorse({ id: "horse-dup", ownership: makePlayerOwned() });
    const campaign = {
      id: "camp-dup",
      horseId: "horse-dup",
      autoManaged: true,
      slots: [
        {
          raceId: "race-dup",
          status: "planned",
          dayTarget: 1,
        },
      ],
      lastReviewedDay: 0,
      confirmedAptitudes: {},
      flags: {},
    };
    const state = makeGameState({
      day: 1,
      cash: 100000,
      horses: h2r([horse]),
      campaigns: [campaign as any],
      races: {
        "race-dup": {
          id: "race-dup",
          name: "Dup Test Race",
          day: 1,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          fieldSize: 8,
          // Horse already entered — simulates intentCollection having processed first
          entries: [{ horseId: "horse-dup", ownership: makePlayerOwned() }],
          resolved: false,
        },
      } as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);

    const raceEntryImpacts = result.impacts.filter(
      (i) => i.type === "race_entry" && (i as any).horseId === "horse-dup",
    );
    expect(raceEntryImpacts).toHaveLength(0);
  });
});

describe("runDailyAutoEntry", () => {
  const autoRace = (id: string, day: number) =>
    ({
      id,
      name: "Auto Race",
      day,
      distance: 1600,
      raceClass: "Allowance",
      entryFee: 300,
      purse: 6000,
      fieldSize: 8,
      entries: [],
      resolved: false,
    }) as any;

  it("excludes campaign-managed and pending-entry horses from auto-entry", () => {
    const eligible = { age: 4, gender: "horse" as const, ownership: makePlayerOwned() };
    const campaignHorse = createTestHorse({ id: "h-campaign", ...eligible });
    const pendingHorse = createTestHorse({ id: "h-pending", ...eligible });
    const eligibleHorse = createTestHorse({ id: "h-eligible", ...eligible });
    const campaign = {
      id: "camp-auto",
      horseId: "h-campaign",
      autoManaged: true,
      slots: [],
      lastReviewedDay: 0,
      confirmedAptitudes: {},
      flags: {},
    };
    const pendingEntry = {
      id: "imp-pending",
      intentId: "",
      day: 5,
      phase: "intentCollection",
      logLevel: "never",
      type: "race_entry",
      raceId: "race-other",
      horseId: "h-pending",
      entryFee: 0,
    } as any;
    const state = makeGameState({
      day: 5,
      cash: 100000,
      horses: h2r([campaignHorse, pendingHorse, eligibleHorse]),
      races: { "race-auto": autoRace("race-auto", 8) },
      jockeys: [createTestJockey({ id: "j1" })],
      campaigns: [campaign as any],
      userSettings: { gameplay: { autoEnterRaces: true } } as any,
    }) as GameState;
    const context = makePipelineContext({
      state,
      newDay: 5,
      impacts: [pendingEntry],
    }) as PipelineContext;

    const result = schedulerPhase.execute(context);

    const emittedHorseIds = result.impacts
      .filter((i) => i.type === "race_entry" && (i as any).phase === "scheduler")
      .map((i: any) => i.horseId);
    expect(emittedHorseIds).toContain("h-eligible");
    expect(emittedHorseIds).not.toContain("h-campaign");
    expect(emittedHorseIds).not.toContain("h-pending");
  });

  it("emits no race_entry impacts when autoEnterRaces is disabled", () => {
    const horse = createTestHorse({
      id: "h1",
      age: 4,
      gender: "horse",
      ownership: makePlayerOwned(),
    });
    const state = makeGameState({
      day: 5,
      cash: 100000,
      horses: h2r([horse]),
      races: { "race-auto": autoRace("race-auto", 8) },
      jockeys: [createTestJockey({ id: "j1" })],
      campaigns: [],
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 5 }) as PipelineContext;

    const result = schedulerPhase.execute(context);
    expect(result.impacts.filter((i) => i.type === "race_entry")).toHaveLength(0);
  });
});
