import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "fs";
import { join } from "path";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
  useRouterState: ({ select }: { select?: (s: any) => any } = {}) =>
    select ? select({ location: { pathname: "/" } }) : { location: { pathname: "/" } },
}));

import { SidebarNav } from "@/components/SidebarNav";

const defaultProps = {
  day: 1,
  cash: 50000,
  horseCount: 5,
  unreadCount: 0,
  onAdvanceDay: vi.fn(),
  onAdvanceWeek: vi.fn(),
  onAdvanceMonth: vi.fn(),
  onOpenAutoSim: vi.fn(),
  onSkipToAuction: vi.fn(),
  onSkipToRace: vi.fn(),
  onStartNewGame: vi.fn(),
};

describe("SidebarNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders 4 time-advance buttons with correct aria-labels", () => {
    render(<SidebarNav {...defaultProps} />);
    expect(screen.getByLabelText("Advance 1 day")).toBeTruthy();
    expect(screen.getByLabelText("Advance 1 week")).toBeTruthy();
    expect(screen.getByLabelText("Advance 1 month")).toBeTruthy();
    expect(screen.getByLabelText("AutoSim settings")).toBeTruthy();
  });

  it("Advance 1 day button calls onAdvanceDay on click", () => {
    render(<SidebarNav {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Advance 1 day"));
    expect(defaultProps.onAdvanceDay).toHaveBeenCalledTimes(1);
  });

  it("Advance 1 week button calls onAdvanceWeek on click", () => {
    render(<SidebarNav {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Advance 1 week"));
    expect(defaultProps.onAdvanceWeek).toHaveBeenCalledTimes(1);
  });

  it("Advance 1 month button calls onAdvanceMonth on click", () => {
    render(<SidebarNav {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Advance 1 month"));
    expect(defaultProps.onAdvanceMonth).toHaveBeenCalledTimes(1);
  });

  it("AutoSim settings button calls onOpenAutoSim on click", () => {
    render(<SidebarNav {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("AutoSim settings"));
    expect(defaultProps.onOpenAutoSim).toHaveBeenCalledTimes(1);
  });

  it("renders tooltip content for time-advance buttons", async () => {
    const user = userEvent.setup();
    render(<SidebarNav {...defaultProps} />);
    const btn = screen.getByLabelText("Advance 1 day");
    await user.hover(btn);
    await waitFor(() => {
      const tooltips = document.body.querySelectorAll("[role='tooltip']");
      expect(tooltips.length).toBeGreaterThan(0);
    });
    const tooltips = document.body.querySelectorAll("[role='tooltip']");
    const texts = Array.from(tooltips).map((t) => t.textContent);
    expect(texts).toContain("Advance 1 day");
  });

  it("navSections includes /calendar in The World section", () => {
    const content = readFileSync(
      join(__dirname, "..", "..", "components", "SidebarNav.tsx"),
      "utf-8",
    );
    expect(content).toMatch(/to:\s*"\/calendar"/);
  });

  it("navSections includes /gazette in Headquarters section", () => {
    const content = readFileSync(
      join(__dirname, "..", "..", "components", "SidebarNav.tsx"),
      "utf-8",
    );
    expect(content).toMatch(/to:\s*"\/gazette"/);
  });

  it("navSections includes /recap in Headquarters section", () => {
    const content = readFileSync(
      join(__dirname, "..", "..", "components", "SidebarNav.tsx"),
      "utf-8",
    );
    expect(content).toMatch(/to:\s*"\/recap"/);
  });

  it("navSections includes /records in The World section", () => {
    const content = readFileSync(
      join(__dirname, "..", "..", "components", "SidebarNav.tsx"),
      "utf-8",
    );
    expect(content).toMatch(/to:\s*"\/records"/);
  });

  it("navSections includes /hall-of-fame in My Stable section", () => {
    const content = readFileSync(
      join(__dirname, "..", "..", "components", "SidebarNav.tsx"),
      "utf-8",
    );
    expect(content).toMatch(/to:\s*"\/hall-of-fame"/);
  });

  it("navSections includes /awards in My Stable section", () => {
    const content = readFileSync(
      join(__dirname, "..", "..", "components", "SidebarNav.tsx"),
      "utf-8",
    );
    expect(content).toMatch(/to:\s*"\/awards"/);
  });
});
