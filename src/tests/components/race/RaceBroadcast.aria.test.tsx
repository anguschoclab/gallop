/**
 * RaceBroadcast.aria.test.tsx
 *
 * Verifies the race broadcast screen-reader contract:
 *  - an aria-live="polite" atomic region renders the latest announcement
 *  - useCommentaryFeed surfaces queued commentary (including owned-horse
 *    position-change lines) into that announcement slot
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement, useRef, type ReactNode } from "react";
import { render, cleanup, act, renderHook } from "@testing-library/react";

// ── Mock heavy children so the shell renders standalone ──────────────────────

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    params: _params,
    search: _search,
    ...props
  }: { to?: string; children?: ReactNode } & Record<string, unknown>) =>
    createElement("a", { href: to, ...props }, children),
  useNavigate: () => () => {},
}));

vi.mock("@/domains/race/ui/Track", () => ({ Track: () => null }));
vi.mock("@/domains/race/ui/RaceVisualizer", () => ({ RaceVisualizer: () => null }));
vi.mock("@/domains/race/ui/BroadcastCommentary", () => ({ BroadcastCommentary: () => null }));
vi.mock("@/domains/race/ui/Leaderboard", () => ({ Leaderboard: () => null }));
vi.mock("@/domains/race/ui/RaceControlBar", () => ({ RaceControlBar: () => null }));
vi.mock("@/domains/race/ui/ResultOverlay", () => ({ ResultOverlay: () => null }));
vi.mock("@/domains/race/ui/RaceFieldDialog", () => ({ RaceFieldDialog: () => null }));
vi.mock("@/domains/race/ui/WeatherForecastStrip", () => ({ WeatherForecastStrip: () => null }));
vi.mock("@/domains/race/ui/PostRaceAnalysis", () => ({ PostRaceAnalysis: () => null }));
vi.mock("@/domains/race/ui/ConditionTimelinePanel", () => ({ ConditionTimelinePanel: () => null }));
vi.mock("@/domains/race/ui/InRunningSnapshotDialog", () => ({
  InRunningSnapshotDialog: () => null,
}));
vi.mock("@/domains/bookmarks/ui/BookmarkButton", () => ({ BookmarkButton: () => null }));
vi.mock("@/domains/race/application/raceVisualHelpers", () => ({
  getSkyBackground: vi.fn(() => "url(/sky.png)"),
}));

import { RaceBroadcast } from "@/domains/race/ui/RaceBroadcast";
import { useCommentaryFeed } from "@/domains/race/application/hooks/useCommentaryFeed";
import {
  COMMENTARY_DRAIN_INTERVAL_MS,
  COMMENTARY_PACING_MS,
} from "@/domains/race/model/raceBroadcastConstants";
import { makeUnowned } from "@/domains/horse/simulation/ownership";
import type { CommentaryLine } from "@/domains/narrative/application/commentaryGenerator";

function makeGroupedProps(announcement: string) {
  const runner = {
    id: "r1",
    horseId: "h1",
    name: "Silk Purse",
    ownership: makeUnowned(),
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
    horse: {},
  };
  return {
    race: {
      id: "race-1",
      name: "Test Stakes",
      distance: 1600,
      surface: "Turf",
      trackId: "t",
      trackCondition: "fast",
      day: 1,
      resolved: false,
      raceClass: "Stakes",
      entryFee: 0,
      purse: 100000,
      fieldSize: 4,
      entries: [],
      weather: "sunny",
      graded: { grade: "G1", track: "T", trackId: "t", surface: "Turf", key: "k" },
    },
    runners: [runner],
    raceWeather: { tempC: 20, windKph: 10 },
    simulation: { tick: 0, phase: "live", finished: false, paused: false, speed: 1 },
    commentary: { commentary: [], subjectHorseId: null, announcement },
    leaderboard: {
      sorted: [{ r: runner, beyer: 80 }],
      positionRank: new Map([["h1", 1]]),
      runnerOdds: new Map(),
      filter: "all",
      sortBy: "position",
      minBeyer: 0,
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
      analysisRef: { current: null },
      liveSplits: new Map(),
      calibratedPars: {},
      localHorseMap: new Map(),
    },
    fieldDialog: { showAllCards: false, setShowAllCards: vi.fn() },
  } as never;
}

describe("RaceBroadcast aria-live region", () => {
  afterEach(cleanup);

  it("exposes a polite, atomic live region containing the latest announcement", () => {
    const { container } = render(
      createElement(RaceBroadcast, makeGroupedProps("Silk Purse takes the lead")),
    );
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    expect(liveRegion).toHaveTextContent("Silk Purse takes the lead");
  });

  it("live region is visually hidden but present for assistive tech", () => {
    const { container } = render(createElement(RaceBroadcast, makeGroupedProps("")));
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion!.className).toContain("sr-only");
  });
});

describe("useCommentaryFeed announcements", () => {
  it("announces queued commentary lines, including owned-horse position changes", () => {
    vi.useFakeTimers();
    try {
      const ownedPositionLine: CommentaryLine = {
        id: "c1",
        text: "Your horse moves into 2nd",
        timestamp: 12,
        horseId: "owned-horse",
        type: "POSITION_CHECK",
      } as CommentaryLine;

      const { result } = renderHook(() => {
        const queue = useRef<CommentaryLine[]>([]);
        return { feed: useCommentaryFeed(queue, false), queue };
      });

      act(() => {
        result.current.queue.current.push(ownedPositionLine);
        vi.advanceTimersByTime(COMMENTARY_PACING_MS + COMMENTARY_DRAIN_INTERVAL_MS + 10);
      });

      expect(result.current.feed.announcement).toBe("Your horse moves into 2nd");
      expect(result.current.feed.subjectHorseId).toBe("owned-horse");
    } finally {
      vi.useRealTimers();
    }
  });
});
