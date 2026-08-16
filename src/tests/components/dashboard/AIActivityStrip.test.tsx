import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AIActivityStrip } from "@/components/dashboard/AIActivityStrip";
import type { NewsItem } from "@/services/narrative/newsTypes";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

function createMockNews(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: "n1",
    day: 100,
    category: "stable",
    importance: "high",
    headline: "NPC Stable makes bold move",
    body: "Alpha Stable purchased a top yearling at auction.",
    ...overrides,
  };
}

describe("AIActivityStrip", () => {
  it("renders strip title", () => {
    render(<AIActivityStrip news={[]} />);
    expect(screen.getAllByText(/ai activity/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders empty state when no news", () => {
    render(<AIActivityStrip news={[]} />);
    expect(screen.getByText(/no recent ai activity/i)).toBeInTheDocument();
  });

  it("renders up to 5 news items as compact cards", () => {
    const news = Array.from({ length: 7 }, (_, i) =>
      createMockNews({ id: `n${i}`, headline: `Event ${i}` }),
    );
    render(<AIActivityStrip news={news} />);
    expect(screen.getByText("Event 0")).toBeInTheDocument();
    expect(screen.getByText("Event 4")).toBeInTheDocument();
    expect(screen.queryByText("Event 5")).not.toBeInTheDocument();
  });

  it("renders category badge for each item", () => {
    const news = [createMockNews({ category: "market" })];
    render(<AIActivityStrip news={news} />);
    expect(screen.getByText("market")).toBeInTheDocument();
  });

  it("renders day label", () => {
    const news = [createMockNews({ day: 42 })];
    render(<AIActivityStrip news={news} />);
    expect(screen.getByText(/day 42/i)).toBeInTheDocument();
  });

  it("renders navigation link to gazette", () => {
    render(<AIActivityStrip news={[createMockNews()]} />);
    const link = screen.getByRole("link", { name: /view all/i });
    expect(link).toHaveAttribute("href", "/gazette");
  });

  it("filters to NPC-related categories only", () => {
    const news = [
      createMockNews({ id: "n1", category: "stable", headline: "NPC move" }),
      createMockNews({ id: "n2", category: "flavor", headline: "Flavor text" }),
    ];
    render(<AIActivityStrip news={news} />);
    expect(screen.getByText("NPC move")).toBeInTheDocument();
    expect(screen.queryByText("Flavor text")).not.toBeInTheDocument();
  });

  it("renders importance dot indicator", () => {
    const news = [createMockNews({ importance: "high" })];
    render(<AIActivityStrip news={news} />);
    expect(screen.getByTestId("importance-dot")).toBeInTheDocument();
  });
});
