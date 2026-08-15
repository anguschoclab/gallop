import { describe, it, expect } from "vitest";
import { narrativePhase } from "@/core/time/phases/narrativePhase";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import { createTestStable } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("narrativePhase", () => {
  it("should return context unchanged when no NPC stables", () => {
    const state = makeGameState({ npcStables: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = narrativePhase.execute(context);
    expect(result).toBe(context);
  });

  it("should process narrative cycle and update npcAIManager", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const aiManager = {
      stableStates: { "npc-1": { narrativeState: { activeArcs: [], storyBeats: [] } } },
      globalDay: 1,
      regionalKings: {},
    };
    const state = makeGameState({
      npcStables: [stable],
      npcAIManager: aiManager as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = narrativePhase.execute(context);
    expect(result.state.npcAIManager).toBeDefined();
  });

  it("should create default aiManager if undefined", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const state = makeGameState({
      npcStables: [stable],
      npcAIManager: undefined,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = narrativePhase.execute(context);
    expect(result.state.npcAIManager).toBeDefined();
  });

  it("should generate news impacts for story beats matching current day", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const beat = {
      day: 10,
      headline: "Test Headline",
      body: "Test body",
      arcId: "arc-1",
    };
    const aiManager = {
      stableStates: {
        "npc-1": {
          narrativeState: {
            activeArcs: [{ id: "arc-1", beats: [beat] }],
            storyBeats: [beat],
          },
        },
      },
      globalDay: 1,
      regionalKings: {},
    };
    const state = makeGameState({
      npcStables: [stable],
      npcAIManager: aiManager as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = narrativePhase.execute(context);
    const newsImpact = result.impacts.find((i) => i.type === "news_item");
    expect(newsImpact).toBeDefined();
    expect((newsImpact as any).newsItem.headline).toBe("Test Headline");
  });

  it("should not generate news impacts for beats on other days", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const beat = {
      day: 5,
      headline: "Past Headline",
      body: "Past body",
      arcId: "arc-1",
    };
    const aiManager = {
      stableStates: {
        "npc-1": {
          narrativeState: {
            activeArcs: [{ id: "arc-1", beats: [beat] }],
            storyBeats: [beat],
          },
        },
      },
      globalDay: 1,
      regionalKings: {},
    };
    const state = makeGameState({
      npcStables: [stable],
      npcAIManager: aiManager as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = narrativePhase.execute(context);
    const newsImpact = result.impacts.find(
      (i) => i.type === "news_item" && (i as any).newsItem?.headline === "Past Headline",
    );
    expect(newsImpact).toBeUndefined();
  });
});
