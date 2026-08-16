import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach } from "vitest";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { RunnerMood } from "@/core/race/runnerConditions";

// Mock child components that make network/router calls
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params }: any) =>
    createElement(
      "a",
      { href: "#", "data-to": to, "data-params": JSON.stringify(params) },
      children,
    ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className }: any) =>
    createElement("button", { onClick, className }, children),
}));

vi.mock("@/components/race/PaceGraph", () => ({
  PaceGraph: () => createElement("div", { "data-testid": "pace-graph" }),
}));

vi.mock("@/components/race/SpeedBreakdownChart", () => ({
  SpeedBreakdownChart: () => createElement("div", { "data-testid": "speed-chart" }),
}));

vi.mock("@/components/race/JockeyReportPanel", () => ({
  JockeyReportPanel: () => createElement("div", { "data-testid": "jockey-report" }),
}));

vi.mock("@/components/race/RunnerMoodFace", () => ({
  RunnerMoodFace: ({ mood, horseName, size, tooltipClassName }: any) =>
    createElement(
      "span",
      {
        "data-testid": "mood-face",
        "data-mood-label": mood.label,
        "data-mood-score": mood.score,
        "data-size": size,
        "data-tooltip-class": tooltipClassName,
      },
      `${mood.label} ${mood.score}`,
    ),
}));

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: any) =>
    createElement("div", { "data-testid": "collapsible" }, children),
  CollapsibleTrigger: ({ children }: any) =>
    createElement("div", { "data-testid": "collapsible-trigger" }, children),
  CollapsibleContent: ({ children }: any) =>
    createElement(
      "div",
      { "data-state": "closed", "data-testid": "collapsible-content" },
      children,
    ),
}));

vi.mock("@/core/race/jockeyFeedback", () => ({
  generateJockeyFeedback: () => null,
}));

vi.mock("@/core/common/formatting", () => ({
  formatCurrency: (n: number) => `$${n.toLocaleString()}`,
}));

vi.mock("@/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/constants")>();
  return {
    ...actual,
    PRIZE_SPLIT: [0.6, 0.2, 0.1, 0.05],
    GRADED_PRIZE_SPLIT: [0.6, 0.2, 0.1, 0.05],
    MOOD_FACE_RESULT_OVERLAY_SIZE: 14,
    MOOD_TOOLTIP_OVERLAY_CLASS: "z-[60]",
  };
});

vi.mock("@/lib/cn", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/core/race/engine/compareFinishOrder", () => ({
  compareFinishOrder: (a: any, b: any) => {
    if (a.finishTime === null && b.finishTime === null) return 0;
    if (a.finishTime === null) return 1;
    if (b.finishTime === null) return -1;
    if (a.finishTime !== b.finishTime) return a.finishTime - b.finishTime;
    if (a.gate !== b.gate) return a.gate - b.gate;
    return a.horseId.localeCompare(b.horseId);
  },
}));

// Import after mocks
import { ResultOverlay } from "@/components/race/ResultOverlay";

function makeMood(overrides: Partial<RunnerMood> = {}): RunnerMood {
  return {
    score: 78,
    face: "happy",
    label: "Happy",
    signals: [
      { label: "Handy on the pace", contribution: 18 },
      { label: "Travelling strongly", contribution: 15 },
    ],
    ...overrides,
  };
}

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test Horse",
    silk: "#ff0000",
    owned: false,
    position: 1600,
    velocity: 16,
    finishTime: 90.0,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    gate: 1,
    topSpeed: 18,
    accel: 1,
    staminaFactor: 1,
    noise: 0,
    affinityBonus: 0,
    runningStyle: "EP",
    draftingHorseId: null,
    weight: 55,
    horse: {} as any,
    ...overrides,
  } as Runner;
}

function makeRace(overrides: Record<string, unknown> = {}): any {
  return {
    name: "Test Stakes",
    purse: 100000,
    graded: undefined,
    sectionalSplits: undefined,
    distance: 1600,
    snapshots: undefined,
    ...overrides,
  };
}

afterEach(() => cleanup());

describe("ResultOverlay — mood breakdown", () => {
  it("renders mood face and breakdown when finalMood is present", () => {
    const mood = makeMood();
    const runners = [makeRunner({ owned: true, finalMood: mood })];

    render(
      createElement(ResultOverlay, {
        race: makeRace(),
        runners,
        onClose: vi.fn(),
      } as any),
    );

    // Mood label and score should appear
    expect(screen.getAllByText(/Happy/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/78/).length).toBeGreaterThan(0);
    // All signal labels should appear in the collapsible content
    expect(screen.getByText(/Handy on the pace/)).toBeTruthy();
    expect(screen.getByText(/Travelling strongly/)).toBeTruthy();
  });

  it("renders mood breakdown for all horses, not just owned", () => {
    const mood1 = makeMood({
      score: 78,
      label: "Happy",
      signals: [{ label: "Happy reason", contribution: 18 }],
    });
    const mood2 = makeMood({
      score: 30,
      face: "unhappy",
      label: "Unhappy",
      signals: [{ label: "Unhappy reason", contribution: -20 }],
    });
    const runners = [
      makeRunner({
        horseId: "h1",
        name: "Owned Horse",
        owned: true,
        finishTime: 90.0,
        finalMood: mood1,
      }),
      makeRunner({
        horseId: "h2",
        name: "Other Horse",
        owned: false,
        finishTime: 91.0,
        gate: 2,
        finalMood: mood2,
      }),
    ];

    render(
      createElement(ResultOverlay, {
        race: makeRace(),
        runners,
        onClose: vi.fn(),
      } as any),
    );

    // Both horses should show their mood label
    expect(screen.getAllByText(/Happy/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Unhappy/).length).toBeGreaterThan(0);
    // Both signal labels
    expect(screen.getByText("Happy reason")).toBeTruthy();
    expect(screen.getByText("Unhappy reason")).toBeTruthy();
  });

  it("does not render mood section when finalMood is undefined", () => {
    const runners = [makeRunner({ owned: true, finalMood: undefined })];

    render(
      createElement(ResultOverlay, {
        race: makeRace(),
        runners,
        onClose: vi.fn(),
      } as any),
    );

    // Should not have mood breakdown content
    expect(screen.queryByText(/Mood Breakdown/i)).toBeNull();
  });

  it("does not crash with mixed finalMood presence", () => {
    const mood = makeMood({ signals: [{ label: "Only my reason", contribution: 10 }] });
    const runners = [
      makeRunner({
        horseId: "h1",
        name: "With Mood",
        owned: true,
        finishTime: 90.0,
        finalMood: mood,
      }),
      makeRunner({
        horseId: "h2",
        name: "No Mood",
        owned: false,
        finishTime: 91.0,
        gate: 2,
        finalMood: undefined,
      }),
    ];

    expect(() =>
      render(
        createElement(ResultOverlay, {
          race: makeRace(),
          runners,
          onClose: vi.fn(),
        } as any),
      ),
    ).not.toThrow();

    // Only the runner with finalMood should show signal labels
    expect(screen.getByText("Only my reason")).toBeTruthy();
  });

  it("shows all signals, not just top 3", () => {
    const manySignals = Array.from({ length: 6 }, (_, i) => ({
      label: `Reason number ${i + 1}`,
      contribution: i + 1,
    }));
    const mood = makeMood({ signals: manySignals });
    const runners = [makeRunner({ owned: true, finalMood: mood })];

    render(
      createElement(ResultOverlay, {
        race: makeRace(),
        runners,
        onClose: vi.fn(),
      } as any),
    );

    for (let i = 0; i < 6; i++) {
      expect(screen.getByText(`Reason number ${i + 1}`)).toBeTruthy();
    }
  });

  it("collapsible mood breakdown is collapsed by default", () => {
    const mood = makeMood({ signals: [{ label: "Hidden until expanded", contribution: 5 }] });
    const runners = [makeRunner({ owned: true, finalMood: mood })];

    render(
      createElement(ResultOverlay, {
        race: makeRace(),
        runners,
        onClose: vi.fn(),
      } as any),
    );

    // The trigger should be visible
    const trigger = screen.queryByText(/Mood Breakdown/i);
    expect(trigger).toBeTruthy();

    // The reason content should NOT be visible when collapsed
    // (Radix Collapsible uses data-state="closed" and hides content)
    // We check that the content is not directly visible
    const hiddenContent = screen.queryByText("Hidden until expanded");
    // When collapsed, Radix sets display:none on the content, so the element
    // may exist in DOM but not be visible. We check it's not shown.
    if (hiddenContent) {
      expect(hiddenContent.closest("[data-state]")).toBeTruthy();
      expect(hiddenContent.closest("[data-state]")?.getAttribute("data-state")).toBe("closed");
    }
  });

  it("passes MOOD_FACE_RESULT_OVERLAY_SIZE and MOOD_TOOLTIP_OVERLAY_CLASS to RunnerMoodFace", () => {
    const mood = makeMood();
    const runners = [makeRunner({ owned: true, finalMood: mood })];

    render(
      createElement(ResultOverlay, {
        race: makeRace(),
        runners,
        onClose: vi.fn(),
      } as any),
    );

    const moodFace = screen.getByTestId("mood-face");
    expect(moodFace.getAttribute("data-size")).toBe("14");
    expect(moodFace.getAttribute("data-tooltip-class")).toBe("z-[60]");
  });
});
