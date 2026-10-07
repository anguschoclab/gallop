/**
 * trackHistory.test.tsx — Course Histories route
 *
 * The `?track=` search param must drive the selected course on every
 * navigation, not just on first mount — same-route navigations that only
 * change the search param must re-select the target course.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import type { TrackLedgerEntry } from "@/core/history/trackLedger";

const useSearchMock = vi.fn((): { track?: string } => ({}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: React.ReactNode }) =>
    createElement("a", props, children),
  useNavigate: () => () => Promise.resolve(),
  useSearch: () => useSearchMock(),
  createFileRoute: () => (opts: any) => ({ ...opts, useSearch: () => useSearchMock() }),
}));

import { Route } from "@/routes/track-history";

const TrackHistoryPage = (Route as any).component;

function mkEntry(overrides: Partial<TrackLedgerEntry>): TrackLedgerEntry {
  return {
    raceId: "r1",
    trackId: "t-a",
    trackName: "Alpha Downs",
    raceName: "Alpha Handicap",
    day: 10,
    year: 1,
    distance: 1600,
    purse: 50_000,
    fieldSize: 10,
    winnerId: "h1",
    winnerName: "Winner",
    winnerIsPlayer: false,
    time: 98.4,
    prestigeDeltas: [],
    ...overrides,
  };
}

const LEDGER: TrackLedgerEntry[] = [
  mkEntry({ raceId: "r1", trackId: "t-a", trackName: "Alpha Downs", raceName: "Alpha Handicap" }),
  mkEntry({
    raceId: "r2",
    trackId: "t-b",
    trackName: "Beta Park",
    raceName: "Beta Sprint",
    day: 12,
  }),
];

describe("TrackHistoryPage", () => {
  beforeEach(() => {
    useSearchMock.mockReturnValue({});
    seedStore({ ...createDefaultGameState(), trackLedger: LEDGER });
  });

  it("selects the course named in the ?track= param", () => {
    useSearchMock.mockReturnValue({ track: "t-b" });
    render(createElement(TrackHistoryPage));
    expect(screen.getByRole("heading", { level: 2, name: "Beta Park" })).toBeInTheDocument();
  });

  it("updates the selection when the ?track= param changes on the same route", () => {
    useSearchMock.mockReturnValue({ track: "t-b" });
    const { rerender } = render(createElement(TrackHistoryPage));
    expect(screen.getByRole("heading", { level: 2, name: "Beta Park" })).toBeInTheDocument();

    // Same-route navigation that only changes the search param.
    useSearchMock.mockReturnValue({ track: "t-a" });
    rerender(createElement(TrackHistoryPage));

    expect(screen.getByRole("heading", { level: 2, name: "Alpha Downs" })).toBeInTheDocument();
  });
});
