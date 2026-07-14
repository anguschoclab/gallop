import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import type { Horse } from "@/game/types";
import type { StudCareer } from "@/core/horse/types";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => navigate,
  useSearch: () => ({}),
}));

import { SireWatchTab } from "@/components/breeding/SireWatchTab";
import { createTestHorse } from "@/tests/helpers";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

function mkStud(overrides: Partial<StudCareer> = {}): StudCareer {
  return {
    atStud: true,
    standingFee: 5000,
    lifetimeStakesFoals: 0,
    lifetimeG1Foals: 0,
    bookSize: 0,
    seasonBookings: 0,
    lifetimeFoals: 0,
    ...overrides,
  };
}

function mkStallion(id: string, overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id,
    name: `Stallion ${id}`,
    age: 8,
    gender: "colt",
    stud: mkStud(),
    ...overrides,
  });
}

describe("SireWatchTab", () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders empty state when no stallions are at stud", () => {
    renderWithStore(<SireWatchTab />, { horses: {} } as any);
    expect(screen.getByText(/no stallions at stud/i)).toBeTruthy();
  });

  it("renders stallion cards when horses have stud.atStud", () => {
    const stallion = mkStallion("s1");
    renderWithStore(<SireWatchTab />, { horses: h2r([stallion]) } as any);
    expect(screen.getByText("Stallion s1")).toBeTruthy();
  });

  it("View Profile button calls navigate with correct route params", () => {
    const stallion = mkStallion("s1");
    renderWithStore(<SireWatchTab />, { horses: h2r([stallion]) } as any);
    const btn = screen.getByText("View Profile");
    fireEvent.click(btn);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][0]).toEqual({
      to: "/sire-watch/$stallionId",
      params: { stallionId: "s1" },
    });
  });

  it("does NOT assign to window.location.href", () => {
    const stallion = mkStallion("s1");
    const originalHref = window.location.href;
    renderWithStore(<SireWatchTab />, { horses: h2r([stallion]) } as any);
    fireEvent.click(screen.getByText("View Profile"));
    expect(window.location.href).toBe(originalHref);
  });
});
