import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createTestHorse } from "@/tests/helpers";

vi.mock("@/core/race/sectionalAnalysis", () => ({
  derivePaceStyleLabel: vi.fn(() => "Balanced"),
}));

vi.mock("@/core/horse/paceTendency", () => ({
  classifyTendency: vi.fn(() => "mid"),
  classifyDistanceBucket: vi.fn(() => "mile"),
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
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

describe("RunningStyleBreakdown", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the section header", () => {
    const horse = createTestHorse({ id: "h1", name: "Test Horse", ownership: makePlayerOwned() });
    renderWithStore(<RunningStyleBreakdown horse={horse} />, { horses: h2r([horse]) } as any);
    expect(screen.getByText(/Running Style Breakdown/i)).toBeTruthy();
  });

  it("renders compare dropdown when other owned horses with race history exist", () => {
    const horse = createTestHorse({
      id: "h1",
      name: "Main Horse",
      ownership: makePlayerOwned(),
      raceHistory: [{ position: 1, day: 10, raceId: "r1", time: 60 } as any],
    });
    const other = createTestHorse({
      id: "h2",
      name: "Compare Horse",
      ownership: makePlayerOwned(),
      raceHistory: [{ position: 2, day: 10, raceId: "r1", time: 61 } as any],
    });
    renderWithStore(<RunningStyleBreakdown horse={horse} />, {
      horses: h2r([horse, other]),
    } as any);
    expect(screen.getByText(/Compare with/i)).toBeTruthy();
  });

  it("does not show compare horse when no other owned horses with race history exist", () => {
    const horse = createTestHorse({ id: "h1", name: "Solo Horse", ownership: makePlayerOwned() });
    renderWithStore(<RunningStyleBreakdown horse={horse} />, { horses: h2r([horse]) } as any);
    expect(screen.queryByText("Exit Compare")).toBeNull();
  });

  it("does not include non-owned horses in compare options", () => {
    const horse = createTestHorse({ id: "h1", name: "Owned", ownership: makePlayerOwned() });
    const npc = createTestHorse({
      id: "h2",
      name: "Npc Horse",
      ownership: makeUnowned(),
      raceHistory: [{ position: 1, day: 10, raceId: "r1", time: 60 } as any],
    });
    renderWithStore(<RunningStyleBreakdown horse={horse} />, { horses: h2r([horse, npc]) } as any);
    expect(screen.queryByText("Npc Horse")).toBeNull();
  });
});
