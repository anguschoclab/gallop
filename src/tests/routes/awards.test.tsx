/**
 * awards.test.tsx
 *
 * Slice audit for /honors (hall of fame, records, awards): standardized
 * headers and shared EmptyState on empty collections.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: { to?: string; children?: ReactNode } & Record<string, unknown>) =>
    createElement("a", { href: to, ...props }, children),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));

import { HallOfFameTab } from "@/domains/honors/ui/HallOfFameTab";
import { AwardsGrid } from "@/domains/awards/ui/AwardsGrid";
import { renderWithStore } from "@/test-utils/renderWithStore";

describe("Honors & awards audit", () => {
  afterEach(cleanup);

  it("Hall of Fame shows a standardized header", () => {
    renderWithStore(createElement(HallOfFameTab), { hallOfFame: [] });
    expect(screen.getByRole("heading", { name: "Hall of Fame" })).toBeInTheDocument();
  });

  it("Hall of Fame empty state uses EmptyState", () => {
    renderWithStore(createElement(HallOfFameTab), { hallOfFame: [] });
    expect(screen.getByText("No inductees yet")).toBeInTheDocument();
  });

  it("AwardsGrid empty state uses EmptyState", () => {
    render(createElement(AwardsGrid, { awards: [] }));
    expect(screen.getByText("No awards yet")).toBeInTheDocument();
  });

  it("honors page keeps a page-level heading", () => {
    const src = readFileSync(join(__dirname, "..", "..", "routes", "honors.tsx"), "utf-8");
    expect(src).toMatch(/<h1[\s>]/);
  });
});
