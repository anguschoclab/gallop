import { describe, it, expect } from "vitest";
import { createDefaultGameState } from "@/platform/game/store/state";
import type { GameState, Race } from "@/platform/game/types";
import type { PipelineContext } from "@/platform/time/pipeline";
import type { AnyIntent } from "@/platform/resolver/intents";
import type { RaceSnapshot } from "@/domains/race/model/engine/raceSnapshotTypes";
import type { RaceRunner } from "@/domains/race/simulation/types";
import type { RaceResultImpact } from "@/platform/resolver/impacts/raceImpacts";
import { raceResolutionPhase } from "@/platform/time/phases/raceResolution";
import { applyLiveRaceResolution } from "@/domains/race/simulation/liveResolution";
import { applyImpacts } from "@/platform/resolver/resolver";
import { createRng } from "@/shared/common/rng";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makePlayerOwned } from "@/domains/horse/simulation/ownership";

function makeRace(overrides: Partial<Race> & { id: string }): Race {
  return {
    name: "Test Race",
    day: 10,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 0,
    purse: 1000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    surface: "Turf",
    ...overrides,
  } as Race;
}

function makeSnapshots(): RaceSnapshot[] {
  return [
    { t: 0, horses: [{ horseId: "h-1", position: 0, lane: 1, velocity: 0 }] },
    { t: 1, horses: [{ horseId: "h-1", position: 5, lane: 1, velocity: 15 }] },
  ];
}

/** Snapshots that cross every quarter marker of a 1600m race. */
function makeFullDistanceSnapshots(): RaceSnapshot[] {
  return [0, 400, 800, 1200, 1600].map((position, i) => ({
    t: i * 30,
    horses: [{ horseId: "h-1", position, lane: 1, velocity: 15 }],
  }));
}

function makeMinimalState(races: Record<string, Race> = {}): GameState {
  return {
    day: 10,
    races,
    horses: {},
    jockeys: [],
    npcStables: [],
    hiredStaff: [],
    pendingIntents: [],
  } as unknown as GameState;
}

function makeContext(overrides: Partial<PipelineContext> = {}): PipelineContext {
  return {
    previousDay: 10,
    newDay: 11,
    state: makeMinimalState(),
    logs: [],
    dailyRng: createRng("test-pipeline"),
    intents: [],
    impacts: [],
    impactLog: [],
    horseMap: new Map(),
    raceMap: new Map(),
    stableMap: new Map(),
    jockeyMap: new Map(),
    ...overrides,
  } as PipelineContext;
}

function liveIntent(overrides: Record<string, unknown> = {}): AnyIntent {
  return {
    id: "res-1",
    entityId: "r1",
    source: "system",
    day: 10,
    priority: 10,
    type: "race_resolution",
    raceId: "r1",
    results: [{ horseId: "h-1", position: 1, time: 95.5 }],
    runners: [],
    liveImpactsApplied: true,
    ...overrides,
  } as unknown as AnyIntent;
}

function applyPhaseImpacts(phaseResult: PipelineContext): GameState {
  return applyImpacts({
    state: phaseResult.state,
    intents: [],
    impacts: phaseResult.impacts,
    impactLog: [],
    day: 11,
  }).state;
}

describe("replay persistence (Option B: read from race.snapshots)", () => {
  it("resolved headless races have snapshots stored on the race object", () => {
    const state = createDefaultGameState();
    const race = makeRace({
      id: "r-1",
      resolved: true,
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      snapshots: makeSnapshots(),
    });
    state.races = { "r-1": race };
    expect(state.races["r-1"].snapshots).toBeDefined();
    expect(state.races["r-1"].snapshots!.length).toBeGreaterThan(0);
  });

  it("live-resolved races keep their snapshots through impact application", () => {
    const snapshots = makeSnapshots();
    const ctx = makeContext({
      state: makeMinimalState({ r1: makeRace({ id: "r1", day: 11 }) }),
      intents: [liveIntent({ snapshots })],
    });

    const phaseResult = raceResolutionPhase.execute(ctx);

    // The resolution phase writes the intent's snapshots onto the stored race.
    const stored = phaseResult.state.races["r1"];
    expect(stored.resolved).toBe(true);
    expect(stored.snapshots).toEqual(snapshots);

    // The emitted race_result impact must carry the same snapshots it writes
    // back at impact application, or it erases what the phase just stored.
    const raceResultImpact = phaseResult.impacts.find(
      (i) => i.type === "race_result",
    ) as RaceResultImpact | undefined;
    expect(raceResultImpact?.snapshots).toEqual(snapshots);

    const applied = applyPhaseImpacts(phaseResult);
    expect(applied.races["r1"].snapshots!.length).toBeGreaterThan(0);
  });

  it("live-resolved race history entries carry pacePositions", () => {
    const state = createDefaultGameState();
    state.horses = { "h-1": createTestHorse({ id: "h-1", ownership: makePlayerOwned() }) };
    state.races = {
      r1: makeRace({
        id: "r1",
        entries: [{ horseId: "h-1", ownership: makePlayerOwned() } as Race["entries"][number]],
      }),
    };
    state.pendingIntents = [];

    const runners: RaceRunner[] = [
      {
        horseId: "h-1",
        name: "H1",
        silk: "#000",
        ownership: makePlayerOwned(),
        jockeyId: "j-1",
        jockeyName: "J1",
        gate: 1,
        lane: 1,
      } as RaceRunner,
    ];

    const newState = applyLiveRaceResolution(state, {
      raceId: "r1",
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      runners,
      snapshots: makeFullDistanceSnapshots(),
    });

    const history = newState.horses["h-1"].raceHistory;
    const entry = history[history.length - 1];
    expect(entry?.pacePositions).toHaveLength(4);
  });

  it("a resolution intent without snapshots resolves with empty snapshots", () => {
    const ctx = makeContext({
      state: makeMinimalState({ r1: makeRace({ id: "r1", day: 11 }) }),
      intents: [liveIntent()],
    });

    const phaseResult = raceResolutionPhase.execute(ctx);
    const applied = applyPhaseImpacts(phaseResult);
    expect(applied.races["r1"].resolved).toBe(true);
    expect(applied.races["r1"].snapshots).toEqual([]);
  });

  it("unresolved races may have no snapshots", () => {
    const state = createDefaultGameState();
    const race = makeRace({ id: "r-1", resolved: false });
    state.races = { "r-1": race };
    expect(state.races["r-1"].snapshots).toBeUndefined();
  });
});
