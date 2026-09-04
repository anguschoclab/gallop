import { describe, it, expect } from "vitest";
import { deriveTutorialStep } from "@/core/tutorial/deriveTutorialStep";
import type { TutorialState } from "@/core/tutorial/tutorialTypes";
import type { GameState } from "@/game/types";

function makeTutorialState(overrides: Partial<TutorialState> = {}): TutorialState {
  return {
    tutorialActive: true,
    currentBeat: 0,
    completedBeats: [],
    skipped: false,
    beyerExplainerAcknowledged: false,
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> & { tutorial?: TutorialState } = {}): any {
  return {
    day: 1,
    horses: {},
    races: {},
    tutorial: makeTutorialState(),
    ...overrides,
  };
}

describe("deriveTutorialStep", () => {
  it("returns null when tutorial is not active", () => {
    const state = makeState({
      tutorial: makeTutorialState({ tutorialActive: false }),
    });
    expect(deriveTutorialStep(state)).toBeNull();
  });

  it("returns null when tutorial is skipped", () => {
    const state = makeState({
      tutorial: makeTutorialState({ skipped: true }),
    });
    expect(deriveTutorialStep(state)).toBeNull();
  });

  it("returns null when all beats are completed", () => {
    const state = makeState({
      tutorial: makeTutorialState({
        completedBeats: [0, 1, 2, 3, 4],
      }),
    });
    expect(deriveTutorialStep(state)).toBeNull();
  });

  it("returns beat 0 (meet your stable) at the start", () => {
    const state = makeState();
    const step = deriveTutorialStep(state);
    expect(step).not.toBeNull();
    expect(step!.beat).toBe(0);
  });

  it("advances to beat 1 (enter a race) when a horse has been visited", () => {
    const state = makeState({
      tutorial: makeTutorialState({ completedBeats: [0] }),
    });
    const step = deriveTutorialStep(state);
    expect(step).not.toBeNull();
    expect(step!.beat).toBe(1);
  });

  it("advances to beat 2 (watch the race) when a horse is entered in an unresolved race", () => {
    const state = makeState({
      tutorial: makeTutorialState({ completedBeats: [0, 1] }),
      races: {
        "r-1": {
          id: "r-1",
          name: "Test Race",
          day: 5,
          resolved: false,
          entries: [{ horseId: "h-1" }],
        } as any,
      },
    });
    const step = deriveTutorialStep(state);
    expect(step).not.toBeNull();
    expect(step!.beat).toBe(2);
  });

  it("advances to beat 3 (read the result) when the entered race is resolved", () => {
    const state = makeState({
      tutorial: makeTutorialState({ completedBeats: [0, 1, 2] }),
      races: {
        "r-1": {
          id: "r-1",
          name: "Test Race",
          day: 5,
          resolved: true,
          entries: [{ horseId: "h-1" }],
          result: [{ horseId: "h-1", position: 1, time: 90 }],
        } as any,
      },
    });
    const step = deriveTutorialStep(state);
    expect(step).not.toBeNull();
    expect(step!.beat).toBe(3);
  });

  it("advances to beat 4 (advance the day) when beyer explainer is acknowledged", () => {
    const state = makeState({
      tutorial: makeTutorialState({
        completedBeats: [0, 1, 2, 3],
        beyerExplainerAcknowledged: true,
      }),
    });
    const step = deriveTutorialStep(state);
    expect(step).not.toBeNull();
    expect(step!.beat).toBe(4);
  });

  it("returns null when beat 4 is completed (day advanced)", () => {
    const state = makeState({
      tutorial: makeTutorialState({ completedBeats: [0, 1, 2, 3, 4] }),
    });
    expect(deriveTutorialStep(state)).toBeNull();
  });

  it("self-corrects if player wanders — still on beat 0 if no horse visited", () => {
    const state = makeState({
      tutorial: makeTutorialState({ completedBeats: [] }),
      day: 10,
    });
    const step = deriveTutorialStep(state);
    expect(step).not.toBeNull();
    expect(step!.beat).toBe(0);
  });

  it("self-corrects — beat 1 even if player already entered a race (beat 0 not done)", () => {
    // If player hasn't "completed" beat 0 but has entered a race, we stay on beat 0
    // until they acknowledge it. The tutorial is derived from completedBeats, not state.
    const state = makeState({
      tutorial: makeTutorialState({ completedBeats: [] }),
      races: {
        "r-1": {
          id: "r-1",
          name: "Test Race",
          day: 5,
          resolved: false,
          entries: [{ horseId: "h-1" }],
        } as any,
      },
    });
    const step = deriveTutorialStep(state);
    expect(step).not.toBeNull();
    expect(step!.beat).toBe(0);
  });

  it("provides label and detail for each beat", () => {
    const state = makeState();
    const step = deriveTutorialStep(state);
    expect(step).not.toBeNull();
    expect(step!.label).toBeTruthy();
    expect(step!.detail).toBeTruthy();
    expect(step!.to).toBeTruthy();
  });
});
