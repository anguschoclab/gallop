import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createTestHorse } from "@/tests/helpers";

vi.mock("@/core/race/sectionalAnalysis", () => ({
  derivePaceStyleLabel: vi.fn(() => "Balanced"),
}));

vi.mock("@/core/horse/paceTendency", () => ({
  classifyTendency: vi.fn(() => "mid"),
  distanceBucket: vi.fn(() => "mile"),
  getHorseTendencyStats: vi.fn(() => ({
    sample: 0,
    counts: { front: 0, mid: 0, off: 0 },
    wins: { front: 0, mid: 0, off: 0 },
    itm: { front: 0, mid: 0, off: 0 },
    dominant: null,
    dominantShare: 0,
  })),
  TENDENCY_LABEL: { front: "Front", mid: "Mid", off: "Off" },
}));

import { RunningStyleBreakdown } from "@/components/horse/RunningStyleBreakdown";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

describe("RunningStyleBreakdown", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the section header", () => {
    const horse = createTestHorse({ id: "h1", name: "Test Horse", owned: true });
    renderWithStore(<RunningStyleBreakdown horse={horse} />, { horses: h2r([horse]) } as any);
    expect(screen.getByText(/Running Style Breakdown/i)).toBeTruthy();
  });

  it("renders compare dropdown when other owned horses with race history exist", () => {
    const horse = createTestHorse({
      id: "h1",
      name: "Main Horse",
      owned: true,
      raceHistory: [{ position: 1, day: 10, raceId: "r1", time: 60 } as any],
    });
    const other = createTestHorse({
      id: "h2",
      name: "Compare Horse",
      owned: true,
      raceHistory: [{ position: 2, day: 10, raceId: "r1", time: 61 } as any],
    });
    renderWithStore(<RunningStyleBreakdown horse={horse} />, {
      horses: h2r([horse, other]),
    } as any);
    expect(screen.getByText(/Compare with/i)).toBeTruthy();
  });

  it("does not show compare horse when no other owned horses with race history exist", () => {
    const horse = createTestHorse({ id: "h1", name: "Solo Horse", owned: true });
    renderWithStore(<RunningStyleBreakdown horse={horse} />, { horses: h2r([horse]) } as any);
    expect(screen.queryByText("Exit Compare")).toBeNull();
  });

  it("does not include non-owned horses in compare options", () => {
    const horse = createTestHorse({ id: "h1", name: "Owned", owned: true });
    const npc = createTestHorse({
      id: "h2",
      name: "Npc Horse",
      owned: false,
      raceHistory: [{ position: 1, day: 10, raceId: "r1", time: 60 } as any],
    });
    renderWithStore(<RunningStyleBreakdown horse={horse} />, { horses: h2r([horse, npc]) } as any);
    expect(screen.queryByText("Npc Horse")).toBeNull();
  });
});
