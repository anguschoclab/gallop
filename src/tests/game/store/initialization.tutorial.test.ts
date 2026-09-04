import { describe, it, expect } from "vitest";
import { createDefaultGameState } from "@/game/store/state";
import { createDefaultTutorialState } from "@/core/tutorial/tutorialTypes";

describe("createDefaultGameState includes tutorial state", () => {
  it("includes tutorial field in default game state", () => {
    const state = createDefaultGameState();
    expect(state.tutorial).toBeDefined();
  });

  it("initializes tutorial with tutorialActive=true", () => {
    const state = createDefaultGameState();
    expect(state.tutorial!.tutorialActive).toBe(true);
  });

  it("initializes tutorial with currentBeat=0", () => {
    const state = createDefaultGameState();
    expect(state.tutorial!.currentBeat).toBe(0);
  });

  it("initializes tutorial with empty completedBeats", () => {
    const state = createDefaultGameState();
    expect(state.tutorial!.completedBeats).toEqual([]);
  });

  it("initializes tutorial with skipped=false", () => {
    const state = createDefaultGameState();
    expect(state.tutorial!.skipped).toBe(false);
  });

  it("initializes tutorial with beyerExplainerAcknowledged=false", () => {
    const state = createDefaultGameState();
    expect(state.tutorial!.beyerExplainerAcknowledged).toBe(false);
  });

  it("matches createDefaultTutorialState exactly", () => {
    const state = createDefaultGameState();
    expect(state.tutorial).toEqual(createDefaultTutorialState());
  });
});
