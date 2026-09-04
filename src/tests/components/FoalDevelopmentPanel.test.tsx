/**
 * FoalDevelopmentPanel.test.tsx — Panel rendering tests.
 *
 * Verifies the panel surfaces the active milestone with the exact per-stat
 * deltas for each choice, and shows an accurate countdown for the next
 * upcoming milestone when nothing is currently actionable.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createTestHorse } from "@/tests/helpers";
import { createDefaultFoalDevelopmentArc } from "@/core/horse/foalDevelopment";
import type { Horse } from "@/core/horse/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params }: any) => (
    <a
      href={typeof to === "string" ? to : "#"}
      data-to={typeof to === "string" ? to : ""}
      data-params={params ? JSON.stringify(params) : ""}
    >
      {children}
    </a>
  ),
}));

import { FoalDevelopmentPanel } from "@/components/horse/FoalDevelopmentPanel";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import { makePlayerOwned } from "@/core/horse/ownership";

function makeHorse(overrides: Partial<Horse> = {}) {
  return createTestHorse({
    id: "foal-1",
    name: "Test Foal",
    ownership: makePlayerOwned(),
    developmentArc: createDefaultFoalDevelopmentArc(0),
    ...overrides,
  });
}

describe("FoalDevelopmentPanel", () => {
  afterEach(() => cleanup());

  it("returns nothing when the horse has no development arc", () => {
    const horse = makeHorse({ developmentArc: undefined });
    const { container } = renderWithStore(<FoalDevelopmentPanel horse={horse} />, {
      horses: h2r([horse]),
      day: 20,
    } as any);
    expect(container.firstChild).toBeNull();
  });

  it("renders the exact per-stat deltas for every choice on the active milestone", () => {
    const horse = makeHorse();
    // birthDay=0, breaking_in triggers at day 18.
    renderWithStore(<FoalDevelopmentPanel horse={horse} />, {
      horses: h2r([horse]),
      day: 18,
    } as any);

    // Active milestone label surfaces.
    expect(screen.getByText(/Breaking In awaiting your decision/i)).toBeTruthy();

    // Bold Approach: speed +2, acceleration +2, stamina -1
    const bold = screen.getByText("Bold Approach").parentElement!;
    expect(within(bold).getByText("speed: +2")).toBeTruthy();
    expect(within(bold).getByText("acceleration: +2")).toBeTruthy();
    expect(within(bold).getByText("stamina: -1")).toBeTruthy();

    // Patient Method: consistency +2, stamina +2, speed -1
    const patient = screen.getByText("Patient Method").parentElement!;
    expect(within(patient).getByText("consistency: +2")).toBeTruthy();
    expect(within(patient).getByText("stamina: +2")).toBeTruthy();
    expect(within(patient).getByText("speed: -1")).toBeTruthy();

    // Natural Progression: speed +1, stamina +1, acceleration +1
    const natural = screen.getByText("Natural Progression").parentElement!;
    expect(within(natural).getByText("speed: +1")).toBeTruthy();
    expect(within(natural).getByText("stamina: +1")).toBeTruthy();
    expect(within(natural).getByText("acceleration: +1")).toBeTruthy();

    // Deep link uses the correct route + params.
    const link = screen.getByText(/Resolve Milestone/i).closest("a")!;
    expect(link.getAttribute("data-to")).toBe("/foal-development/$horseId");
    expect(link.getAttribute("data-params")).toBe(JSON.stringify({ horseId: "foal-1" }));
  });

  it("shows the countdown to the next upcoming milestone when nothing is actionable", () => {
    const horse = makeHorse();
    // Day 10: breaking_in (day 18) is 8 days away, no active milestone.
    renderWithStore(<FoalDevelopmentPanel horse={horse} />, {
      horses: h2r([horse]),
      day: 10,
    } as any);

    expect(screen.getByText(/Next milestone:/i)).toBeTruthy();
    expect(screen.getByText("Breaking In")).toBeTruthy();
    expect(screen.getByText(/Day 18 \(in 8d\)/)).toBeTruthy();
  });

  it("does not render choice deltas outside an active milestone", () => {
    const horse = makeHorse();
    renderWithStore(<FoalDevelopmentPanel horse={horse} />, {
      horses: h2r([horse]),
      day: 5,
    } as any);
    expect(screen.queryByText(/awaiting your decision/i)).toBeNull();
    expect(screen.queryByText("Bold Approach")).toBeNull();
  });

  it("shows fully-complete state and resolved history once all milestones are resolved", () => {
    const arc = createDefaultFoalDevelopmentArc(0);
    arc.milestones[0].status = "resolved";
    arc.milestones[0].resolvedChoiceKey = "bold_approach";
    arc.milestones[0].resolvedOnDay = 18;
    arc.milestones[1].status = "resolved";
    arc.milestones[1].resolvedChoiceKey = "sprint_focus";
    arc.milestones[1].resolvedOnDay = 24;
    const horse = makeHorse({ developmentArc: arc });

    renderWithStore(<FoalDevelopmentPanel horse={horse} />, {
      horses: h2r([horse]),
      day: 30,
    } as any);
    expect(screen.getByText(/All development milestones complete/i)).toBeTruthy();
    expect(screen.getByText("Bold Approach")).toBeTruthy();
    expect(screen.getByText("Sprint Focus")).toBeTruthy();
  });

  describe("countdown boundaries around the trigger day", () => {
    it("day = triggerDay - 1: shows countdown 'in 1d' and no active decision", () => {
      const horse = makeHorse();
      renderWithStore(<FoalDevelopmentPanel horse={horse} />, {
        horses: h2r([horse]),
        day: 17,
      } as any);
      expect(screen.queryByText(/awaiting your decision/i)).toBeNull();
      expect(screen.getByText(/Day 18 \(in 1d\)/)).toBeTruthy();
    });

    it("day = triggerDay: activates the milestone (not the countdown)", () => {
      const horse = makeHorse();
      renderWithStore(<FoalDevelopmentPanel horse={horse} />, {
        horses: h2r([horse]),
        day: 18,
      } as any);
      expect(screen.getByText(/Breaking In awaiting your decision/i)).toBeTruthy();
      expect(screen.queryByText(/Next milestone:/i)).toBeNull();
    });

    it("day = triggerDay + 1: still active (past trigger, not yet resolved)", () => {
      const horse = makeHorse();
      renderWithStore(<FoalDevelopmentPanel horse={horse} />, {
        horses: h2r([horse]),
        day: 19,
      } as any);
      expect(screen.getByText(/Breaking In awaiting your decision/i)).toBeTruthy();
    });

    it("after resolving breaking_in, day = early_workouts triggerDay - 1 shows 'in 1d'", () => {
      const arc = createDefaultFoalDevelopmentArc(0);
      arc.milestones[0].status = "resolved";
      arc.milestones[0].resolvedChoiceKey = "bold_approach";
      arc.milestones[0].resolvedOnDay = 18;
      const horse = makeHorse({ developmentArc: arc });
      renderWithStore(<FoalDevelopmentPanel horse={horse} />, {
        horses: h2r([horse]),
        day: 23,
      } as any);
      expect(screen.getByText(/Day 24 \(in 1d\)/)).toBeTruthy();
      expect(screen.queryByText(/awaiting your decision/i)).toBeNull();
    });

    it("after resolving breaking_in, day = early_workouts triggerDay activates it", () => {
      const arc = createDefaultFoalDevelopmentArc(0);
      arc.milestones[0].status = "resolved";
      arc.milestones[0].resolvedChoiceKey = "bold_approach";
      arc.milestones[0].resolvedOnDay = 18;
      const horse = makeHorse({ developmentArc: arc });
      renderWithStore(<FoalDevelopmentPanel horse={horse} />, {
        horses: h2r([horse]),
        day: 24,
      } as any);
      expect(screen.getByText(/Early Workouts awaiting your decision/i)).toBeTruthy();
    });

    it("non-zero birthDay: countdown uses absolute trigger day, not offset", () => {
      const horse = makeHorse({ developmentArc: createDefaultFoalDevelopmentArc(100) });
      // breaking_in triggers at day 118. On day 116 -> in 2d.
      renderWithStore(<FoalDevelopmentPanel horse={horse} />, {
        horses: h2r([horse]),
        day: 116,
      } as any);
      expect(screen.getByText(/Day 118 \(in 2d\)/)).toBeTruthy();
    });
  });

  it("falls back to resolvedChoiceKey string when the choice no longer exists", () => {
    const arc = createDefaultFoalDevelopmentArc(0);
    arc.milestones[0].status = "resolved";
    arc.milestones[0].resolvedChoiceKey = "nonexistent_key";
    arc.milestones[0].resolvedOnDay = 18;
    arc.milestones[1].status = "resolved";
    arc.milestones[1].resolvedChoiceKey = "sprint_focus";
    arc.milestones[1].resolvedOnDay = 24;
    const horse = makeHorse({ developmentArc: arc });

    renderWithStore(<FoalDevelopmentPanel horse={horse} />, {
      horses: h2r([horse]),
      day: 30,
    } as any);
    // Falls back to the raw key string since the choice isn't found.
    expect(screen.getByText("nonexistent_key")).toBeTruthy();
    expect(screen.getByText("Sprint Focus")).toBeTruthy();
  });
});
