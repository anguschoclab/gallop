import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import { useReplaysLibrary } from "@/hooks/replays/useReplaysLibrary";
import type { Race, GameState } from "@/game/types";
import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";

function makeRace(overrides: Partial<Race> & { id: string }): Race {
  return {
    name: "Test Race",
    day: 10,
    distance: 1600,
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

function seedState(overrides: Partial<GameState> = {}) {
  useGame.setState({ ...createDefaultGameState(), ...overrides });
}

describe("useReplaysLibrary", () => {
  beforeEach(() => {
    useGame.setState(createDefaultGameState());
  });

  it("returns empty array when no resolved races exist", () => {
    const { result } = renderHook(() => useReplaysLibrary());
    expect(result.current.replays).toEqual([]);
  });

  it("returns only resolved races with snapshots", () => {
    const r1 = makeRace({
      id: "r-1",
      resolved: true,
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      snapshots: makeSnapshots(),
    });
    const r2 = makeRace({ id: "r-2", resolved: false });
    const r3 = makeRace({ id: "r-3", resolved: true, result: [], snapshots: [] });

    seedState({ races: { "r-1": r1, "r-2": r2, "r-3": r3 } });

    const { result } = renderHook(() => useReplaysLibrary());
    expect(result.current.replays).toHaveLength(1);
    expect(result.current.replays[0].raceId).toBe("r-1");
  });

  it("sorts replays by day descending (newest first)", () => {
    const r1 = makeRace({
      id: "r-1",
      day: 10,
      resolved: true,
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      snapshots: makeSnapshots(),
    });
    const r2 = makeRace({
      id: "r-2",
      day: 50,
      resolved: true,
      result: [{ horseId: "h-2", position: 1, time: 90.0 }],
      snapshots: makeSnapshots(),
    });

    seedState({ races: { "r-1": r1, "r-2": r2 } });

    const { result } = renderHook(() => useReplaysLibrary());
    expect(result.current.replays[0].day).toBe(50);
    expect(result.current.replays[1].day).toBe(10);
  });

  it("filters by horse ID", () => {
    const r1 = makeRace({
      id: "r-1",
      resolved: true,
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      snapshots: makeSnapshots(),
      entries: [{ horseId: "h-1" } as any],
    });
    const r2 = makeRace({
      id: "r-2",
      resolved: true,
      result: [{ horseId: "h-2", position: 1, time: 90.0 }],
      snapshots: makeSnapshots(),
      entries: [{ horseId: "h-2" } as any],
    });

    seedState({ races: { "r-1": r1, "r-2": r2 } });

    const { result } = renderHook(() => useReplaysLibrary({ horseId: "h-1" }));
    expect(result.current.replays).toHaveLength(1);
    expect(result.current.replays[0].raceId).toBe("r-1");
  });

  it("filters by result (wins only)", () => {
    const r1 = makeRace({
      id: "r-1",
      resolved: true,
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      snapshots: makeSnapshots(),
      entries: [{ horseId: "h-1" } as any],
    });
    const r2 = makeRace({
      id: "r-2",
      resolved: true,
      result: [{ horseId: "h-1", position: 3, time: 100.0 }],
      snapshots: makeSnapshots(),
      entries: [{ horseId: "h-1" } as any],
    });

    seedState({ races: { "r-1": r1, "r-2": r2 } });

    const { result } = renderHook(() => useReplaysLibrary({ horseId: "h-1", resultFilter: "win" }));
    expect(result.current.replays).toHaveLength(1);
    expect(result.current.replays[0].raceId).toBe("r-1");
  });

  it("filters by grade", () => {
    const r1 = makeRace({
      id: "r-1",
      resolved: true,
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      snapshots: makeSnapshots(),
      graded: { key: "g1-test", grade: "G1", track: "Test Track", trackId: "t-1", surface: "Turf" },
    });
    const r2 = makeRace({
      id: "r-2",
      resolved: true,
      result: [{ horseId: "h-2", position: 1, time: 90.0 }],
      snapshots: makeSnapshots(),
    });

    seedState({ races: { "r-1": r1, "r-2": r2 } });

    const { result } = renderHook(() => useReplaysLibrary({ grade: "G1" }));
    expect(result.current.replays).toHaveLength(1);
    expect(result.current.replays[0].raceId).toBe("r-1");
  });

  it("returns highlight reel (wins + graded placings)", () => {
    const r1 = makeRace({
      id: "r-1",
      day: 10,
      resolved: true,
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      snapshots: makeSnapshots(),
      entries: [{ horseId: "h-1" } as any],
      graded: { key: "g1-test", grade: "G1", track: "Test Track", trackId: "t-1", surface: "Turf" },
    });
    const r2 = makeRace({
      id: "r-2",
      day: 20,
      resolved: true,
      result: [{ horseId: "h-1", position: 2, time: 96.0 }],
      snapshots: makeSnapshots(),
      entries: [{ horseId: "h-1" } as any],
      graded: {
        key: "g2-test",
        grade: "G2",
        track: "Test Track 2",
        trackId: "t-2",
        surface: "Dirt",
      },
    });
    const r3 = makeRace({
      id: "r-3",
      day: 30,
      resolved: true,
      result: [{ horseId: "h-1", position: 5, time: 100.0 }],
      snapshots: makeSnapshots(),
      entries: [{ horseId: "h-1" } as any],
    });

    seedState({ races: { "r-1": r1, "r-2": r2, "r-3": r3 } });

    const { result } = renderHook(() => useReplaysLibrary());
    expect(result.current.highlights).toHaveLength(2);
    expect(result.current.highlights.map((r) => r.raceId)).toContain("r-1");
    expect(result.current.highlights.map((r) => r.raceId)).toContain("r-2");
    expect(result.current.highlights.map((r) => r.raceId)).not.toContain("r-3");
  });
});
