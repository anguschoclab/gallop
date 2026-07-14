import { describe, it, expect } from "vitest";
import { HorseHandler } from "@/core/resolver/handlers/HorseHandler";
import type { GameState } from "@/game/store/state";
import type { HorseDeletionImpact } from "@/core/resolver/impacts/horseImpacts";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

function makeHorse(id: string, name: string): any {
  return {
    id,
    name,
    age: 3,
    gender: "colt",
    energy: 80,
    stats: { speed: 50, stamina: 50, acceleration: 50, temperament: 50, conformation: 50, consistency: 50 },
    potential: 70,
    raceHistory: [],
    owned: true,
    healthStatus: "healthy",
    lifecycleStatus: "active",
  };
}

describe("HorseHandler — horse_deletion", () => {
  it("canHandle returns true for horse_deletion", () => {
    const handler = new HorseHandler();
    expect(handler.canHandle("horse_deletion")).toBe(true);
  });

  it("removes horse from draft.horses", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([makeHorse("h1", "Star"), makeHorse("h2", "Comet")]),
    } as unknown as GameState;

    const impact: HorseDeletionImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "systemResolution",
      logLevel: "always",
      type: "horse_deletion",
      horseId: "h1",
      reason: "Retired",
    };

    const draft = JSON.parse(JSON.stringify(state));
    const lookupMaps = {
      horseMap: new Map([
        ["h1", draft.horses["h1"]],
        ["h2", draft.horses["h2"]],
      ]),
      stableMap: new Map(),
      campaignMap: new Map(),
    };

    handler.handle(draft, impact, lookupMaps);

    expect(Object.keys(draft.horses)).toHaveLength(1);
    expect(draft.horses["h1"]).toBeUndefined();
    expect(draft.horses["h2"]).toBeDefined();
  });

  it("removes horse from lookupMaps.horseMap", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([makeHorse("h1", "Star"), makeHorse("h2", "Comet")]),
    } as unknown as GameState;

    const impact: HorseDeletionImpact = {
      id: "imp-2",
      intentId: "",
      day: 10,
      phase: "systemResolution",
      logLevel: "always",
      type: "horse_deletion",
      horseId: "h1",
      reason: "Retired",
    };

    const draft = JSON.parse(JSON.stringify(state));
    const horseMap = new Map([
      ["h1", draft.horses["h1"]],
      ["h2", draft.horses["h2"]],
    ]);
    const lookupMaps = {
      horseMap,
      stableMap: new Map(),
      campaignMap: new Map(),
    };

    handler.handle(draft, impact, lookupMaps);

    expect(lookupMaps.horseMap.has("h1")).toBe(false);
    expect(lookupMaps.horseMap.has("h2")).toBe(true);
  });

  it("is a no-op when horseId does not exist", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([makeHorse("h1", "Star")]),
    } as unknown as GameState;

    const impact: HorseDeletionImpact = {
      id: "imp-3",
      intentId: "",
      day: 10,
      phase: "systemResolution",
      logLevel: "always",
      type: "horse_deletion",
      horseId: "nonexistent",
      reason: "Not found",
    };

    const draft = JSON.parse(JSON.stringify(state));
    const lookupMaps = {
      horseMap: new Map([["h1", draft.horses["h1"]]]),
      stableMap: new Map(),
      campaignMap: new Map(),
    };

    handler.handle(draft, impact, lookupMaps);

    expect(Object.keys(draft.horses)).toHaveLength(1);
    expect(draft.horses["h1"].id).toBe("h1");
  });
});
