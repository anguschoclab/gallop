import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

// ── Mutable mock state ────────────────────────────────────────────────────────
let mockPhase = "preshow";
let mockFinished = false;
const navigate = vi.fn();

// ── Module mocks (hoisted by vitest) ────────────────────────────────────────
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => navigate,
  useSearch: () => ({ phase: mockPhase }),
  useParams: () => ({ raceId: "test-race-1" }),
  createFileRoute: () => () => ({
    useParams: () => ({ raceId: "test-race-1" }),
    useSearch: () => ({ phase: mockPhase }),
    useNavigate: () => navigate,
  }),
  notFound: () => {
    throw new Error("notFound");
  },
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/hooks/race/useRacePageData", () => ({
  useRacePageData: () => ({
    race: {
      id: "test-race-1",
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
    },
    runners: [
      {
        horseId: "h1",
        name: "Horse One",
        silk: "#ff0000",
        owned: false,
        position: 0,
        velocity: 0,
        finishTime: null,
        lane: 1,
        targetLane: 1,
        laneVelocity: 0,
        barrier: 1,
        topSpeed: 18,
        accel: 3,
        staminaFactor: 1,
        noise: 0,
        affinityBonus: 0,
        runningStyle: "front_runner",
        draftingHorseId: null,
        horse: {} as any,
        weight: 55,
      },
    ],
    raceWeather: undefined,
    resolveRaceWithImpacts: vi.fn(),
    narrativeRef: { current: null },
    messageQueue: { current: [] },
    localHorseMap: new Map(),
    runnerOdds: new Map([["h1", "5-1"]]),
    classBonus: 0,
    calibratedPars: {},
    rngRef: { current: null },
  }),
}));

vi.mock("@/hooks/race/useCommentaryFeed", () => ({
  useCommentaryFeed: () => ({
    announcement: "",
    commentary: [],
    subjectHorseId: null,
  }),
}));

vi.mock("@/hooks/race/useLeaderboardState", () => ({
  useLeaderboardState: () => ({
    sorted: [],
    positionRank: new Map(),
    filter: "all",
    sortBy: "position",
    minBeyer: 0,
    setFilter: vi.fn(),
    setSortBy: vi.fn(),
    setMinBeyer: vi.fn(),
    allFinished: false,
    anyFinished: false,
  }),
}));

vi.mock("@/hooks/race/useLiveRaceSimulation", () => ({
  useLiveRaceSimulation: () => ({
    tick: 0,
    speed: 1,
    setSpeed: vi.fn(),
    get finished() {
      return mockFinished;
    },
    paused: false,
    setPaused: vi.fn(),
    liveSplits: new Map(),
  }),
}));

vi.mock("@/hooks/race/useRacePhase", () => ({
  useRacePhase: () => ({
    phase: mockPhase as any,
    setPhase: (next: string) => {
      mockPhase = next;
      if (next === "live") (toast.info as any)("Race is live");
      else if (next === "review") (toast.info as any)("Results available");
    },
  }),
  RacePhase: {} as any,
}));

// ── Import after mocks ───────────────────────────────────────────────────────
import { LiveRace } from "@/routes/race.$raceId";

// jsdom doesn't implement ResizeObserver or matchMedia.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

afterEach(() => {
  cleanup();
  navigate.mockClear();
  (toast.info as any).mockClear();
  (toast.success as any).mockClear();
  (toast.error as any).mockClear();
  mockPhase = "preshow";
  mockFinished = false;
});

describe("race phase transitions + toasts", () => {
  it("preshow mounts without toast", () => {
    render(createElement(LiveRace));
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("preshow → live triggers toast on Start Race click", () => {
    render(createElement(LiveRace));
    expect(toast.info).not.toHaveBeenCalled();

    const startBtn = screen.getByRole("button", { name: /start race/i });
    fireEvent.click(startBtn);

    expect(toast.info).toHaveBeenCalledWith("Race is live");
  });

  it("live → review auto-advance triggers toast", () => {
    mockPhase = "live";
    mockFinished = true;
    render(createElement(LiveRace));

    expect(toast.info).toHaveBeenCalledWith("Results available");
  });

  it("preshow panel exits and broadcast panel enters during transition", async () => {
    const { rerender, container } = render(createElement(LiveRace));
    expect(mockPhase).toBe("preshow");

    // Trigger phase change via Start Race click
    const startBtn = screen.getByRole("button", { name: /start race/i });
    fireEvent.click(startBtn);

    // Re-render so usePhaseTransition sees the new phase
    rerender(createElement(LiveRace));

    // Immediately after click+rerender, usePhaseTransition should be exiting
    // preshow. The preshow panel should have exit classes.
    const preshowExiting = container.querySelector(".opacity-0.-translate-y-4");
    expect(preshowExiting).toBeTruthy();

    // Wait for transition to complete (300ms)
    await waitFor(() => {
      const broadcastActive = container.querySelector(".opacity-100.translate-y-0");
      expect(broadcastActive).toBeTruthy();
    });
  });

  it("does not mount Track or RaceVisualizer in preshow", () => {
    render(createElement(LiveRace));

    // Track uses shadow-2xl; RacePreShow's betting card does not.
    const track = document.querySelector(".shadow-2xl");
    expect(track).toBeFalsy();

    const visualizer = document.querySelector(".race-visualizer-container");
    expect(visualizer).toBeFalsy();
  });
});
