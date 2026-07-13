import { describe, it, expect } from "vitest";
import { stewardsPhase } from "@/core/time/phases/stewardsPhase";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { Race, Horse } from "@/game/types";

function makeResolvedRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 1,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 0,
    purse: 5000,
    fieldSize: 6,
    resolved: true,
    result: [
      { horseId: "h1", position: 1, time: 96.0 },
      { horseId: "h2", position: 2, time: 96.5 },
      { horseId: "h3", position: 3, time: 97.0 },
    ],
    entries: [
      { horseId: "h1", owned: false },
      { horseId: "h2", owned: false },
      { horseId: "h3", owned: false },
    ],
    ...overrides,
  } as Race;
}

function makeOwned(id: string): Partial<Horse> {
  return { id, owned: true, name: `Horse ${id}` };
}

describe("stewardsPhase — player-entry guard", () => {
  it("never emits an inquiry for a race that contains a player-owned horse", () => {
    // Use a fixed seed that would normally trigger the 5% inquiry roll (rng → 0.03).
    // The guard must fire BEFORE the roll so no inquiry is ever emitted.
    const race = makeResolvedRace({
      entries: [
        { horseId: "player-horse", owned: true } as any,
        { horseId: "npc-h2", owned: false } as any,
        { horseId: "npc-h3", owned: false } as any,
      ],
      result: [
        { horseId: "player-horse", position: 1, time: 96.0 },
        { horseId: "npc-h2", position: 2, time: 96.5 },
        { horseId: "npc-h3", position: 3, time: 97.0 },
      ],
    });

    const horses = [makeOwned("player-horse")] as Horse[];

    const ctx = makePipelineContext({
      newDay: 1,
      state: makeGameState({ races: [race], horses }) as any,
    });

    const result = stewardsPhase.execute(ctx as any);
    const inquiryImpacts = result.impacts.filter((i: any) => i.type === "stewards_inquiry");
    expect(inquiryImpacts).toHaveLength(0);
  });

  it("can still emit an inquiry for a race with no player-owned horses", () => {
    // Run many differently-seeded races so at least one triggers the 5% chance
    const impacts: any[] = [];

    for (let raceNum = 0; raceNum < 60; raceNum++) {
      const race = makeResolvedRace({
        id: `npc-race-${raceNum}`,
        entries: [
          { horseId: `n${raceNum}-h1`, owned: false } as any,
          { horseId: `n${raceNum}-h2`, owned: false } as any,
          { horseId: `n${raceNum}-h3`, owned: false } as any,
        ],
        result: [
          { horseId: `n${raceNum}-h1`, position: 1, time: 96.0 },
          { horseId: `n${raceNum}-h2`, position: 2, time: 96.5 },
          { horseId: `n${raceNum}-h3`, position: 3, time: 97.0 },
        ],
      });

      const ctx = makePipelineContext({
        newDay: raceNum + 1,
        state: makeGameState({ races: [race], horses: [] }) as any,
      });

      const result = stewardsPhase.execute(ctx as any);
      impacts.push(...result.impacts.filter((i: any) => i.type === "stewards_inquiry"));
    }

    // With 60 NPC races at 5% each, we almost certainly get at least one inquiry
    expect(impacts.length).toBeGreaterThan(0);
  });

  it("skips a race that already has inquiries attached", () => {
    const race = makeResolvedRace({
      id: "already-inquired",
      inquiries: [{ id: "existing", type: "interference" }] as any,
      entries: [{ horseId: "h1", owned: false } as any, { horseId: "h2", owned: false } as any],
    });

    const ctx = makePipelineContext({
      newDay: 1,
      state: makeGameState({ races: [race], horses: [] }) as any,
    });

    const result = stewardsPhase.execute(ctx as any);
    const inquiryImpacts = result.impacts.filter((i: any) => i.type === "stewards_inquiry");
    expect(inquiryImpacts).toHaveLength(0);
  });

  it("skips unresolved races", () => {
    const race = makeResolvedRace({ resolved: false, result: [] });
    const ctx = makePipelineContext({
      newDay: 1,
      state: makeGameState({ races: [race], horses: [] }) as any,
    });
    const result = stewardsPhase.execute(ctx as any);
    expect(result.impacts.filter((i: any) => i.type === "stewards_inquiry")).toHaveLength(0);
  });
});
