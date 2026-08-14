/**
 * RaceBroadcast.render.test.tsx
 *
 * Real-component render test for RaceBroadcast — the ONLY test that imports
 * and renders the actual RaceBroadcast.tsx component (unlike
 * RaceBroadcast.phaseGating.test.tsx, which tests copied pure logic).
 *
 * Verifies that the grouped prop interface (simulation, commentary, leaderboard,
 * controls, analysis, fieldDialog) is correctly destructured and forwarded to
 * child components.
 */
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// ── Mock child components to capture received props ──────────────────────────

const TrackMock = vi.fn((_props?: unknown) => createElement("div", { "data-testid": "track" }));
vi.mock("@/components/race/Track", () => ({
  Track: (props: unknown) => TrackMock(props),
}));

const RaceVisualizerMock = vi.fn((_props?: unknown) =>
  createElement("div", { "data-testid": "race-visualizer" }),
);
vi.mock("@/components/race/RaceVisualizer", () => ({
  RaceVisualizer: (props: unknown) => RaceVisualizerMock(props),
}));

const BroadcastCommentaryMock = vi.fn((_props?: unknown) =>
  createElement("div", { "data-testid": "broadcast-commentary" }),
);
vi.mock("@/components/race/BroadcastCommentary", () => ({
  BroadcastCommentary: (props: unknown) => BroadcastCommentaryMock(props),
}));

const LeaderboardMock = vi.fn((_props?: unknown) =>
  createElement("div", { "data-testid": "leaderboard" }),
);
vi.mock("@/components/race/Leaderboard", () => ({
  Leaderboard: (props: unknown) => LeaderboardMock(props),
}));

const RaceControlBarMock = vi.fn((_props?: unknown) =>
  createElement("div", { "data-testid": "race-control-bar" }),
);
vi.mock("@/components/race/RaceControlBar", () => ({
  RaceControlBar: (props: unknown) => RaceControlBarMock(props),
}));

const ResultOverlayMock = vi.fn((_props?: unknown) =>
  createElement("div", { "data-testid": "result-overlay" }),
);
vi.mock("@/components/race/ResultOverlay", () => ({
  ResultOverlay: (props: unknown) => ResultOverlayMock(props),
}));

const RaceFieldDialogMock = vi.fn((_props?: unknown) =>
  createElement("div", { "data-testid": "race-field-dialog" }),
);
vi.mock("@/components/race/RaceFieldDialog", () => ({
  RaceFieldDialog: (props: unknown) => RaceFieldDialogMock(props),
}));

const WeatherForecastStripMock = vi.fn((_props?: unknown) =>
  createElement("div", { "data-testid": "weather-forecast-strip" }),
);
vi.mock("@/components/race/WeatherForecastStrip", () => ({
  WeatherForecastStrip: (props: unknown) => WeatherForecastStripMock(props),
}));

const BookmarkButtonMock = vi.fn((_props?: unknown) =>
  createElement("div", { "data-testid": "bookmark-button" }),
);
vi.mock("@/components/bookmarks/BookmarkButton", () => ({
  BookmarkButton: (props: unknown) => BookmarkButtonMock(props),
}));

const PostRaceAnalysisMock = vi.fn((_props?: unknown) =>
  createElement("div", { "data-testid": "post-race-analysis" }),
);
vi.mock("@/components/race/PostRaceAnalysis", () => ({
  PostRaceAnalysis: (props: unknown) => PostRaceAnalysisMock(props),
}));

const ConditionTimelinePanelMock = vi.fn((_props?: unknown) =>
  createElement("div", { "data-testid": "condition-timeline-panel" }),
);
vi.mock("@/components/race/ConditionTimelinePanel", () => ({
  ConditionTimelinePanel: (props: unknown) => ConditionTimelinePanelMock(props),
}));

const InRunningSnapshotDialogMock = vi.fn((_props?: unknown) =>
  createElement("div", { "data-testid": "in-running-snapshot-dialog" }),
);
vi.mock("@/components/race/InRunningSnapshotDialog", () => ({
  InRunningSnapshotDialog: (props: unknown) => InRunningSnapshotDialogMock(props),
}));

vi.mock("@/components/race/raceVisualHelpers", () => ({
  getSkyBackground: vi.fn(() => "url(/sky.png)"),
}));

vi.mock("@/lib/cn", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import { RaceBroadcast } from "@/components/race/RaceBroadcast";

// ── Test fixtures ─────────────────────────────────────────────────────────────

function makeRunner(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    horseId: "h1",
    name: "Test Horse",
    silk: "#ff0000",
    owned: false,
    position: 0,
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

function makeRace(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "race-1",
    name: "Test Stakes",
    distance: 1600,
    surface: "Turf",
    trackId: "test-track",
    trackCondition: "fast",
    day: 1,
    resolved: false,
    raceClass: "Stakes",
    entryFee: 0,
    purse: 100000,
    fieldSize: 4,
    entries: [],
    weather: "sunny",
    graded: {
      grade: "G1",
      track: "Test Track",
      trackId: "test-track",
      surface: "Turf",
      key: "test-stakes",
    },
    ...overrides,
  } as any;
}

function makeGroupedProps(overrides: Record<string, unknown> = {}): any {
  const race = makeRace();
  const runners = [makeRunner()];
  return {
    race,
    runners,
    raceWeather: { tempC: 20, windKph: 10 },
    simulation: {
      tick: 0,
      phase: "live" as any,
      finished: false,
      paused: false,
      speed: 1,
      simTimeRef: { current: 0 } as any,
    },
    commentary: {
      commentary: [],
      subjectHorseId: null,
      announcement: "",
    },
    leaderboard: {
      sorted: [{ r: runners[0], beyer: 80 }],
      positionRank: new Map([["h1", 1]]),
      runnerOdds: new Map([["h1", "5-1"]]),
      filter: "all" as const,
      sortBy: "position" as const,
      minBeyer: 0,
      hasTies: false,
      tiedHorseIds: new Set<string>(),
      onFilterChange: vi.fn(),
      onSortByChange: vi.fn(),
      onMinBeyerChange: vi.fn(),
    },
    controls: {
      onTogglePause: vi.fn(),
      onSetSpeed: vi.fn(),
      onSetFollowTarget: vi.fn(),
      onToggleHideResults: vi.fn(),
      onShowAllCards: vi.fn(),
      onNavigateBack: vi.fn(),
      followTarget: null,
      hideUntilAllFinished: false,
      allFinished: false,
      anyFinished: false,
    },
    analysis: {
      analysisOpen: false,
      setAnalysisOpen: vi.fn(),
      analysisRef: { current: null } as any,
      liveSplits: new Map(),
      calibratedPars: {},
      localHorseMap: new Map(),
    },
    fieldDialog: {
      showAllCards: false,
      setShowAllCards: vi.fn(),
    },
    snapshots: {
      snapshots: [],
      selectedSnapshot: null,
      onSelectSnapshot: vi.fn(),
      onTakeSnapshot: vi.fn(),
      onClearSnapshots: vi.fn(),
      isInspectorOpen: false,
      setIsInspectorOpen: vi.fn(),
    },
    ...overrides,
  };
}

// jsdom doesn't implement ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock as any;

afterEach(() => {
  cleanup();
  TrackMock.mockClear();
  RaceVisualizerMock.mockClear();
  BroadcastCommentaryMock.mockClear();
  LeaderboardMock.mockClear();
  RaceControlBarMock.mockClear();
  ResultOverlayMock.mockClear();
  RaceFieldDialogMock.mockClear();
  WeatherForecastStripMock.mockClear();
  BookmarkButtonMock.mockClear();
  PostRaceAnalysisMock.mockClear();
  ConditionTimelinePanelMock.mockClear();
  InRunningSnapshotDialogMock.mockClear();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("RaceBroadcast — grouped prop rendering", () => {
  it("renders without throwing when given grouped props", () => {
    expect(() => render(createElement(RaceBroadcast, makeGroupedProps() as any))).not.toThrow();
  });

  it("renders Track (not RaceVisualizer) during live phase", () => {
    render(createElement(RaceBroadcast, makeGroupedProps()));

    expect(screen.getByTestId("track")).toBeTruthy();
    expect(screen.queryByTestId("race-visualizer")).toBeNull();
  });

  it("renders RaceVisualizer (not Track) during review phase with resolved race + snapshots", () => {
    const props = makeGroupedProps({
      race: makeRace({
        resolved: true,
        snapshots: [{ tick: 0, runners: [] }],
      }),
      simulation: {
        tick: 0,
        phase: "review" as any,
        finished: true,
        paused: false,
        speed: 1,
        simTimeRef: { current: 0 } as any,
      },
    });
    render(createElement(RaceBroadcast, props));

    expect(screen.getByTestId("race-visualizer")).toBeTruthy();
    expect(screen.queryByTestId("track")).toBeNull();
  });

  it("forwards simulation props to RaceControlBar", () => {
    const props = makeGroupedProps();
    render(createElement(RaceBroadcast, props));

    expect(RaceControlBarMock).toHaveBeenCalledTimes(1);
    const received = RaceControlBarMock.mock.calls[0][0] as Record<string, unknown>;
    expect(received.race).toBe(props.race);
    expect(received.finished).toBe(false);
    expect(received.paused).toBe(false);
    expect(received.speed).toBe(1);
    expect(received.followTarget).toBe(null);
  });

  it("forwards commentary lines to BroadcastCommentary", () => {
    const commentaryLines = [
      { id: "c1", text: "And they're off!", timestamp: 1.0, type: "START" },
    ] as any;
    const props = makeGroupedProps({
      commentary: {
        commentary: commentaryLines,
        subjectHorseId: "h1",
        announcement: "And they're off!",
      },
    });
    render(createElement(RaceBroadcast, props));

    expect(BroadcastCommentaryMock).toHaveBeenCalledTimes(1);
    const received = BroadcastCommentaryMock.mock.calls[0][0] as {
      commentary: unknown[];
    };
    expect(received.commentary).toBe(commentaryLines);
  });

  it("forwards leaderboard props to Leaderboard", () => {
    const props = makeGroupedProps();
    render(createElement(RaceBroadcast, props));

    expect(LeaderboardMock).toHaveBeenCalledTimes(1);
    const received = LeaderboardMock.mock.calls[0][0] as Record<string, unknown>;
    expect(received.sorted).toBe(props.leaderboard.sorted);
    expect(received.positionRank).toBe(props.leaderboard.positionRank);
    expect(received.runnerOdds).toBe(props.leaderboard.runnerOdds);
    expect(received.filter).toBe("all");
    expect(received.sortBy).toBe("position");
    expect(received.minBeyer).toBe(0);
    expect(received.hasTies).toBe(false);
    expect(received.tiedHorseIds).toBe(props.leaderboard.tiedHorseIds);
  });

  it("renders ResultOverlay when finished is true", () => {
    const props = makeGroupedProps({
      simulation: {
        tick: 0,
        phase: "review" as any,
        finished: true,
        paused: false,
        speed: 1,
        simTimeRef: { current: 0 } as any,
      },
    });
    render(createElement(RaceBroadcast, props));

    expect(ResultOverlayMock).toHaveBeenCalledTimes(1);
    const received = ResultOverlayMock.mock.calls[0][0] as Record<string, unknown>;
    expect(received.race).toBe(props.race);
    expect(received.runners).toBe(props.runners);
  });

  it("does not render ResultOverlay when finished is false", () => {
    render(createElement(RaceBroadcast, makeGroupedProps()));

    expect(ResultOverlayMock).not.toHaveBeenCalled();
  });

  it("renders PostRaceAnalysis in review phase", () => {
    const props = makeGroupedProps({
      simulation: {
        tick: 0,
        phase: "review" as any,
        finished: true,
        paused: false,
        speed: 1,
        simTimeRef: { current: 0 } as any,
      },
      analysis: {
        analysisOpen: true,
        setAnalysisOpen: vi.fn(),
        analysisRef: { current: null } as any,
        liveSplits: new Map(),
        calibratedPars: {},
        localHorseMap: new Map(),
      },
    });
    render(createElement(RaceBroadcast, props));

    expect(PostRaceAnalysisMock).toHaveBeenCalledTimes(1);
    const received = PostRaceAnalysisMock.mock.calls[0][0] as Record<string, unknown>;
    expect(received.race).toBe(props.race);
    expect(received.runners).toBe(props.runners);
    expect(received.liveSplits).toBe(props.analysis.liveSplits);
    expect(received.localHorseMap).toBe(props.analysis.localHorseMap);
    expect(received.calibratedPars).toBe(props.analysis.calibratedPars);
  });

  it("forwards fieldDialog open state to RaceFieldDialog", () => {
    const props = makeGroupedProps({
      fieldDialog: { showAllCards: true, setShowAllCards: vi.fn() },
    });
    render(createElement(RaceBroadcast, props));

    expect(RaceFieldDialogMock).toHaveBeenCalledTimes(1);
    const received = RaceFieldDialogMock.mock.calls[0][0] as Record<string, unknown>;
    expect(received.open).toBe(true);
    expect(received.raceName).toBe(props.race.name);
    expect(received.runners).toBe(props.runners);
    expect(received.localHorseMap).toBe(props.analysis.localHorseMap);
  });

  it("renders announcement in sr-only live region", () => {
    const props = makeGroupedProps({
      commentary: {
        commentary: [],
        subjectHorseId: null,
        announcement: "Test announcement",
      },
    });
    render(createElement(RaceBroadcast, props));

    const liveRegion = screen.getByText("Test announcement");
    expect(liveRegion.closest("[aria-live]")).toBeTruthy();
    expect(liveRegion.closest("[aria-live]")?.getAttribute("aria-live")).toBe("polite");
  });

  it("renders BookmarkButton with race id and name", () => {
    const props = makeGroupedProps();
    render(createElement(RaceBroadcast, props));

    expect(BookmarkButtonMock).toHaveBeenCalledTimes(1);
    const received = BookmarkButtonMock.mock.calls[0][0] as Record<string, unknown>;
    expect(received.type).toBe("race");
    expect(received.id).toBe(props.race.id);
    expect(received.label).toBe(props.race.name);
  });
});

describe("RaceBroadcast — ConditionTimelinePanel integration", () => {
  it("does not render ConditionTimelinePanel when followTarget and subjectHorseId are null", () => {
    render(createElement(RaceBroadcast, makeGroupedProps()));

    expect(ConditionTimelinePanelMock).not.toHaveBeenCalled();
  });

  it("forwards correct props to ConditionTimelinePanel when followTarget is set", () => {
    const props = makeGroupedProps({
      controls: {
        onTogglePause: vi.fn(),
        onSetSpeed: vi.fn(),
        onSetFollowTarget: vi.fn(),
        onToggleHideResults: vi.fn(),
        onShowAllCards: vi.fn(),
        onNavigateBack: vi.fn(),
        followTarget: "h1",
        hideUntilAllFinished: false,
        allFinished: false,
        anyFinished: false,
      },
    });
    render(createElement(RaceBroadcast, props));

    expect(ConditionTimelinePanelMock).toHaveBeenCalledTimes(1);
    const received = ConditionTimelinePanelMock.mock.calls[0][0] as Record<string, unknown>;
    expect(received.horseId).toBe("h1");
    expect(received.runners).toBe(props.runners);
    expect(received.distance).toBe(props.race.distance);
    expect(received.tick).toBe(props.simulation.tick);
    expect(received.simTimeRef).toBe(props.simulation.simTimeRef);
  });

  it("forwards subjectHorseId to ConditionTimelinePanel when followTarget is null", () => {
    const props = makeGroupedProps({
      commentary: {
        commentary: [],
        subjectHorseId: "h1",
        announcement: "",
      },
    });
    render(createElement(RaceBroadcast, props));

    expect(ConditionTimelinePanelMock).toHaveBeenCalledTimes(1);
    const received = ConditionTimelinePanelMock.mock.calls[0][0] as Record<string, unknown>;
    expect(received.horseId).toBe("h1");
  });

  it("does not render ConditionTimelinePanel when showReplay is true", () => {
    const props = makeGroupedProps({
      race: makeRace({
        resolved: true,
        snapshots: [{ tick: 0, runners: [] }],
      }),
      simulation: {
        tick: 0,
        phase: "review" as any,
        finished: true,
        paused: false,
        speed: 1,
        simTimeRef: { current: 0 } as any,
      },
      controls: {
        onTogglePause: vi.fn(),
        onSetSpeed: vi.fn(),
        onSetFollowTarget: vi.fn(),
        onToggleHideResults: vi.fn(),
        onShowAllCards: vi.fn(),
        onNavigateBack: vi.fn(),
        followTarget: "h1",
        hideUntilAllFinished: false,
        allFinished: false,
        anyFinished: false,
      },
    });
    render(createElement(RaceBroadcast, props));

    expect(ConditionTimelinePanelMock).not.toHaveBeenCalled();
  });
});

describe("RaceBroadcast — in-running snapshot integration", () => {
  it("forwards snapshot handlers and count to RaceControlBar", () => {
    const onTakeSnapshot = vi.fn();
    const props = makeGroupedProps({
      snapshots: {
        snapshots: [{ id: "snap-1" }] as any,
        selectedSnapshot: { id: "snap-1" } as any,
        onSelectSnapshot: vi.fn(),
        onTakeSnapshot,
        onClearSnapshots: vi.fn(),
        isInspectorOpen: false,
        setIsInspectorOpen: vi.fn(),
      },
    });

    render(createElement(RaceBroadcast, props));

    expect(RaceControlBarMock).toHaveBeenCalledTimes(1);
    const received = RaceControlBarMock.mock.calls[0][0] as Record<string, unknown>;
    expect(received.onTakeSnapshot).toBe(onTakeSnapshot);
    expect(received.snapshotCount).toBe(1);
  });

  it("renders InRunningSnapshotDialog when snapshots prop is provided", () => {
    const props = makeGroupedProps();
    render(createElement(RaceBroadcast, props));

    expect(InRunningSnapshotDialogMock).toHaveBeenCalledTimes(1);
    const received = InRunningSnapshotDialogMock.mock.calls[0][0] as Record<string, unknown>;
    expect(received.snapshots).toBe(props.snapshots.snapshots);
    expect(received.selectedSnapshot).toBe(props.snapshots.selectedSnapshot);
  });
});
