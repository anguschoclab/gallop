import { describe, it, expect } from "vitest";
import { createDefaultSystemsState } from "@/game/store/state/systemsState";

describe("SystemsState types", () => {
  it("createDefaultSystemsState includes outposts: []", () => {
    const state = createDefaultSystemsState();
    expect(state.outposts).toEqual([]);
  });

  it("createDefaultSystemsState includes weather with empty byTrack and forecast", () => {
    const state = createDefaultSystemsState();
    expect(state.weather).toBeDefined();
    expect(state.weather?.byTrack).toEqual({});
    expect(state.weather?.forecast).toEqual({});
  });

  it("createDefaultSystemsState with options includes outposts: []", () => {
    const state = createDefaultSystemsState({
      profile: {
        stableName: "Test",
        ownerName: "Owner",
        silk: { pattern: "solid", primary: "#000", secondary: "#fff", cap: "#000" },
        backstoryId: "inheritor",
        founded: 1,
      },
      backstory: {
        id: "inheritor",
        label: "The Inheritor",
        blurb: "Test",
        startingCash: 100000,
        horses: {},
        facilityUpgrades: {},
        facilities: {},
        reputationScore: 50,
        reputation: 50,
        difficulty: "easy",
      },
    });
    expect(state.outposts).toEqual([]);
    expect(state.weather).toBeDefined();
    expect(state.weather?.byTrack).toEqual({});
    expect(state.weather?.forecast).toEqual({});
  });
});
