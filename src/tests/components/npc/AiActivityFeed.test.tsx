import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AiActivityFeed } from "@/components/npc/AiActivityFeed";
import type { NewsItem } from "@/services/narrative/newsTypes";

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

describe("AiActivityFeed", () => {
  it("renders feed title", () => {
    render(<AiActivityFeed news={[]} />);
    expect(screen.getAllByText(/ai activity/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders empty state when no news", () => {
    render(<AiActivityFeed news={[]} />);
    expect(screen.getByText(/no recent ai activity/i)).toBeInTheDocument();
  });

  it("renders news items", () => {
    const news = [
      createMockNews({ id: "n1", headline: "Alpha buys yearling" }),
      createMockNews({ id: "n2", headline: "Beta claims horse" }),
    ];
    render(<AiActivityFeed news={news} />);
    expect(screen.getByText("Alpha buys yearling")).toBeInTheDocument();
    expect(screen.getByText("Beta claims horse")).toBeInTheDocument();
  });

  it("renders category badge for each item", () => {
    const news = [createMockNews({ category: "market" })];
    render(<AiActivityFeed news={news} />);
    expect(screen.getByText("market")).toBeInTheDocument();
  });

  it("renders importance indicator", () => {
    const news = [createMockNews({ importance: "high" })];
    render(<AiActivityFeed news={news} />);
    expect(screen.getByTestId("importance-indicator")).toBeInTheDocument();
  });

  it("renders day label", () => {
    const news = [createMockNews({ day: 42 })];
    render(<AiActivityFeed news={news} />);
    expect(screen.getByText(/day 42/i)).toBeInTheDocument();
  });

  it("filters to only NPC-related categories when filterActive", () => {
    const news = [
      createMockNews({ id: "n1", category: "stable", headline: "NPC move" }),
      createMockNews({ id: "n2", category: "racing", headline: "Race result" }),
      createMockNews({ id: "n3", category: "flavor", headline: "Flavor text" }),
    ];
    render(<AiActivityFeed news={news} filterActive />);
    expect(screen.getByText("NPC move")).toBeInTheDocument();
    expect(screen.queryByText("Flavor text")).not.toBeInTheDocument();
  });
});
