import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BankruptcyHistoryPanel } from "@/components/stable/BankruptcyHistoryPanel";
import type { NewsItem } from "@/services/narrative/newsTypes";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

function mkNews(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: "n1",
    day: 10,
    category: "stable",
    importance: "high",
    headline: "Test Stable declares bankruptcy",
    body: "Owner's Test Stable has ceased operations.",
    entityLinks: [{ type: "stable", id: "s1", name: "Test Stable" }],
    ...overrides,
  };
}

describe("BankruptcyHistoryPanel", () => {
  it("renders null when no bankruptcy news items", () => {
    const { container } = render(<BankruptcyHistoryPanel news={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when news items are not bankruptcy-related", () => {
    const news = [
      mkNews({
        id: "n1",
        headline: "Race results for day 10",
        body: "Thunder won the race.",
        category: "racing",
        importance: "medium",
      }),
    ];
    const { container } = render(<BankruptcyHistoryPanel news={news} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders bankruptcy events from news items", () => {
    const news = [
      mkNews({
        id: "n1",
        headline: "Alpha Stable declares bankruptcy",
        body: "Owner's Alpha Stable has ceased operations. Horses will be sold at a liquidation sale in 3 days.",
      }),
    ];
    render(<BankruptcyHistoryPanel news={news} />);
    expect(screen.getByText("Alpha Stable declares bankruptcy")).toBeInTheDocument();
    expect(screen.getByText(/ceased operations/i)).toBeInTheDocument();
  });

  it("filters for bankruptcy-related news only", () => {
    const news = [
      mkNews({
        id: "n1",
        headline: "Alpha Stable declares bankruptcy",
        body: "Alpha Stable has ceased operations.",
      }),
      mkNews({
        id: "n2",
        headline: "Big Race Day Results",
        body: "Thunder won the big race.",
        category: "racing",
        importance: "medium",
      }),
    ];
    render(<BankruptcyHistoryPanel news={news} />);
    expect(screen.getByText("Alpha Stable declares bankruptcy")).toBeInTheDocument();
    expect(screen.queryByText("Big Race Day Results")).not.toBeInTheDocument();
  });

  it("sorts bankruptcy events by day descending (most recent first)", () => {
    const news = [
      mkNews({ id: "n1", day: 5, headline: "Old Bankruptcy" }),
      mkNews({ id: "n2", day: 20, headline: "Recent Bankruptcy" }),
      mkNews({ id: "n3", day: 10, headline: "Mid Bankruptcy" }),
    ];
    render(<BankruptcyHistoryPanel news={news} />);
    const headings = screen.getAllByText(/Bankruptcy/);
    expect(headings[0].textContent).toBe("Recent Bankruptcy");
    expect(headings[1].textContent).toBe("Mid Bankruptcy");
    expect(headings[2].textContent).toBe("Old Bankruptcy");
  });

  it("limits display to maxItems", () => {
    const news = Array.from({ length: 10 }, (_, i) =>
      mkNews({ id: `n${i}`, day: i + 1, headline: `Bankruptcy ${i}` }),
    );
    render(<BankruptcyHistoryPanel news={news} maxItems={3} />);
    expect(screen.getAllByText(/Bankruptcy \d/)).toHaveLength(3);
  });

  it("shows day badge for each event", () => {
    const news = [mkNews({ id: "n1", day: 42, headline: "Test Bankruptcy" })];
    render(<BankruptcyHistoryPanel news={news} />);
    expect(screen.getByText("Day 42")).toBeInTheDocument();
  });

  it("renders entity link to stable when present", () => {
    const news = [
      mkNews({
        id: "n1",
        headline: "Alpha Stable declares bankruptcy",
        entityLinks: [{ type: "stable", id: "stable-alpha", name: "Alpha Stable" }],
      }),
    ];
    render(<BankruptcyHistoryPanel news={news} />);
    const link = screen.getByText("View Records →");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("to")).toContain("npc-stables");
  });

  it("does not render entity link when no stable link present", () => {
    const news = [
      mkNews({
        id: "n1",
        headline: "Unknown Stable declares bankruptcy",
        entityLinks: undefined,
      }),
    ];
    render(<BankruptcyHistoryPanel news={news} />);
    expect(screen.queryByText("View Records →")).not.toBeInTheDocument();
  });

  it("detects liquidation-related news", () => {
    const news = [
      mkNews({
        id: "n1",
        headline: "Liquidation sale announced",
        body: "The stable's horses will be liquidated.",
      }),
    ];
    render(<BankruptcyHistoryPanel news={news} />);
    expect(screen.getByText("Liquidation sale announced")).toBeInTheDocument();
  });

  it("does not match low-importance stable news", () => {
    const news = [
      mkNews({
        id: "n1",
        headline: "Stable bankruptcy rumor",
        body: "Some rumor about bankruptcy.",
        importance: "low",
      }),
    ];
    const { container } = render(<BankruptcyHistoryPanel news={news} />);
    expect(container.firstChild).toBeNull();
  });

  it("does not match non-stable category news with bankruptcy keyword", () => {
    const news = [
      mkNews({
        id: "n1",
        headline: "Market bankruptcy report",
        body: "A market report about bankruptcy.",
        category: "market",
      }),
    ];
    const { container } = render(<BankruptcyHistoryPanel news={news} />);
    expect(container.firstChild).toBeNull();
  });
});
