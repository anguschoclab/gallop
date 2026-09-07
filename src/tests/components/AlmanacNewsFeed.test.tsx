import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { AlmanacNewsFeed } from "@/components/history/AlmanacNewsFeed";
import type { NewsItem } from "@/services/narrative/newsTypes";
import type { TrackRecord, SeasonRecord } from "@/core/history/historyTypes";
import type { Transaction } from "@/core/transactions/transactionTypes";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children?: ReactNode;
    to?: string;
    params?: Record<string, string>;
    className?: string;
  }) => createElement("a", { to, "data-params": JSON.stringify(params), className }, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

describe("AlmanacNewsFeed Component", () => {
  beforeEach(() => {
    seedStore({
      ...createDefaultGameState(),
      day: 50,
      news: [],
      trackRecords: {},
      seasonRecords: [],
      transactions: [],
      log: [],
    });
  });

  it("renders empty state when there are no news or history events", () => {
    render(<AlmanacNewsFeed />);
    expect(screen.getByText(/No news recorded yet/i)).toBeTruthy();
  });

  it("renders real-world calendar dates, day badges, and relative timestamps", () => {
    const news: NewsItem[] = [
      {
        id: "news-1",
        day: 50,
        category: "racing",
        importance: "high",
        headline: "Historic Victory for Pegasus",
        body: "Pegasus crushed the track record.",
      },
    ];

    seedStore({
      ...createDefaultGameState(),
      day: 50,
      news,
    });

    render(<AlmanacNewsFeed />);
    // Day 50 -> Feb 20, 2026 (appears in date header and card)
    expect(screen.getAllByText(/Feb 20, 2026/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Day 050/i)).toBeTruthy();
    expect(screen.getByText(/Today/i)).toBeTruthy();
    expect(screen.getByText("Historic Victory for Pegasus")).toBeTruthy();
  });

  it("renders category badges and timeline nodes for track, transfer, and stable events", () => {
    const news: NewsItem[] = [
      {
        id: "n-track",
        day: 48,
        category: "racing",
        importance: "high",
        headline: "Track Record Broken at Belmont",
        body: "Incredible sprint performance.",
      },
      {
        id: "n-transfer",
        day: 45,
        category: "market",
        importance: "normal" as never,
        headline: "Secretariat Sold for Record Amount",
        body: "Auction hammer dropped at Keeneland.",
      },
      {
        id: "n-stable",
        day: 40,
        category: "stable",
        importance: "normal" as never,
        headline: "Blue Ridge Stable Opens New Training Facility",
        body: "Facility upgraded to world-class level.",
      },
    ];

    seedStore({
      ...createDefaultGameState(),
      day: 50,
      news,
    });

    const { container } = render(<AlmanacNewsFeed />);
    expect(screen.getByText("Track Record Broken at Belmont")).toBeTruthy();
    expect(screen.getByText("Secretariat Sold for Record Amount")).toBeTruthy();
    expect(screen.getByText("Blue Ridge Stable Opens New Training Facility")).toBeTruthy();

    // Verify timeline spine exists
    const spine = container.querySelector(".border-l-2");
    expect(spine).not.toBeNull();
  });

  it("filters events when clicking category toggle pills", () => {
    const news: NewsItem[] = [
      {
        id: "n-track",
        day: 48,
        category: "racing",
        importance: "high",
        headline: "Track Record Broken at Belmont",
        body: "Racing event body.",
      },
      {
        id: "n-transfer",
        day: 45,
        category: "market",
        importance: "normal" as never,
        headline: "Big Horse Auction Sale",
        body: "Transfer event body.",
      },
    ];

    seedStore({
      ...createDefaultGameState(),
      day: 50,
      news,
    });

    render(<AlmanacNewsFeed />);
    expect(screen.getByText("Track Record Broken at Belmont")).toBeTruthy();
    expect(screen.getByText("Big Horse Auction Sale")).toBeTruthy();

    // Click "Track Events" filter pill
    const trackPill = screen.getByRole("button", { name: /Track Events/i });
    fireEvent.click(trackPill);

    expect(screen.getByText("Track Record Broken at Belmont")).toBeTruthy();
    expect(screen.queryByText("Big Horse Auction Sale")).toBeNull();

    // Click "Horse Transfers" filter pill
    const transferPill = screen.getByRole("button", { name: /Horse Transfers/i });
    fireEvent.click(transferPill);

    expect(screen.queryByText("Track Record Broken at Belmont")).toBeNull();
    expect(screen.getByText("Big Horse Auction Sale")).toBeTruthy();
  });

  it("filters events using the keyword search input", () => {
    const news: NewsItem[] = [
      {
        id: "n1",
        day: 40,
        category: "racing",
        importance: "high",
        headline: "Saratoga Cup Winner Announced",
        body: "Details of Saratoga victory.",
      },
      {
        id: "n2",
        day: 35,
        category: "stable",
        importance: "normal" as never,
        headline: "Kentucky Stable Reports Birth of Colt",
        body: "Foal born healthy.",
      },
    ];

    seedStore({
      ...createDefaultGameState(),
      day: 50,
      news,
    });

    render(<AlmanacNewsFeed />);
    const searchInput = screen.getByPlaceholderText(/Filter by horse, track, stable/i);

    fireEvent.change(searchInput, { target: { value: "Saratoga" } });
    expect(screen.getByText("Saratoga Cup Winner Announced")).toBeTruthy();
    expect(screen.queryByText("Kentucky Stable Reports Birth of Colt")).toBeNull();

    // Reset search
    fireEvent.change(searchInput, { target: { value: "Kentucky" } });
    expect(screen.queryByText("Saratoga Cup Winner Announced")).toBeNull();
    expect(screen.getByText("Kentucky Stable Reports Birth of Colt")).toBeTruthy();
  });

  it("renders synthesized events from trackRecords, seasonRecords, and transactions", () => {
    const trackRecords: Record<string, TrackRecord> = {
      rec1: {
        trackId: "t1",
        trackName: "Churchill Downs",
        surface: "Dirt",
        distance: 2000,
        time: 119.4,
        horseId: "h1",
        horseName: "Silver Bullet",
        day: 25,
        year: 2026,
      },
    };

    const seasonRecords: SeasonRecord[] = [
      {
        id: "sr-1",
        year: 2026,
        day: 30,
        raceId: "r1",
        raceName: "Triple Crown Stakes",
        winnerId: "h2",
        winnerName: "Golden Pegasus",
        winnerSilk: "#fff",
        time: 120.1,
        jockeyId: "j1",
        jockeyName: "Alice Walker",
        grade: "G1",
        isPlayerOwned: false,
      },
    ];

    const transactions: Transaction[] = [
      {
        id: "tx-claim",
        day: 20,
        type: "transfer",
        subcategory: "claiming_sale",
        amount: 35000,
        description: "Claimed Thunder by Stable 4",
        balanceAfter: 100000,
        recurring: false,
      },
    ];

    seedStore({
      ...createDefaultGameState(),
      day: 50,
      trackRecords,
      seasonRecords,
      transactions,
    });

    render(<AlmanacNewsFeed />);
    expect(screen.getByText("Silver Bullet")).toBeTruthy();
    expect(screen.getByText(/sets 2000m Dirt record/i)).toBeTruthy();
    expect(screen.getByText("Golden Pegasus")).toBeTruthy();
    expect(screen.getByText("Triple Crown Stakes")).toBeTruthy();
    expect(screen.getByText(/Claiming Transfer/i)).toBeTruthy();
  });
});
