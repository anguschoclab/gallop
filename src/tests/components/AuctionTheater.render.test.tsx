/**
 * Render characterization for AuctionTheater.
 *
 * Pins the live / finished / not-found view mapping before the sub-component
 * extraction refactor (TheaterRingCard, TheaterSideColumn, useTheaterHotkeys).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { createRouterMock } from "@/test-utils/routerMock";

vi.mock("@tanstack/react-router", () => createRouterMock());

vi.mock("@/domains/auction/application/hooks/useAuctionTheater", () => ({
  useAuctionTheater: vi.fn(),
}));

vi.mock("@/domains/agents/application/npcFacade", async (importOriginal) => {
  const mod =
    await importOriginal<typeof import("@/domains/agents/application/npcFacade")>();
  return { ...mod, getDisplayableStats: () => null };
});

vi.mock("@/domains/auction/ui/sub/AuctionSummary", () => ({
  AuctionSummary: () => <div data-testid="auction-summary" />,
}));

import { renderWithStore, midGameSeed } from "@/test-utils/renderWithStore";
import { AuctionTheater } from "@/domains/auction/ui/AuctionTheater";
import { useAuctionTheater } from "@/domains/auction/application/hooks/useAuctionTheater";

const mockUseAuctionTheater = vi.mocked(useAuctionTheater);

const sale = {
  id: "sale1",
  name: "Grand Prix Sale",
  day: 120,
  kind: "yearling",
  resolved: false,
  lots: [],
};

const lot = {
  id: "lot1",
  horseId: "h1",
  consignorStableId: "s1",
  saleId: "sale1",
  reservePrice: 1000,
  passed: false,
  withdrawn: false,
};

const horse = {
  id: "h1",
  name: "Test Filly",
  age: 1,
  gender: "filly",
  coatColor: "bay",
  markings: [],
  appearance: {},
};

const majorStable = {
  id: "s1",
  name: "Godolphin",
  isMajor: true,
  colors: { primary: "#1133aa", secondary: "#ffffff" },
  personality: "aggressive",
  cash: 0,
  country: "USA",
};

const mkTheater = (overrides: Record<string, unknown> = {}) => ({
  sale,
  lotState: {
    lot,
    horse,
    currentBid: 5000,
    leadingBidder: undefined,
    bidHistory: [],
    chant: "open",
  },
  currentLot: lot,
  currentHorse: horse,
  currentBid: 5000,
  leadingBidder: undefined,
  totalLots: 1,
  lotIndex: 0,
  playerIsLeading: false,
  bidHistory: [],
  chantLines: [],
  activePaddle: null,
  hammerFlash: false,
  done: false,
  committed: false,
  paused: false,
  setPaused: vi.fn(),
  playerMaxBidState: undefined,
  setPlayerMaxBidState: vi.fn(),
  historyOpen: false,
  setHistoryOpen: vi.fn(),
  bannerFlash: false,
  winOverlay: null,
  bidError: null,
  dismissBidError: vi.fn(),
  retryBid: vi.fn(),
  canRetryBid: false,
  dismissedErrors: {
    isDismissed: () => false,
    dismissError: vi.fn(),
    clearDismissed: vi.fn(),
  },
  bidHistoryError: null,
  retryBidHistory: vi.fn(),
  handleBid: vi.fn(),
  handlePass: vi.fn(),
  handleSkip: vi.fn(),
  handleCommit: vi.fn(),
  ...overrides,
});

function renderTheater(theaterOverrides: Record<string, unknown> = {}) {
  mockUseAuctionTheater.mockReturnValue(mkTheater(theaterOverrides) as any);
  return renderWithStore(<AuctionTheater saleId="sale1" />, {
    ...midGameSeed(),
    auctions: [sale],
    horses: {},
    npcStables: [majorStable],
    scoutReports: [],
    day: 120,
    cash: 250_000,
  } as any);
}

beforeEach(() => {
  mockUseAuctionTheater.mockReset();
});

describe("AuctionTheater view mapping", () => {
  it("renders the live auction view", () => {
    renderTheater();
    expect(screen.getByText("Grand Prix Sale")).toBeInTheDocument();
    expect(screen.getByText(/Live Auction Stream/)).toBeInTheDocument();
    expect(screen.getByText("View Bid History (0)")).toBeInTheDocument();
    expect(screen.getByText("Bidders")).toBeInTheDocument();
    expect(screen.getByText("Caller")).toBeInTheDocument();
    expect(screen.getByText("Godolphin")).toBeInTheDocument();
    expect(screen.getByText("1 Major Stables")).toBeInTheDocument();
    expect(screen.getByText("Current Bid")).toBeInTheDocument();
  });

  it("renders the finished pre-commit view and commits on click", () => {
    const handleCommit = vi.fn();
    renderTheater({ done: true, committed: false, handleCommit });
    expect(screen.getByText("Auction Finished")).toBeInTheDocument();
    fireEvent.click(screen.getByText("View Results Summary"));
    expect(handleCommit).toHaveBeenCalledTimes(1);
  });

  it("renders the summary view when done and committed", () => {
    renderTheater({ done: true, committed: true });
    expect(screen.getByTestId("auction-summary")).toBeInTheDocument();
  });

  it("renders the not-found state when the sale is missing", () => {
    renderTheater({ sale: undefined });
    expect(screen.getByText("Sale not found in the registry.")).toBeInTheDocument();
    expect(screen.getByText("Back to Sales")).toBeInTheDocument();
  });
});
