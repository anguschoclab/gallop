import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { GallopGazette } from "@/components/dashboard/GallopGazette";
import type { NewsItem, NewsImportance } from "@/services/narrative/newsTypes";

let mockNews: NewsItem[] = [];

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector({ day: 50, news: mockNews }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: ReactNode; to?: string }) =>
    createElement("a", { to }, children),
}));

vi.mock("@/components/narrative/NewsContent", () => ({
  NewsContent: ({ text }: { text: string }) => createElement("span", null, text),
}));

function createMockNews(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: "news-1",
    category: "racing",
    headline: "Test headline",
    body: "Test body",
    importance: "low" as NewsImportance,
    day: 50,
    ...overrides,
  };
}

describe("GallopGazette", () => {
  it("renders empty state when no news", () => {
    mockNews = [];
    render(<GallopGazette />);
    expect(screen.getByText(/no headlines/i)).toBeInTheDocument();
  });

  it("renders top 2 news items", () => {
    mockNews = [
      createMockNews({ id: "1", headline: "First Article" }),
      createMockNews({ id: "2", headline: "Second Article" }),
      createMockNews({ id: "3", headline: "Third Article" }),
    ];
    render(<GallopGazette />);
    expect(screen.getByText("First Article")).toBeInTheDocument();
    expect(screen.getByText("Second Article")).toBeInTheDocument();
    expect(screen.queryByText("Third Article")).not.toBeInTheDocument();
  });

  it("prioritizes high importance news as lead article", () => {
    mockNews = [
      createMockNews({ id: "1", headline: "Low Article", importance: "low" }),
      createMockNews({ id: "2", headline: "Breaking News", importance: "high" }),
      createMockNews({ id: "3", headline: "Other Low", importance: "low" }),
    ];
    render(<GallopGazette />);
    expect(screen.getByText("Breaking News")).toBeInTheDocument();
    expect(screen.queryByText("Other Low")).not.toBeInTheDocument();
  });

  it("prioritizes arc stories over non-arc stories", () => {
    mockNews = [
      createMockNews({ id: "1", headline: "Regular News" }),
      createMockNews({ id: "2", headline: "Arc Story Part 1", arcId: "arc-1" }),
      createMockNews({ id: "3", headline: "Regular News 2" }),
    ];
    render(<GallopGazette />);
    expect(screen.getByText("Arc Story Part 1")).toBeInTheDocument();
    const hasRegular1 = screen.queryByText("Regular News");
    const hasRegular2 = screen.queryByText("Regular News 2");
    expect(hasRegular1 === null || hasRegular2 === null).toBe(true);
  });
});
