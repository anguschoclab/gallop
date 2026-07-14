/**
 * Tests for ActiveProgramView Set-based filtering optimization (Bolt-1 branch).
 *
 * Validates that eligible and enrolled mares are filtered correctly
 * using the Set-based lookup for enrolledDamIds.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { ActiveProgramView } from "@/components/breeding/ActiveProgramView";
import { createTestHorse, createTestMare, createTestFilly, createTestColt } from "@/tests/helpers";
import type { BreedingProgram } from "@/core/breeding/programs";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

function mkProgram(overrides: Partial<BreedingProgram> = {}): BreedingProgram {
  return {
    id: "prog-1",
    stableId: "player",
    archetypeId: "elite-turf-stayer",
    createdDay: 1,
    generationCount: 1,
    bestHorseId: null,
    geneticDistance: 0.5,
    milestones: [],
    enrolledDamIds: [],
    history: [],
    ...overrides,
  };
}

describe("ActiveProgramView — Set-based mare filtering", () => {
  it("renders without errors with an active breeding program", () => {
    const program = mkProgram();
    renderWithStore(<ActiveProgramView />, {
      activeBreedingProgram: program,
      horses: {},
    } as any);
    expect(screen.getByText("Elite Turf Stayer")).toBeTruthy();
  });

  it("shows eligible mares (owned, mare/filly, age >= 3, not enrolled)", () => {
    const mare1 = createTestMare({ id: "mare-1", name: "Thunder Belle", owned: true });
    renderWithStore(<ActiveProgramView />, {
      activeBreedingProgram: mkProgram({ enrolledDamIds: [] }),
      horses: h2r([mare1]),
    } as any);
    expect(screen.getByText("Thunder Belle")).toBeTruthy();
  });

  it("shows enrolled mares in the Enrolled Mares section", () => {
    const mare2 = createTestMare({ id: "mare-2", name: "Lightning Grace", owned: true });
    renderWithStore(<ActiveProgramView />, {
      activeBreedingProgram: mkProgram({ enrolledDamIds: ["mare-2"] }),
      horses: h2r([mare2]),
    } as any);
    // Enrolled mare should appear (in the enrolled section, not the add section)
    expect(screen.getByText("Lightning Grace")).toBeTruthy();
    // Should show "1 mare enrolled"
    expect(screen.getByText(/1 mare enrolled/)).toBeTruthy();
  });

  it("does not show colts as eligible mares", () => {
    const colt = createTestColt({ id: "colt-1", name: "Should Not Appear", owned: true });
    const mare = createTestMare({ id: "mare-1", name: "Eligible Mare", owned: true });
    renderWithStore(<ActiveProgramView />, {
      activeBreedingProgram: mkProgram({ enrolledDamIds: [] }),
      horses: h2r([colt, mare]),
    } as any);
    // Colt should not appear in the eligible list
    expect(screen.queryByText("Should Not Appear")).toBeNull();
    // Mare should appear
    expect(screen.getByText("Eligible Mare")).toBeTruthy();
  });

  it("does not show unowned horses as eligible", () => {
    const unownedMare = createTestMare({ id: "mare-3", name: "Unowned Mare", owned: false });
    const ownedMare = createTestMare({ id: "mare-1", name: "Owned Mare", owned: true });
    renderWithStore(<ActiveProgramView />, {
      activeBreedingProgram: mkProgram({ enrolledDamIds: [] }),
      horses: h2r([unownedMare, ownedMare]),
    } as any);
    expect(screen.queryByText("Unowned Mare")).toBeNull();
    expect(screen.getByText("Owned Mare")).toBeTruthy();
  });
});
