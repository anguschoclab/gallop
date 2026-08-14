/**
 * LiveFreshnessBadge.test.tsx
 *
 * Tests for the LiveFreshnessBadge component verifying:
 * - Level transitions at exactly 3s (FRESHNESS_WARNING_THRESHOLD_MS) and 5s (STALE_DATA_THRESHOLD_MS)
 * - Inclusive and exclusive threshold boundary behavior
 * - Color classes, label switches, and pulse animation behavior
 * - Exact "N seconds ago" text rendering and data attributes
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LiveFreshnessBadge } from "@/components/race/LiveFreshnessBadge";

describe("LiveFreshnessBadge — Level transitions at 3s and 5s boundaries", () => {
  const BASE_TIME = 1_700_000_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 'Live' with green badge, pulse animation, and exact '0s ago' on initial mount", () => {
    render(<LiveFreshnessBadge lastUpdatedAt={BASE_TIME} context="Test" />);

    const badge = screen.getByTestId("live-freshness-badge");
    expect(badge).toHaveClass("bg-success/15", "text-success");
    expect(badge).toHaveAttribute("data-seconds-ago", "0");
    expect(badge).toHaveAttribute("aria-label", "Test last updated 0s ago");
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByTestId("live-freshness-seconds")).toHaveTextContent("0s ago");

    // Dot has animate-pulse when fresh
    const dot = badge.querySelector(".animate-pulse");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("bg-success");
  });

  describe("direct timestamp prop boundary rendering at 3s and 5s", () => {
    it("renders 'Live' (fresh) at exactly 3000ms elapsed (inclusive boundary)", () => {
      render(<LiveFreshnessBadge lastUpdatedAt={BASE_TIME - 3000} />);

      const badge = screen.getByTestId("live-freshness-badge");
      expect(badge).toHaveClass("bg-success/15", "text-success");
      expect(screen.getByText("Live")).toBeInTheDocument();
      expect(screen.getByTestId("live-freshness-seconds")).toHaveTextContent("3s ago");
      expect(badge.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("renders 'Slowing' (warning) at 3001ms elapsed (exclusive above 3s)", () => {
      render(<LiveFreshnessBadge lastUpdatedAt={BASE_TIME - 3001} />);

      const badge = screen.getByTestId("live-freshness-badge");
      expect(badge).toHaveClass("bg-warning/15", "text-warning");
      expect(screen.getByText("Slowing")).toBeInTheDocument();
      expect(screen.getByTestId("live-freshness-seconds")).toHaveTextContent("3s ago");
      expect(badge.querySelector(".animate-pulse")).toBeNull();
    });

    it("renders 'Slowing' (warning) at exactly 5000ms elapsed (inclusive boundary)", () => {
      render(<LiveFreshnessBadge lastUpdatedAt={BASE_TIME - 5000} />);

      const badge = screen.getByTestId("live-freshness-badge");
      expect(badge).toHaveClass("bg-warning/15", "text-warning");
      expect(screen.getByText("Slowing")).toBeInTheDocument();
      expect(screen.getByTestId("live-freshness-seconds")).toHaveTextContent("5s ago");
      expect(badge.querySelector(".animate-pulse")).toBeNull();
    });

    it("renders 'Stale data' (stale) at 5001ms elapsed (exclusive above 5s)", () => {
      render(<LiveFreshnessBadge lastUpdatedAt={BASE_TIME - 5001} context="Leaderboard" />);

      const badge = screen.getByTestId("live-freshness-badge");
      expect(badge).toHaveClass("bg-destructive/15", "text-destructive");
      expect(screen.getByText("Stale data")).toBeInTheDocument();
      expect(screen.getByTestId("live-freshness-seconds")).toHaveTextContent("5s ago");
      expect(badge).toHaveAttribute("aria-label", "Leaderboard last updated 5s ago");
      expect(badge.querySelector(".animate-pulse")).toBeNull();
    });
  });

  describe("timer interval progression across 3s and 5s thresholds", () => {
    it("transitions from Live (0s–3s) -> Slowing (4s–5s) -> Stale data (6s+)", () => {
      render(<LiveFreshnessBadge lastUpdatedAt={BASE_TIME} />);

      // Initial mount (0s)
      let badge = screen.getByTestId("live-freshness-badge");
      expect(badge).toHaveClass("bg-success/15");
      expect(screen.getByText("Live")).toBeInTheDocument();

      // At 3s: still Live (inclusive)
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      badge = screen.getByTestId("live-freshness-badge");
      expect(badge).toHaveClass("bg-success/15");
      expect(screen.getByText("Live")).toBeInTheDocument();
      expect(screen.getByTestId("live-freshness-seconds")).toHaveTextContent("3s ago");
      expect(badge.querySelector(".animate-pulse")).toBeInTheDocument();

      // At 4s: transitions to Slowing (warning)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      badge = screen.getByTestId("live-freshness-badge");
      expect(badge).toHaveClass("bg-warning/15");
      expect(screen.getByText("Slowing")).toBeInTheDocument();
      expect(screen.getByTestId("live-freshness-seconds")).toHaveTextContent("4s ago");
      expect(badge.querySelector(".animate-pulse")).toBeNull();

      // At 5s: still Slowing (inclusive)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      badge = screen.getByTestId("live-freshness-badge");
      expect(badge).toHaveClass("bg-warning/15");
      expect(screen.getByText("Slowing")).toBeInTheDocument();
      expect(screen.getByTestId("live-freshness-seconds")).toHaveTextContent("5s ago");

      // At 6s: transitions to Stale data (stale)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      badge = screen.getByTestId("live-freshness-badge");
      expect(badge).toHaveClass("bg-destructive/15");
      expect(screen.getByText("Stale data")).toBeInTheDocument();
      expect(screen.getByTestId("live-freshness-seconds")).toHaveTextContent("6s ago");
    });
  });
});
