import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { GradedHistoryPanel } from "@/components/horse/GradedHistoryPanel";

describe("GradedHistoryPanel", () => {
  it("renders graded entries with G1 grade", () => {
    renderWithStore(
      <GradedHistoryPanel
        history={[{ raceId: "r1", raceName: "Derby", position: 1, day: 10, grade: "G1" }]}
      />,
    );
    expect(screen.getAllByText("G1").length).toBeGreaterThanOrEqual(1);
  });

  it("renders graded entries with G2 and G3 grades", () => {
    renderWithStore(
      <GradedHistoryPanel
        history={[
          { raceId: "r1", raceName: "Oaks", position: 2, day: 10, grade: "G2" },
          { raceId: "r2", raceName: "Stakes", position: 3, day: 20, grade: "G3" },
        ]}
      />,
    );
    expect(screen.getAllByText("G2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("G3").length).toBeGreaterThanOrEqual(1);
  });

  it("handles entries with undefined grade (non-graded)", () => {
    const { container } = renderWithStore(
      <GradedHistoryPanel history={[{ raceId: "r1", raceName: "Maiden", position: 1, day: 5 }]} />,
    );
    expect(container.textContent).toContain("No graded stakes");
  });

  it("handles empty history", () => {
    const { container } = renderWithStore(<GradedHistoryPanel history={[]} />);
    expect(container).toBeTruthy();
  });

  it("filters graded races correctly by grade", () => {
    renderWithStore(
      <GradedHistoryPanel
        history={[
          { raceId: "r1", raceName: "G1 Race", position: 1, day: 10, grade: "G1" },
          { raceId: "r2", raceName: "G2 Race", position: 2, day: 20, grade: "G2" },
          { raceId: "r3", raceName: "Maiden", position: 1, day: 5 },
        ]}
      />,
    );
    expect(screen.getByText("G1 Race")).toBeTruthy();
    expect(screen.getByText("G2 Race")).toBeTruthy();
  });

  it("displays gate for graded entries when present", () => {
    renderWithStore(
      <GradedHistoryPanel
        history={[{ raceId: "r1", raceName: "Derby", position: 1, day: 10, grade: "G1", gate: 5 }]}
      />,
    );
    expect(screen.getByText(/G5/)).toBeTruthy();
  });
});
