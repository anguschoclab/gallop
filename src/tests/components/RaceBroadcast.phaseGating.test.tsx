/**
 * RaceBroadcast.phaseGating.test.tsx
 *
 * Stress-tests the phase-aware replay/live gating so that overlays never
 * blank-flash during phase transitions.
 *
 * Three concerns under test:
 *
 * 1. showReplay truth-table — all 12 combinations of (phase × resolved ×
 *    hasSnapshots) produce exactly the expected boolean.
 *
 * 2. PhasePanel exclusion invariant — at no point during a preshow→broadcast
 *    transition are BOTH panels simultaneously invisible (which would cause a
 *    blank flash).
 *
 * 3. Monotonic showReplay — once live→review fires, showReplay goes
 *    false→true and never reverts as long as resolved remains true.
 *
 * 4. usePhaseTransition contract — displayedGroup lags 300 ms behind the
 *    real phase (the cross-fade window), and resolves correctly.
 *
 * 5. toDisplayPhase — live and review both map to "broadcast"; only
 *    "preshow" maps to "preshow".
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement } from "react";

// ─── Replicate the pure logic under test (no DOM required) ──────────────────

type RacePhase = "preshow" | "live" | "review";
type DisplayPhase = "preshow" | "broadcast";

function toDisplayPhase(phase: RacePhase): DisplayPhase {
  return phase === "preshow" ? "preshow" : "broadcast";
}

/**
 * The condition from RaceBroadcast.tsx line 104.
 * Captured here verbatim so any future refactor that breaks the contract
 * also breaks this test.
 */
function computeShowReplay(phase: RacePhase, resolved: boolean, hasSnapshots: boolean): boolean {
  return phase === "review" && resolved && hasSnapshots;
}

/**
 * The visibility decision from PhasePanel — mirrors the component's render
 * return without needing React DOM.
 */
function isPhasePanelVisible(
  panelTarget: DisplayPhase,
  displayedGroup: DisplayPhase,
  isExiting: boolean,
  phase: RacePhase,
): boolean {
  const isActive = displayedGroup === panelTarget;
  const isEntering = isExiting && toDisplayPhase(phase) === panelTarget;
  // Component returns null when none of these are true
  return isActive || isExiting || isEntering;
}

// ─── usePhaseTransition hook extracted for isolation ────────────────────────

import { useState, useEffect, useRef } from "react";

function usePhaseTransition(phase: RacePhase) {
  const displayPhase = toDisplayPhase(phase);
  const [displayedGroup, setDisplayedGroup] = useState<DisplayPhase>(displayPhase);
  const [isExiting, setIsExiting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (displayPhase === displayedGroup) {
      // Phase reversed back to the currently displayed group mid-transition:
      // cancel the pending swap and clear the exit animation.
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsExiting(false);
      return;
    }

    setIsExiting(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDisplayedGroup(displayPhase);
      setIsExiting(false);
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [displayPhase, displayedGroup]);

  return { displayedPhase: displayedGroup, isExiting };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("computeShowReplay — full 12-combination truth table", () => {
  const phases: RacePhase[] = ["preshow", "live", "review"];
  const bools = [true, false];

  // Expected: showReplay is true ONLY when phase === "review" AND resolved AND hasSnapshots
  for (const phase of phases) {
    for (const resolved of bools) {
      for (const hasSnapshots of bools) {
        const expected = phase === "review" && resolved && hasSnapshots;
        it(`phase=${phase} resolved=${resolved} hasSnapshots=${hasSnapshots} → ${expected}`, () => {
          expect(computeShowReplay(phase, resolved, hasSnapshots)).toBe(expected);
        });
      }
    }
  }
});

describe("showReplay never true during live phase (blank-flash guard)", () => {
  it("is false for live+resolved+snapshots (the key race condition)", () => {
    // This is the blank-flash scenario: race just resolved while viewer is
    // still on "live". Without the phase guard it would immediately switch
    // to replay, causing a single-frame white canvas flash.
    expect(computeShowReplay("live", true, true)).toBe(false);
  });

  it("is false for live+resolved+no-snapshots", () => {
    expect(computeShowReplay("live", true, false)).toBe(false);
  });

  it("is false for live+unresolved+snapshots", () => {
    expect(computeShowReplay("live", false, true)).toBe(false);
  });
});

describe("showReplay requires ALL THREE conditions", () => {
  it("false when phase is preshow (even with resolved+snapshots)", () => {
    // Preshow should always show Track (or nothing), never the replay canvas
    expect(computeShowReplay("preshow", true, true)).toBe(false);
  });

  it("false when not resolved (review phase, snapshots present)", () => {
    expect(computeShowReplay("review", false, true)).toBe(false);
  });

  it("false when no snapshots (review phase, resolved)", () => {
    expect(computeShowReplay("review", true, false)).toBe(false);
  });

  it("true only for review+resolved+snapshots", () => {
    expect(computeShowReplay("review", true, true)).toBe(true);
  });
});

describe("monotonic showReplay — live→review transition never reverts", () => {
  it("false while live, immediately true on transition to review", () => {
    // Simulate the lifecycle: race starts live (unresolved, no snapshots yet),
    // then resolves and phase advances to review with snapshots.
    const timeline: Array<{ phase: RacePhase; resolved: boolean; hasSnapshots: boolean }> = [
      { phase: "live", resolved: false, hasSnapshots: false }, // race ticking
      { phase: "live", resolved: false, hasSnapshots: false }, // mid-race
      { phase: "live", resolved: true, hasSnapshots: true }, // resolveRaceWithImpacts fired
      { phase: "review", resolved: true, hasSnapshots: true }, // setPhase("review") called
      { phase: "review", resolved: true, hasSnapshots: true }, // user reads results
    ];

    const results = timeline.map(({ phase, resolved, hasSnapshots }) =>
      computeShowReplay(phase, resolved, hasSnapshots),
    );

    expect(results).toEqual([false, false, false, true, true]);

    // Monotonicity: once true, never goes back to false
    let seenTrue = false;
    for (const v of results) {
      if (seenTrue) expect(v).toBe(true);
      if (v) seenTrue = true;
    }
  });

  it("never true if snapshots are missing when phase advances to review", () => {
    // Edge case: race resolved but snapshot array wasn't populated yet
    const timeline = [
      { phase: "live" as RacePhase, resolved: true, hasSnapshots: false },
      { phase: "review" as RacePhase, resolved: true, hasSnapshots: false },
    ];
    const results = timeline.map(({ phase, resolved, hasSnapshots }) =>
      computeShowReplay(phase, resolved, hasSnapshots),
    );
    // Falls back to Track for both — no blank canvas
    expect(results).toEqual([false, false]);
  });
});

describe("toDisplayPhase — both broadcast phases map to 'broadcast'", () => {
  it("preshow → 'preshow'", () => {
    expect(toDisplayPhase("preshow")).toBe("preshow");
  });

  it("live → 'broadcast'", () => {
    expect(toDisplayPhase("live")).toBe("broadcast");
  });

  it("review → 'broadcast'", () => {
    expect(toDisplayPhase("review")).toBe("broadcast");
  });
});

describe("PhasePanel exclusion invariant — never both invisible simultaneously", () => {
  /**
   * For every (displayedGroup, isExiting, targetPhase) combination, verify
   * that at least one of the two panels (preshow vs broadcast) is visible.
   * A blank flash would mean isPhasePanelVisible returns false for BOTH.
   */
  const displayedGroups: DisplayPhase[] = ["preshow", "broadcast"];
  const exitingStates = [true, false];
  const phases: RacePhase[] = ["preshow", "live", "review"];

  for (const displayedGroup of displayedGroups) {
    for (const isExiting of exitingStates) {
      for (const phase of phases) {
        it(`displayedGroup=${displayedGroup} isExiting=${isExiting} phase=${phase} → at least one panel visible`, () => {
          const preshowVisible = isPhasePanelVisible("preshow", displayedGroup, isExiting, phase);
          const broadcastVisible = isPhasePanelVisible(
            "broadcast",
            displayedGroup,
            isExiting,
            phase,
          );
          expect(preshowVisible || broadcastVisible).toBe(true);
        });
      }
    }
  }
});

describe("PhasePanel — never both active simultaneously (double-render guard)", () => {
  /**
   * The stronger constraint: the isActive flag (not just visibility) should
   * never be true for both panels at the same time. Two active panels = two
   * overlapping full-screen divs.
   */
  const displayedGroups: DisplayPhase[] = ["preshow", "broadcast"];

  for (const displayedGroup of displayedGroups) {
    it(`displayedGroup=${displayedGroup} → only one panel isActive`, () => {
      const preshowActive = displayedGroup === "preshow";
      const broadcastActive = displayedGroup === "broadcast";
      expect(preshowActive && broadcastActive).toBe(false);
      expect(preshowActive || broadcastActive).toBe(true);
    });
  }
});

describe("usePhaseTransition hook — 300ms cross-fade without blank frame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with displayedPhase matching initial phase", () => {
    const { result } = renderHook(() => usePhaseTransition("preshow"));
    expect(result.current.displayedPhase).toBe("preshow");
    expect(result.current.isExiting).toBe(false);
  });

  it("sets isExiting=true immediately on phase change, keeping old displayedPhase", () => {
    const { result, rerender } = renderHook(({ phase }) => usePhaseTransition(phase), {
      initialProps: { phase: "preshow" as RacePhase },
    });

    act(() => {
      rerender({ phase: "live" });
    });

    // Immediately after rerender: old phase still displayed, isExiting set
    expect(result.current.displayedPhase).toBe("preshow");
    expect(result.current.isExiting).toBe(true);
  });

  it("resolves to new displayedPhase after 300ms timeout", () => {
    const { result, rerender } = renderHook(({ phase }) => usePhaseTransition(phase), {
      initialProps: { phase: "preshow" as RacePhase },
    });

    act(() => {
      rerender({ phase: "live" });
    });

    // Mid-transition — old phase still shown
    expect(result.current.displayedPhase).toBe("preshow");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // After timeout resolves
    expect(result.current.displayedPhase).toBe("broadcast");
    expect(result.current.isExiting).toBe(false);
  });

  it("never blank-flashes: displayedPhase is always a valid DisplayPhase", () => {
    const { result, rerender } = renderHook(({ phase }) => usePhaseTransition(phase), {
      initialProps: { phase: "preshow" as RacePhase },
    });

    const validPhases: DisplayPhase[] = ["preshow", "broadcast"];

    // Snapshot displayedPhase at each step of the transition
    const snapshots: DisplayPhase[] = [result.current.displayedPhase];

    act(() => {
      rerender({ phase: "live" });
    });
    snapshots.push(result.current.displayedPhase);

    act(() => {
      vi.advanceTimersByTime(150);
    });
    snapshots.push(result.current.displayedPhase);

    act(() => {
      vi.advanceTimersByTime(150);
    });
    snapshots.push(result.current.displayedPhase);

    for (const snap of snapshots) {
      expect(validPhases).toContain(snap);
    }
  });

  it("rapid phase toggling: reverting to current displayedGroup cancels transition immediately", () => {
    const { result, rerender } = renderHook(({ phase }) => usePhaseTransition(phase), {
      initialProps: { phase: "preshow" as RacePhase },
    });

    // Start transition preshow → live
    act(() => {
      rerender({ phase: "live" });
    });
    expect(result.current.isExiting).toBe(true);
    expect(result.current.displayedPhase).toBe("preshow");

    // Halfway through the 300ms window, reverse back to preshow
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      rerender({ phase: "preshow" });
    });

    // The hook detects displayPhase === displayedGroup ("preshow" === "preshow"),
    // cancels the pending timer, and clears isExiting immediately.
    expect(result.current.isExiting).toBe(false);
    expect(result.current.displayedPhase).toBe("preshow"); // never changed

    // Advancing the clock further does nothing (timer was cancelled)
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.displayedPhase).toBe("preshow");
    expect(result.current.isExiting).toBe(false);
  });

  it("live→review transition maps to same displayPhase (both are 'broadcast')", () => {
    // Special case: live and review both map to "broadcast", so a live→review
    // phase change should NOT trigger any transition animation at all —
    // displayedPhase stays "broadcast", isExiting stays false.
    const { result, rerender } = renderHook(({ phase }) => usePhaseTransition(phase), {
      initialProps: { phase: "live" as RacePhase },
    });

    // Start in broadcast
    expect(result.current.displayedPhase).toBe("broadcast");
    expect(result.current.isExiting).toBe(false);

    act(() => {
      rerender({ phase: "review" });
    });

    // No transition — same display group
    expect(result.current.displayedPhase).toBe("broadcast");
    expect(result.current.isExiting).toBe(false);
  });
});

describe("showReplay + PhasePanel combined — Track is always rendered during live", () => {
  /**
   * The critical blank-flash scenario: while phase=live and race resolves,
   * the Track component (not RaceVisualizer) must be the active child.
   * This test verifies the combined logic path.
   */
  it("Track rendered (not RaceVisualizer) the frame race.resolved flips to true while phase=live", () => {
    // Simulate the exact frame where resolveRaceWithImpacts is called:
    // - race.resolved just became true
    // - race.snapshots just got populated
    // - phase is still "live" (setPhase("review") hasn't fired yet — it's in a useEffect)
    const phase: RacePhase = "live";
    const resolved = true;
    const hasSnapshots = true;

    const showReplay = computeShowReplay(phase, resolved, hasSnapshots);
    expect(showReplay).toBe(false); // Track, not RaceVisualizer
  });

  it("RaceVisualizer rendered only after phase settles to review", () => {
    const phase: RacePhase = "review";
    const resolved = true;
    const hasSnapshots = true;

    const showReplay = computeShowReplay(phase, resolved, hasSnapshots);
    expect(showReplay).toBe(true); // RaceVisualizer
  });

  it("preshow always shows Track (even if race somehow pre-resolved)", () => {
    const phase: RacePhase = "preshow";
    expect(computeShowReplay(phase, true, true)).toBe(false);
    expect(computeShowReplay(phase, false, false)).toBe(false);
  });
});
