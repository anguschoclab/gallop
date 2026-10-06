/**
 * inboxCtaSearch.test.tsx — InboxPage carries CTA search params to navigate
 *
 * Market messages deep-link into /market tabs via `cta.search`; the page must
 * pass that object through to `navigate` for both primary and secondary CTAs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import InboxPage from "@/components/routes/InboxPage";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: ReactNode; to?: string }) =>
    createElement("a", { to }, children),
  useNavigate: () => navigateMock,
  useSearch: () => ({}),
  createFileRoute: () => (opts: any) => opts,
}));

function marketMessage() {
  return {
    id: "msg-mkt-1",
    day: 10,
    title: "Whole market: prices up +12.0%",
    body: "Average traded price moved.",
    category: "market" as const,
    priority: "action" as const,
    cta: { label: "Open the Exchange", route: "/market", search: { tab: "exchange" } },
    secondaryCta: { label: "Manage alerts", route: "/market", search: { tab: "alerts" } },
  };
}

describe("InboxPage — CTA search deep-links", () => {
  beforeEach(() => {
    cleanup();
    navigateMock.mockReset();
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      inbox: [marketMessage()],
    });
  });

  it("primary CTA navigates to /market with tab search param", () => {
    render(createElement(InboxPage));
    fireEvent.click(screen.getByText("Open the Exchange"));
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/market",
      search: { tab: "exchange" },
    });
  });

  it("secondary CTA navigates to /market?tab=alerts", () => {
    render(createElement(InboxPage));
    fireEvent.click(screen.getByText("Manage alerts"));
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/market",
      search: { tab: "alerts" },
    });
  });
});
