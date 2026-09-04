import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import { createDefaultTutorialState } from "@/core/tutorial/tutorialTypes";

describe("tutorialSlice", () => {
  beforeEach(() => {
    useGame.setState({ ...createDefaultGameState() });
  });

  it("initializes with tutorial active and beat 0", () => {
    const state = useGame.getState();
    expect(state.tutorial).toBeDefined();
    expect(state.tutorial!.tutorialActive).toBe(true);
    expect(state.tutorial!.currentBeat).toBe(0);
    expect(state.tutorial!.completedBeats).toEqual([]);
    expect(state.tutorial!.skipped).toBe(false);
  });

  it("completeTutorialBeat adds beat to completedBeats", () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.completeTutorialBeat(0);
    });
    const state = useGame.getState();
    expect(state.tutorial!.completedBeats).toContain(0);
    expect(state.tutorial!.currentBeat).toBe(1);
  });

  it("completeTutorialBeat does not duplicate already-completed beats", () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.completeTutorialBeat(0);
      result.current.completeTutorialBeat(0);
    });
    const state = useGame.getState();
    expect(state.tutorial!.completedBeats.filter((b: number) => b === 0)).toHaveLength(1);
  });

  it("skipTutorial sets skipped=true and tutorialActive=false", () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.skipTutorial();
    });
    const state = useGame.getState();
    expect(state.tutorial!.skipped).toBe(true);
    expect(state.tutorial!.tutorialActive).toBe(false);
  });

  it("acknowledgeBeyerExplainer sets beyerExplainerAcknowledged=true", () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.acknowledgeBeyerExplainer();
    });
    const state = useGame.getState();
    expect(state.tutorial!.beyerExplainerAcknowledged).toBe(true);
  });

  it("resetTutorial restores default tutorial state", () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.completeTutorialBeat(0);
      result.current.completeTutorialBeat(1);
      result.current.skipTutorial();
    });
    act(() => {
      result.current.resetTutorial();
    });
    const state = useGame.getState();
    expect(state.tutorial).toEqual(createDefaultTutorialState());
  });
});
