import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { StewardsLog } from "@/components/stewards/StewardsLog";
import { createStewardsInquiry, resolveInquiry } from "@/core/stewards/stewardTypes";
import type { StewardsInquiry } from "@/core/stewards/stewardTypes";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

describe("StewardsLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no inquiries exist", () => {
    const { container } = renderWithStore(<StewardsLog />, { stewardsInquiries: [] });
    expect(screen.getByText(/no inquiries/i)).toBeInTheDocument();
  });

  it("renders inquiry entries in a timeline", () => {
    const i1 = createStewardsInquiry("race-1", 10, "interference", "h-1", "Stretch interference");
    const i2 = resolveInquiry(
      createStewardsInquiry("race-2", 20, "lane_violation", "h-2", "Lane violation"),
      "disqualification",
    );
    renderWithStore(<StewardsLog />, { stewardsInquiries: [i1, i2] });

    expect(screen.getByText("Stretch interference")).toBeInTheDocument();
    expect(screen.getByText("Lane violation")).toBeInTheDocument();
  });

  it("shows inquiry type and outcome badges", () => {
    const i1 = resolveInquiry(
      createStewardsInquiry("race-1", 10, "interference", "h-1", "Incident"),
      "disqualification",
    );
    renderWithStore(<StewardsLog />, { stewardsInquiries: [i1] });

    expect(screen.getByText("Interference")).toBeInTheDocument();
    // Outcome appears in both the badge and the filter button — use getAllByText
    const dqElements = screen.getAllByText("Disqualification");
    expect(dqElements.length).toBeGreaterThanOrEqual(1);
  });

  it("filters by outcome when filter button clicked", () => {
    const i1 = resolveInquiry(
      createStewardsInquiry("race-1", 10, "interference", "h-1", "No action incident"),
      "no_action",
    );
    const i2 = resolveInquiry(
      createStewardsInquiry("race-2", 20, "interference", "h-2", "DQ incident"),
      "disqualification",
    );
    renderWithStore(<StewardsLog />, { stewardsInquiries: [i1, i2] });

    // Both visible initially
    expect(screen.getByText("No action incident")).toBeInTheDocument();
    expect(screen.getByText("DQ incident")).toBeInTheDocument();

    // Filter to disqualifications only
    const dqFilter = screen.getByRole("button", { name: /disqualification/i });
    fireEvent.click(dqFilter);

    expect(screen.queryByText("No action incident")).not.toBeInTheDocument();
    expect(screen.getByText("DQ incident")).toBeInTheDocument();
  });

  it("shows summary stats", () => {
    const i1 = resolveInquiry(
      createStewardsInquiry("race-1", 10, "interference", "h-1", "Incident 1"),
      "no_action",
    );
    const i2 = createStewardsInquiry("race-2", 20, "interference", "h-2", "Incident 2");
    renderWithStore(<StewardsLog />, { stewardsInquiries: [i1, i2] });

    // Total stat shows 2
    const totalElements = screen.getAllByText("2");
    expect(totalElements.length).toBeGreaterThanOrEqual(1);
  });
});
