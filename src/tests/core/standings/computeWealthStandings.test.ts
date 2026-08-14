import { describe, it, expect } from "vitest";
import { computeWealthStandings } from "@/core/standings/computeWealthStandings";
import { createDefaultGameState } from "@/game/store/state";
import type { GameState, Horse } from "@/game/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";

function mkState(overrides: Partial<GameState> = {}): GameState {
  return { ...createDefaultGameState(), ...overrides };
}

const PLAYER_ID = "__player__";

describe("computeWealthStandings", () => {
  it("returns player entry with zero wealth when no horses exist", () => {
    const s = mkState();
    const result = computeWealthStandings(s);
    expect(result.standings.length).toBeGreaterThanOrEqual(1);
    const player = result.standings.find((e) => e.isPlayer);
    expect(player).toBeTruthy();
    expect(player!.cash).toBe(s.cash);
    expect(player!.horseAssets).toBe(0);
    expect(player!.totalWealth).toBe(s.cash);
    expect(player!.horseCount).toBe(0);
    expect(player!.topHorseValue).toBe(0);
  });

  it("sums horseMarketValue for all player-owned horses into horseAssets", () => {
    const h1 = createTestHorse({ id: "h1", owned: true, name: "Horse 1" });
    const h2 = createTestHorse({ id: "h2", owned: true, name: "Horse 2" });
    const s = mkState({ horses: { h1, h2 } });
    const result = computeWealthStandings(s);
    const player = result.standings.find((e) => e.isPlayer)!;
    expect(player.horseCount).toBe(2);
    expect(player.horseAssets).toBeGreaterThan(0);
  });

  it("sums horseMarketValue for all NPC horses (by stableId) into horseAssets", () => {
    const h1 = createTestHorse({
      id: "h1",
      owned: false,
      stableId: "npc1",
      name: "NPC Horse 1",
    });
    const h2 = createTestHorse({
      id: "h2",
      owned: false,
      stableId: "npc1",
      name: "NPC Horse 2",
    });
    const stable = createTestStable({ id: "npc1", name: "Rival Stable" });
    const s = mkState({ horses: { h1, h2 }, npcStables: [stable] });
    const result = computeWealthStandings(s);
    const npc = result.standings.find((e) => e.stableId === "npc1")!;
    expect(npc.horseCount).toBe(2);
    expect(npc.horseAssets).toBeGreaterThan(0);
  });

  it("player cash comes from state.cash", () => {
    const s = mkState({ cash: 500000 });
    const result = computeWealthStandings(s);
    const player = result.standings.find((e) => e.isPlayer)!;
    expect(player.cash).toBe(500000);
  });

  it("NPC cash comes from npcStable.cash", () => {
    const stable = createTestStable({ id: "npc1", cash: 750000 });
    const s = mkState({ npcStables: [stable] });
    const result = computeWealthStandings(s);
    const npc = result.standings.find((e) => e.stableId === "npc1")!;
    expect(npc.cash).toBe(750000);
  });

  it("totalWealth = cash + horseAssets", () => {
    const h1 = createTestHorse({ id: "h1", owned: true, name: "H1" });
    const s = mkState({ cash: 300000, horses: { h1 } });
    const result = computeWealthStandings(s);
    const player = result.standings.find((e) => e.isPlayer)!;
    expect(player.totalWealth).toBe(player.cash + player.horseAssets);
  });

  it("sorts standings by totalWealth descending", () => {
    const h1 = createTestHorse({ id: "h1", owned: true, name: "H1" });
    const stable = createTestStable({ id: "npc1", cash: 1000000 });
    const s = mkState({ cash: 50000, horses: { h1 }, npcStables: [stable] });
    const result = computeWealthStandings(s);
    for (let i = 0; i < result.standings.length - 1; i++) {
      expect(result.standings[i].totalWealth).toBeGreaterThanOrEqual(
        result.standings[i + 1].totalWealth,
      );
    }
  });

  it("computes playerRank as 1-based index after sorting", () => {
    const h1 = createTestHorse({ id: "h1", owned: true, name: "H1" });
    const stable = createTestStable({ id: "npc1", cash: 1000000 });
    const s = mkState({ cash: 50000, horses: { h1 }, npcStables: [stable] });
    const result = computeWealthStandings(s);
    const playerIdx = result.standings.findIndex((e) => e.isPlayer);
    expect(result.playerRank).toBe(playerIdx + 1);
  });

  it("uses playerProfile.stableName for player name", () => {
    const s = mkState({
      playerProfile: {
        stableName: "Thunder Ranch",
        ownerName: "John",
        silk: { primary: "#ff0000", secondary: "#0000ff" },
        backstoryId: "inheritor",
        founded: 1,
      } as any,
    });
    const result = computeWealthStandings(s);
    const player = result.standings.find((e) => e.isPlayer)!;
    expect(player.name).toBe("Thunder Ranch");
  });

  it("uses playerProfile silk primary color for player entry", () => {
    const s = mkState({
      playerProfile: {
        stableName: "My Stable",
        ownerName: "John",
        silk: { primary: "#ff0000", secondary: "#0000ff" },
        backstoryId: "inheritor",
        founded: 1,
      } as any,
    });
    const result = computeWealthStandings(s);
    const player = result.standings.find((e) => e.isPlayer)!;
    expect(player.silkColor).toBe("#ff0000");
  });

  it("uses npcStable.name and npcStable.colors.primary for NPC entries", () => {
    const stable = createTestStable({
      id: "npc1",
      name: "Green Acres",
      colors: { primary: "#00ff00", secondary: "#000000" },
    });
    const s = mkState({ npcStables: [stable] });
    const result = computeWealthStandings(s);
    const npc = result.standings.find((e) => e.stableId === "npc1")!;
    expect(npc.name).toBe("Green Acres");
    expect(npc.silkColor).toBe("#00ff00");
  });

  it("handles playerProfile being undefined", () => {
    const s = mkState();
    const result = computeWealthStandings(s);
    const player = result.standings.find((e) => e.isPlayer)!;
    expect(player.name).toBe("Your stable");
  });

  it("handles NPC stables with no horses (horseAssets = 0, totalWealth = cash)", () => {
    const stable = createTestStable({ id: "npc1", cash: 200000 });
    const s = mkState({ npcStables: [stable] });
    const result = computeWealthStandings(s);
    const npc = result.standings.find((e) => e.stableId === "npc1")!;
    expect(npc.horseAssets).toBe(0);
    expect(npc.horseCount).toBe(0);
    expect(npc.totalWealth).toBe(200000);
  });

  it("handles horses with no stableId and owned=false (skipped)", () => {
    const h1 = createTestHorse({
      id: "h1",
      owned: false,
      stableId: undefined,
      name: "Wild Horse",
    });
    const s = mkState({ horses: { h1 } });
    const result = computeWealthStandings(s);
    // Horse should not be attributed to any stable
    for (const entry of result.standings) {
      expect(entry.horseCount).toBe(0);
    }
  });

  it("horseCount reflects number of horses attributed to each stable", () => {
    const h1 = createTestHorse({ id: "h1", owned: true, name: "P1" });
    const h2 = createTestHorse({ id: "h2", owned: true, name: "P2" });
    const h3 = createTestHorse({ id: "h3", owned: true, name: "P3" });
    const h4 = createTestHorse({
      id: "h4",
      owned: false,
      stableId: "npc1",
      name: "N1",
    });
    const stable = createTestStable({ id: "npc1", name: "NPC" });
    const s = mkState({ horses: { h1, h2, h3, h4 }, npcStables: [stable] });
    const result = computeWealthStandings(s);
    const player = result.standings.find((e) => e.isPlayer)!;
    const npc = result.standings.find((e) => e.stableId === "npc1")!;
    expect(player.horseCount).toBe(3);
    expect(npc.horseCount).toBe(1);
  });

  it("topHorseValue reflects the highest single horse market value in the stable", () => {
    const h1 = createTestHorse({
      id: "h1",
      owned: true,
      name: "Cheap",
      stats: {
        speed: 50,
        stamina: 50,
        acceleration: 50,
        consistency: 50,
        temperament: 50,
        conformation: 50,
      },
      potential: 50,
    });
    const h2 = createTestHorse({
      id: "h2",
      owned: true,
      name: "Expensive",
      stats: {
        speed: 90,
        stamina: 90,
        acceleration: 90,
        consistency: 90,
        temperament: 90,
        conformation: 90,
      },
      potential: 95,
    });
    const s = mkState({ horses: { h1, h2 } });
    const result = computeWealthStandings(s);
    const player = result.standings.find((e) => e.isPlayer)!;
    // topHorseValue should equal the market value of h2 (the higher-rated horse)
    expect(player.topHorseValue).toBeGreaterThan(0);
    // h2 should be worth more than h1
    expect(player.topHorseValue).toBeGreaterThanOrEqual(player.horseAssets - player.topHorseValue);
  });

  it("includes all NPC stables even if they have zero horses", () => {
    const s1 = createTestStable({ id: "npc1", name: "Stable 1" });
    const s2 = createTestStable({ id: "npc2", name: "Stable 2" });
    const s = mkState({ npcStables: [s1, s2] });
    const result = computeWealthStandings(s);
    expect(result.standings.find((e) => e.stableId === "npc1")).toBeTruthy();
    expect(result.standings.find((e) => e.stableId === "npc2")).toBeTruthy();
  });
});
