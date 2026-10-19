/**
 * stable.test.tsx
 *
 * Slice audit for /stable: shared EmptyState with a single "Browse auction"
 * CTA when the stable has no horses; filter-empty variant; ledger table
 * conventions (scoped headers, tabular figures, right-aligned numerics).
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
}));

import { StableRosterView } from "@/domains/stable/ui/StableRosterView";

const navigate = vi.fn();
const emptyCounts = { active: 0, retired: 0, auctioned: 0, all: 0 };
const someCounts = { active: 2, retired: 1, auctioned: 0, all: 3 };

describe("Stable roster empty states", () => {
  afterEach(cleanup);

  it("shows EmptyState with a single 'Browse auction' CTA when the stable is empty", () => {
    render(
      createElement(StableRosterView, {
        horses: [],
        status: "active",
        view: "ledger",
        counts: emptyCounts,
        playerAwards: [],
        navigate,
      }),
    );
    expect(screen.getByText("Stable is Empty")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: "Browse auction" });
    expect(cta).toHaveAttribute("href", "/auction");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shows a filter-empty variant when the roster has horses but filters match none", () => {
    render(
      createElement(StableRosterView, {
        horses: [],
        status: "retired",
        view: "ledger",
        counts: someCounts,
        playerAwards: [],
        navigate,
      }),
    );
    expect(screen.getByText("No Records Located")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("Stable roster table conventions", () => {
  const src = readFileSync(
    join(__dirname, "..", "..", "domains", "stable", "ui", "StableRosterLedger.tsx"),
    "utf-8",
  );

  it("numeric columns use tabular figures", () => {
    expect(src).toMatch(/tabular-nums/);
  });

  it("all column headers carry scope=col", () => {
    const ths = src.match(/<th[\s>][^>]*>/g) ?? [];
    expect(ths.length).toBeGreaterThan(0);
    for (const th of ths) expect(th).toContain('scope="col"');
  });
});
