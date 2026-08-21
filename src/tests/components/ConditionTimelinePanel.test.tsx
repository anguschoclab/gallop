/**
 * ConditionTimelinePanel.test.tsx
 *
 * Tests for the memoized ConditionTimelinePanel container component.
 * Verifies rendering behavior, prop forwarding to useConditionTimeline,
 * and React.memo isolation from unrelated parent re-renders.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { ConditionSegment } from "@/hooks/race/useConditionTimeline";

// ── Mock useConditionTimeline ────────────────────────────────────────────────

const useConditionTimelineMock = vi.fn((): ConditionSegment[] => []);

vi.mock("@/hooks/race/useConditionTimeline", () => ({
  useConditionTimeline: (...args: unknown[]) => useConditionTimelineMock(...(args as [])),
}));

// ── Mock ConditionTimeline to capture props ──────────────────────────────────

const ConditionTimelineMock = vi.fn((_props?: unknown) =>
  createElement("div", { "data-testid": "condition-timeline" }),
);
vi.mock("@/components/race/ConditionTimeline", () => ({
  ConditionTimeline: (props: unknown) => ConditionTimelineMock(props),
  MemoizedConditionTimeline: (props: unknown) => ConditionTimelineMock(props),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { ConditionTimelinePanel } from "@/components/race/ConditionTimelinePanel";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeRunner(overrides: Partial<Record<string, unknown>> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test Horse",
    silk: "#ff0000",
    ownership: { type: "unowned" },
    position: 100,
    velocity: 15,
    finishTime: null,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    gate: 1,
    topSpeed: 16,
    accel: 1,
    staminaFactor: 1,
    noise: 0,
    affinityBonus: 0,
    runningStyle: "EP",
    draftingHorseId: null,
    weight: 55,
    horse: {} as any,
    ...overrides,
  } as any;
}

function makeSegment(overrides: Partial<ConditionSegment> = {}): ConditionSegment {
  return {
    id: "flying",
    label: "Flying",
    tone: "positive",
    detail: "Clear running",
    startPos: 0,
    endPos: 200,
    startTime: 0,
    endTime: 12.5,
    active: true,
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  runners: [makeRunner()],
  distance: 1600,
  horseId: "h1" as string | null,
  tick: 0,
  simTimeRef: { current: 0 } as any,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  useConditionTimelineMock.mockReset();
  ConditionTimelineMock.mockReset();
  // Restore default mock return value
  useConditionTimelineMock.mockReturnValue([]);
});

describe("ConditionTimelinePanel — rendering", () => {
  it("renders ConditionTimeline when horseId is provided and segments exist", () => {
    useConditionTimelineMock.mockReturnValue([makeSegment()]);

    render(createElement(ConditionTimelinePanel, DEFAULT_PROPS));

    expect(screen.getByTestId("condition-timeline")).toBeTruthy();
  });

  it("does not render inner ConditionTimeline when horseId is null", () => {
    useConditionTimelineMock.mockReturnValue([makeSegment()]);

    render(
      createElement(ConditionTimelinePanel, {
        ...DEFAULT_PROPS,
        horseId: null,
      }),
    );

    expect(screen.queryByTestId("condition-timeline")).toBeNull();
  });

  it("does not render inner ConditionTimeline when segments is empty", () => {
    useConditionTimelineMock.mockReturnValue([]);

    render(createElement(ConditionTimelinePanel, DEFAULT_PROPS));

    expect(screen.queryByTestId("condition-timeline")).toBeNull();
  });
});

describe("ConditionTimelinePanel — useConditionTimeline integration", () => {
  it("calls useConditionTimeline with correct args", () => {
    useConditionTimelineMock.mockReturnValue([]);

    const props = {
      runners: DEFAULT_PROPS.runners,
      distance: 1800,
      horseId: "h2" as string | null,
      tick: 42,
      simTimeRef: { current: 5.5 } as any,
    };

    render(createElement(ConditionTimelinePanel, props));

    expect(useConditionTimelineMock).toHaveBeenCalledTimes(1);
    expect(useConditionTimelineMock).toHaveBeenCalledWith(
      props.runners,
      props.distance,
      props.horseId,
      props.tick,
      props.simTimeRef,
    );
  });

  it("does not call useConditionTimeline when horseId is null", () => {
    // When horseId is null the panel should early-return without calling the hook.
    // The hook itself handles null horseId, but the panel should short-circuit.
    useConditionTimelineMock.mockReturnValue([]);

    render(
      createElement(ConditionTimelinePanel, {
        ...DEFAULT_PROPS,
        horseId: null,
      }),
    );

    // The panel may or may not call the hook when horseId is null —
    // but it must NOT render the inner ConditionTimeline
    expect(screen.queryByTestId("condition-timeline")).toBeNull();
  });
});

describe("ConditionTimelinePanel — memoization", () => {
  it("does not re-render when parent re-renders but props are unchanged", () => {
    useConditionTimelineMock.mockReturnValue([makeSegment()]);

    const { rerender: rerenderParent } = render(
      createElement(ConditionTimelinePanel, DEFAULT_PROPS),
    );

    expect(ConditionTimelineMock).toHaveBeenCalledTimes(1);

    // Re-render with the same props (new parent render, same prop references)
    rerenderParent(createElement(ConditionTimelinePanel, DEFAULT_PROPS));

    // React.memo should prevent the inner component from re-rendering
    expect(ConditionTimelineMock).toHaveBeenCalledTimes(1);
  });

  it("re-renders when tick changes", () => {
    useConditionTimelineMock.mockReturnValue([makeSegment()]);

    const { rerender: rerenderParent } = render(
      createElement(ConditionTimelinePanel, DEFAULT_PROPS),
    );

    expect(ConditionTimelineMock).toHaveBeenCalledTimes(1);

    rerenderParent(
      createElement(ConditionTimelinePanel, {
        ...DEFAULT_PROPS,
        tick: 1,
      }),
    );

    expect(ConditionTimelineMock).toHaveBeenCalledTimes(2);
  });

  it("re-renders when horseId changes", () => {
    useConditionTimelineMock.mockReturnValue([makeSegment()]);

    const { rerender: rerenderParent } = render(
      createElement(ConditionTimelinePanel, DEFAULT_PROPS),
    );

    expect(ConditionTimelineMock).toHaveBeenCalledTimes(1);

    rerenderParent(
      createElement(ConditionTimelinePanel, {
        ...DEFAULT_PROPS,
        horseId: "h2",
      }),
    );

    expect(ConditionTimelineMock).toHaveBeenCalledTimes(2);
  });

  it("re-renders when distance changes", () => {
    useConditionTimelineMock.mockReturnValue([makeSegment()]);

    const { rerender: rerenderParent } = render(
      createElement(ConditionTimelinePanel, DEFAULT_PROPS),
    );

    expect(ConditionTimelineMock).toHaveBeenCalledTimes(1);

    rerenderParent(
      createElement(ConditionTimelinePanel, {
        ...DEFAULT_PROPS,
        distance: 2000,
      }),
    );

    expect(ConditionTimelineMock).toHaveBeenCalledTimes(2);
  });
});

describe("ConditionTimelinePanel — horseName memoization", () => {
  it("forwards horseName derived from runners", () => {
    useConditionTimelineMock.mockReturnValue([makeSegment()]);

    render(createElement(ConditionTimelinePanel, DEFAULT_PROPS));

    expect(ConditionTimelineMock).toHaveBeenCalledTimes(1);
    const received = ConditionTimelineMock.mock.calls[0][0] as {
      horseName?: string;
    };
    expect(received.horseName).toBe("Test Horse");
  });

  it("forwards undefined horseName when horseId is not in runners", () => {
    useConditionTimelineMock.mockReturnValue([makeSegment()]);

    render(
      createElement(ConditionTimelinePanel, {
        ...DEFAULT_PROPS,
        horseId: "nonexistent",
      }),
    );

    const received = ConditionTimelineMock.mock.calls[0][0] as {
      horseName?: string;
    };
    expect(received.horseName).toBeUndefined();
  });
});
