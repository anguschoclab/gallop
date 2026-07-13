import { describe, it, expect } from "vitest";

interface MockEntry {
  horseId: string;
  owned: boolean;
  stableId?: string;
}

interface MockResult {
  horseId: string;
  position: number;
  time: number;
}

interface MockRace {
  entries: MockEntry[];
  result: MockResult[];
}

function processGrudgeMatch(race: MockRace, rivalStableId: string) {
  const playerHorseIds = new Set(race.entries.filter((e) => e.owned).map((e) => e.horseId));
  const rivalHorseIds = new Set(
    race.entries.filter((e) => e.stableId === rivalStableId).map((e) => e.horseId),
  );

  const playerResults = race.result.filter((r) => playerHorseIds.has(r.horseId));
  const rivalResults = race.result.filter((r) => rivalHorseIds.has(r.horseId));

  if (playerResults.length === 0 || rivalResults.length === 0) {
    return { hasMatch: false, playerBestPos: null, rivalBestPos: null };
  }

  const playerBestPos = Math.min(...playerResults.map((r) => r.position));
  const rivalBestPos = Math.min(...rivalResults.map((r) => r.position));

  const playerHorseId = race.result.find(
    (r) => r.position === playerBestPos && playerHorseIds.has(r.horseId),
  )?.horseId;
  const rivalHorseId = race.result.find(
    (r) => r.position === rivalBestPos && rivalHorseIds.has(r.horseId),
  )?.horseId;

  return {
    hasMatch: !!(playerHorseId && rivalHorseId),
    playerBestPos,
    rivalBestPos,
    playerHorseId,
    rivalHorseId,
  };
}

describe("npcCycle — Set-based grudge match lookup", () => {
  const mkRace = (entries: MockEntry[], result: MockResult[]): MockRace => ({ entries, result });

  it("correctly identifies player best position", () => {
    const race = mkRace(
      [
        { horseId: "p1", owned: true },
        { horseId: "r1", owned: false, stableId: "rival1" },
      ],
      [
        { horseId: "p1", position: 3, time: 120 },
        { horseId: "r1", position: 1, time: 118 },
      ],
    );
    const result = processGrudgeMatch(race, "rival1");
    expect(result.playerBestPos).toBe(3);
  });

  it("correctly identifies rival best position", () => {
    const race = mkRace(
      [
        { horseId: "p1", owned: true },
        { horseId: "r1", owned: false, stableId: "rival1" },
      ],
      [
        { horseId: "p1", position: 3, time: 120 },
        { horseId: "r1", position: 1, time: 118 },
      ],
    );
    const result = processGrudgeMatch(race, "rival1");
    expect(result.rivalBestPos).toBe(1);
  });

  it("has match when both player and rival have entries", () => {
    const race = mkRace(
      [
        { horseId: "p1", owned: true },
        { horseId: "r1", owned: false, stableId: "rival1" },
      ],
      [
        { horseId: "p1", position: 2, time: 120 },
        { horseId: "r1", position: 1, time: 118 },
      ],
    );
    const result = processGrudgeMatch(race, "rival1");
    expect(result.hasMatch).toBe(true);
  });

  it("does not generate match when player has no entries", () => {
    const race = mkRace(
      [{ horseId: "r1", owned: false, stableId: "rival1" }],
      [{ horseId: "r1", position: 1, time: 118 }],
    );
    const result = processGrudgeMatch(race, "rival1");
    expect(result.hasMatch).toBe(false);
  });

  it("does not generate match when rival has no entries", () => {
    const race = mkRace(
      [{ horseId: "p1", owned: true }],
      [{ horseId: "p1", position: 1, time: 118 }],
    );
    const result = processGrudgeMatch(race, "rival1");
    expect(result.hasMatch).toBe(false);
  });

  it("handles multiple entries per side and picks best", () => {
    const race = mkRace(
      [
        { horseId: "p1", owned: true },
        { horseId: "p2", owned: true },
        { horseId: "r1", owned: false, stableId: "rival1" },
        { horseId: "r2", owned: false, stableId: "rival1" },
      ],
      [
        { horseId: "p1", position: 4, time: 125 },
        { horseId: "p2", position: 2, time: 119 },
        { horseId: "r1", position: 1, time: 117 },
        { horseId: "r2", position: 3, time: 121 },
      ],
    );
    const result = processGrudgeMatch(race, "rival1");
    expect(result.playerBestPos).toBe(2);
    expect(result.rivalBestPos).toBe(1);
    expect(result.playerHorseId).toBe("p2");
    expect(result.rivalHorseId).toBe("r1");
  });
});
