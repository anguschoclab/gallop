import { describe, it, expect } from "vitest";
import { archivingPhase } from "@/core/time/phases/archivingPhase";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("archivingPhase", () => {
  it("should archive deceased horses", () => {
    const alive = createTestHorse({ id: "horse-1" });
    const dead = createTestHorse({ id: "horse-2", lifecycleStatus: "deceased" });
    const state = makeGameState({ horses: h2r([alive, dead]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = archivingPhase.execute(context);
    expect(Object.keys(result.state.horses)).toEqual(["horse-1"]);
    expect(result.state.archive.horses.some((h) => h.id === "horse-2")).toBe(true);
  });

  it("should archive resolved races older than 30 days", () => {
    const oldRace = {
      id: "race-1",
      name: "Old Race",
      day: 1,
      entries: [],
      fieldSize: 10,
      resolved: true,
      trackId: "track-1",
      surface: "Turf" as const,
      distance: 1600,
      grade: "G3" as const,
      raceClass: "Stakes" as const,
      entryFee: 100,
      purse: 50000,
    };
    const recentRace = {
      id: "race-2",
      name: "Recent Race",
      day: 40,
      entries: [],
      fieldSize: 10,
      resolved: true,
      trackId: "track-1",
      surface: "Turf" as const,
      distance: 1600,
      grade: "G3" as const,
      raceClass: "Stakes" as const,
      entryFee: 100,
      purse: 50000,
    };
    const state = makeGameState({
      races: { "race-1": oldRace as any, "race-2": recentRace as any },
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 50 }) as PipelineContext;

    const result = archivingPhase.execute(context);
    expect(Object.keys(result.state.races)).toEqual(["race-2"]);
    expect(result.state.archive.races.some((r) => r.id === "race-1")).toBe(true);
  });

  it("should archive resolved pregnancies", () => {
    const resolvedPreg = { id: "preg-1", resolved: true } as any;
    const activePreg = { id: "preg-2", resolved: false } as any;
    const state = makeGameState({ pregnancies: [resolvedPreg, activePreg] }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = archivingPhase.execute(context);
    expect(result.state.pregnancies).toHaveLength(1);
    expect(result.state.pregnancies[0].id).toBe("preg-2");
    expect(result.state.archive.pregnancies.some((p) => p.id === "preg-1")).toBe(true);
  });

  it("should archive news older than 60 days", () => {
    const oldNews = { day: 1, headline: "Old", body: "", category: "stable", importance: "low" };
    const recentNews = {
      day: 50,
      headline: "Recent",
      body: "",
      category: "stable",
      importance: "low",
    };
    const state = makeGameState({ news: [oldNews as any, recentNews as any] }) as GameState;
    const context = makePipelineContext({ state, newDay: 70 }) as PipelineContext;

    const result = archivingPhase.execute(context);
    expect(result.state.news.some((n) => n.headline === "Recent")).toBe(true);
    expect(result.state.news.some((n) => n.headline === "Old")).toBe(false);
  });

  it("should preserve existing archived items", () => {
    const previouslyArchived = createTestHorse({ id: "old-dead", lifecycleStatus: "deceased" });
    const newDead = createTestHorse({ id: "new-dead", lifecycleStatus: "deceased" });
    const state = makeGameState({
      horses: h2r([newDead]),
      archive: { horses: [previouslyArchived], races: [], pregnancies: [], news: [] },
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = archivingPhase.execute(context);
    expect(result.state.archive.horses.length).toBe(2);
    expect(result.state.archive.horses.some((h) => h.id === "old-dead")).toBe(true);
    expect(result.state.archive.horses.some((h) => h.id === "new-dead")).toBe(true);
  });

  it("should handle empty state gracefully", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = archivingPhase.execute(context);
    expect(result.state.horses).toEqual({});
    expect(result.state.archive.horses).toEqual([]);
  });
});
