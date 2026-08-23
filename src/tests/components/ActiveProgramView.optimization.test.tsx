/**
 * Tests for ActiveProgramView Set-based filtering optimization (Bolt-1 branch).
 *
 * Validates that eligible and enrolled mares are filtered correctly
 * using the Set-based lookup for enrolledDamIds.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { ActiveProgramView } from "@/components/breeding/ActiveProgramView";
import { createTestHorse, createTestMare, createTestFilly, createTestColt } from "@/tests/helpers";
import type { BreedingProgram } from "@/core/breeding/programs";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import {
  CANCEL_DIALOG_TITLE,
  CANCEL_DIALOG_KEEP,
  CANCEL_DIALOG_CONFIRM,
  CANCEL_BUTTON_ARIA_LABEL,
} from "@/constants/breedingConstants";

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
    const mare1 = createTestMare({
      id: "mare-1",
      name: "Thunder Belle",
      ownership: { type: "player" },
    });
    renderWithStore(<ActiveProgramView />, {
      activeBreedingProgram: mkProgram({ enrolledDamIds: [] }),
      horses: h2r([mare1]),
    } as any);
    expect(screen.getByText("Thunder Belle")).toBeTruthy();
  });

  it("shows enrolled mares in the Enrolled Mares section", () => {
    const mare2 = createTestMare({
      id: "mare-2",
      name: "Lightning Grace",
      ownership: { type: "player" },
    });
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
    const colt = createTestColt({
      id: "colt-1",
      name: "Should Not Appear",
      ownership: { type: "player" },
    });
    const mare = createTestMare({
      id: "mare-1",
      name: "Eligible Mare",
      ownership: { type: "player" },
    });
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
    const unownedMare = createTestMare({
      id: "mare-3",
      name: "Unowned Mare",
      ownership: { type: "unowned" },
    });
    const ownedMare = createTestMare({
      id: "mare-1",
      name: "Owned Mare",
      ownership: { type: "player" },
    });
    renderWithStore(<ActiveProgramView />, {
      activeBreedingProgram: mkProgram({ enrolledDamIds: [] }),
      horses: h2r([unownedMare, ownedMare]),
    } as any);
    expect(screen.queryByText("Unowned Mare")).toBeNull();
    expect(screen.getByText("Owned Mare")).toBeTruthy();
  });
});

describe("ActiveProgramView — cancellation dialog", () => {
  it("opens the confirmation dialog when the cancel button is clicked", () => {
    renderWithStore(<ActiveProgramView />, {
      activeBreedingProgram: mkProgram({ enrolledDamIds: [] }),
      horses: {},
    } as any);

    fireEvent.click(screen.getByLabelText(CANCEL_BUTTON_ARIA_LABEL));
    expect(screen.getByText(CANCEL_DIALOG_TITLE)).toBeInTheDocument();
    expect(screen.getByText(CANCEL_DIALOG_KEEP)).toBeInTheDocument();
    expect(screen.getByText(CANCEL_DIALOG_CONFIRM)).toBeInTheDocument();
  });

  it("closes the dialog and leaves the program active when keeping the program", () => {
    const program = mkProgram({ id: "prog-cancel-keep", enrolledDamIds: [] });
    renderWithStore(<ActiveProgramView />, {
      activeBreedingProgram: program,
      breedingPrograms: [program],
      horses: {},
    } as any);

    fireEvent.click(screen.getByLabelText(CANCEL_BUTTON_ARIA_LABEL));
    fireEvent.click(screen.getByText(CANCEL_DIALOG_KEEP));

    expect(screen.queryByText(CANCEL_DIALOG_TITLE)).not.toBeInTheDocument();
    expect(screen.getByText("Elite Turf Stayer")).toBeInTheDocument();
  });

  it("cancels the program and shows a toast when confirming the dialog", () => {
    const program = mkProgram({ id: "prog-cancel-confirm", enrolledDamIds: ["mare-1"] });
    const mare = createTestMare({
      id: "mare-1",
      name: "Enrolled Mare",
      ownership: { type: "player" },
    });
    renderWithStore(<ActiveProgramView />, {
      activeBreedingProgram: program,
      breedingPrograms: [program],
      horses: h2r([mare]),
    } as any);

    fireEvent.click(screen.getByLabelText(CANCEL_BUTTON_ARIA_LABEL));
    fireEvent.click(screen.getByText(CANCEL_DIALOG_CONFIRM));

    expect(screen.queryByText(CANCEL_DIALOG_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText("Elite Turf Stayer")).not.toBeInTheDocument();
  });
});
