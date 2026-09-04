import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { VetReport } from "@/components/health/VetReport";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { h2r } from "@/tests/helpers/sampleGameState";
import type { ActiveInjury } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

describe("VetReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no horses exist", () => {
    renderWithStore(<VetReport />, { horses: {} });
    expect(screen.getByText(/no horses/i)).toBeInTheDocument();
  });

  it("renders a table row for each horse", () => {
    const h1 = createTestHorse({ id: "h-1", name: "Thunder", healthStatus: "healthy" });
    const h2 = createTestHorse({ id: "h-2", name: "Lightning", healthStatus: "healthy" });
    renderWithStore(<VetReport />, { horses: h2r([h1, h2]) });

    expect(screen.getByText("Thunder")).toBeInTheDocument();
    expect(screen.getByText("Lightning")).toBeInTheDocument();
  });

  it("shows injury details for injured horses", () => {
    const injury: ActiveInjury = {
      type: "Tendon strain",
      severity: "moderate",
      recoveryDays: 45,
      onsetDay: 10,
    };
    const h1 = createTestHorse({
      id: "h-1",
      name: "Thunder",
      healthStatus: "recovering",
      activeInjury: injury,
    });
    renderWithStore(<VetReport />, { horses: h2r([h1]) });

    expect(screen.getByText("Tendon strain")).toBeInTheDocument();
    expect(screen.getByText(/45/)).toBeInTheDocument();
  });

  it("shows fitness and fatigue values", () => {
    const h1 = createTestHorse({
      id: "h-1",
      name: "Thunder",
      healthStatus: "healthy",
      fitness: 75,
      fatigue: 20,
    });
    renderWithStore(<VetReport />, { horses: h2r([h1]) });

    // Fitness and fatigue appear in table cells
    const fitnessElements = screen.getAllByText("75");
    expect(fitnessElements.length).toBeGreaterThanOrEqual(1);
    const fatigueElements = screen.getAllByText("20");
    expect(fatigueElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders summary stats (total, healthy, injured, avg fitness)", () => {
    const injury: ActiveInjury = {
      type: "Strain",
      severity: "minor",
      recoveryDays: 14,
      onsetDay: 10,
    };
    const h1 = createTestHorse({ id: "h-1", name: "A", healthStatus: "healthy", fitness: 80 });
    const h2 = createTestHorse({
      id: "h-2",
      name: "B",
      healthStatus: "recovering",
      activeInjury: injury,
      fitness: 40,
    });
    renderWithStore(<VetReport />, { horses: h2r([h1, h2]) });

    // Total = 2, Healthy = 1
    const totalElements = screen.getAllByText("2");
    expect(totalElements.length).toBeGreaterThanOrEqual(1);
    const healthyElements = screen.getAllByText("1");
    expect(healthyElements.length).toBeGreaterThanOrEqual(1);
  });

  it("sorts by status when status column header clicked", () => {
    const injury: ActiveInjury = {
      type: "Fracture",
      severity: "major",
      recoveryDays: 90,
      onsetDay: 5,
    };
    const hHealthy = createTestHorse({ id: "h-1", name: "Alpha", healthStatus: "healthy" });
    const hInjured = createTestHorse({
      id: "h-2",
      name: "Beta",
      healthStatus: "recovering",
      activeInjury: injury,
    });
    renderWithStore(<VetReport />, { horses: h2r([hHealthy, hInjured]) });

    // Initially Alpha first, Beta second
    const rows = screen.getAllByRole("row");
    // Click status sort
    const statusHeader = screen.getByRole("columnheader", { name: /status/i });
    fireEvent.click(statusHeader);

    // After sort, injured (Beta) should come first
    const sortedRows = screen.getAllByRole("row");
    // The first data row (after header) should contain Beta
    expect(sortedRows[1].textContent).toContain("Beta");
  });
});
