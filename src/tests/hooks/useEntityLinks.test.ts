import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { useEntityLinks } from "@/hooks/shared/useEntityLinks";
import { createTestHorse, createTestJockey, createTestStable } from "@/tests/helpers";
import type { Race } from "@/core/race/types";

function mkRace(id: string, name: string): Race {
  return {
    id,
    name,
    day: 50,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 0,
    purse: 50000,
    fieldSize: 8,
    entries: [],
    resolved: false,
  } as unknown as Race;
}

describe("useEntityLinks", () => {
  it("returns empty array for empty text", () => {
    seedStore({ ...createDefaultGameState() });
    const { result } = renderHook(() => useEntityLinks(""));
    expect(result.current).toEqual([]);
  });

  it("detects horse names in text", () => {
    const horse = createTestHorse({ id: "h1", name: "Thunder Strike" });
    seedStore({
      ...createDefaultGameState(),
      horses: { [horse.id]: horse },
    });
    const { result } = renderHook(() => useEntityLinks("Thunder Strike won the big race today"));
    expect(result.current).toContainEqual({
      type: "horse",
      id: "h1",
      name: "Thunder Strike",
    });
  });

  it("detects jockey names in text", () => {
    const jockey = createTestJockey({ id: "j1", name: "Frankie Dettori" });
    seedStore({
      ...createDefaultGameState(),
      jockeys: [jockey],
    });
    const { result } = renderHook(() => useEntityLinks("Frankie Dettori rode brilliantly"));
    expect(result.current).toContainEqual({
      type: "jockey",
      id: "j1",
      name: "Frankie Dettori",
    });
  });

  it("detects stable names in text", () => {
    const stable = createTestStable({ id: "npc1", name: "Godolphin Stables" });
    seedStore({
      ...createDefaultGameState(),
      npcStables: [stable],
    });
    const { result } = renderHook(() => useEntityLinks("Godolphin Stables entered three horses"));
    expect(result.current).toContainEqual({
      type: "stable",
      id: "npc1",
      name: "Godolphin Stables",
    });
  });

  it("detects race names in text", () => {
    const race = mkRace("r1", "Grand National");
    seedStore({
      ...createDefaultGameState(),
      races: { [race.id]: race },
    });
    const { result } = renderHook(() => useEntityLinks("The Grand National was held at Aintree"));
    expect(result.current).toContainEqual({
      type: "race",
      id: "r1",
      name: "Grand National",
    });
  });

  it("detects multiple entity types in the same text", () => {
    const horse = createTestHorse({ id: "h1", name: "Lightning" });
    const jockey = createTestJockey({ id: "j1", name: "Ruby Walsh" });
    const stable = createTestStable({ id: "npc1", name: "Willie Mullins" });
    const race = mkRace("r1", "Cheltenham Gold Cup");
    seedStore({
      ...createDefaultGameState(),
      horses: { [horse.id]: horse },
      jockeys: [jockey],
      npcStables: [stable],
      races: { [race.id]: race },
    });
    const { result } = renderHook(() =>
      useEntityLinks(
        "Lightning, ridden by Ruby Walsh for Willie Mullins, won the Cheltenham Gold Cup",
      ),
    );
    const types = result.current.map((l) => l.type);
    expect(types).toContain("horse");
    expect(types).toContain("jockey");
    expect(types).toContain("stable");
    expect(types).toContain("race");
  });

  it("preserves explicit links and merges with auto-detected", () => {
    const horse = createTestHorse({ id: "h1", name: "Speedster" });
    seedStore({
      ...createDefaultGameState(),
      horses: { [horse.id]: horse },
    });
    const explicit = [{ type: "race" as const, id: "r-explicit", name: "Kentucky Derby" }];
    const { result } = renderHook(() =>
      useEntityLinks("Speedster won the Kentucky Derby", explicit),
    );
    const names = result.current.map((l) => l.name);
    expect(names).toContain("Speedster");
    expect(names).toContain("Kentucky Derby");
  });

  it("sorts longer names first", () => {
    const horse1 = createTestHorse({ id: "h1", name: "Al" });
    const horse2 = createTestHorse({ id: "h2", name: "Alexander the Great" });
    seedStore({
      ...createDefaultGameState(),
      horses: { [horse1.id]: horse1, [horse2.id]: horse2 },
    });
    const { result } = renderHook(() => useEntityLinks("Al and Alexander the Great raced"));
    expect(result.current[0].name).toBe("Alexander the Great");
  });

  it("disables auto-detection when autoDetect=false", () => {
    const horse = createTestHorse({ id: "h1", name: "Thunder" });
    seedStore({
      ...createDefaultGameState(),
      horses: { [horse.id]: horse },
    });
    const explicit = [{ type: "horse" as const, id: "h-explicit", name: "Lightning" }];
    const { result } = renderHook(() =>
      useEntityLinks("Thunder and Lightning raced", explicit, false),
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe("h-explicit");
  });

  it("does not duplicate entities already in explicit links", () => {
    const horse = createTestHorse({ id: "h1", name: "Thunder" });
    seedStore({
      ...createDefaultGameState(),
      horses: { [horse.id]: horse },
    });
    const explicit = [{ type: "horse" as const, id: "h1", name: "Thunder" }];
    const { result } = renderHook(() => useEntityLinks("Thunder won the race", explicit));
    const horseLinks = result.current.filter((l) => l.name === "Thunder");
    expect(horseLinks).toHaveLength(1);
  });
});
