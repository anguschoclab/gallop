/**
 * marketTabs.test.tsx — Tests for the Market page tab integration.
 *
 * Verifies that the Alerts and Strategy tabs are present and switch
 * to the correct panel content.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";

const useSearchMock = vi.fn((): Record<string, unknown> => ({}));
// Tab changes route through navigate({ search }); simulate the URL updating
// so radix Tabs re-render with the new value.
const navigateMock = vi.fn((opts?: { search?: Record<string, unknown> }) => {
  if (opts?.search) useSearchMock.mockReturnValue(opts.search);
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: React.ReactNode; to?: string }) =>
    createElement("a", { to }, children),
  useNavigate: () => navigateMock,
  useSearch: () => useSearchMock(),
  createFileRoute: () => (opts: any) => opts,
}));

// Import the component from the route file
import { Route } from "@/routes/market";

// Route is created by createFileRoute (mocked to return opts)
// MarketPage is the component function
const MarketPageComponent = (Route as any)?.component;

describe("Market page tabs", () => {
  beforeEach(() => {
    useSearchMock.mockReturnValue({});
    seedStore({ ...createDefaultGameState() });
  });

  it("renders 'Alerts' tab trigger", () => {
    render(createElement(MarketPageComponent));
    const tabs = screen.getAllByRole("tab");
    const alertsTab = tabs.find((t) => t.textContent?.includes("Alerts"));
    expect(alertsTab).toBeTruthy();
  });

  it("renders 'Strategy' tab trigger", () => {
    render(createElement(MarketPageComponent));
    const tabs = screen.getAllByRole("tab");
    const strategyTab = tabs.find((t) => t.textContent?.includes("Strategy"));
    expect(strategyTab).toBeTruthy();
  });

  it("clicking 'Alerts' tab shows PriceAlertsPanel", async () => {
    const user = userEvent.setup();
    const { rerender } = render(createElement(MarketPageComponent));
    const tabs = screen.getAllByRole("tab");
    const alertsTab = tabs.find((t) => t.textContent?.includes("Alerts"));
    expect(alertsTab).toBeTruthy();
    await user.click(alertsTab!);
    expect(navigateMock).toHaveBeenCalledWith({ search: { tab: "alerts" } });
    // Mocked router doesn't re-render; simulate the URL update round-trip.
    rerender(createElement(MarketPageComponent));
    // PriceAlertsPanel has a "New alert" heading
    expect(screen.getByText(/new alert/i)).toBeTruthy();
  });

  it("clicking 'Strategy' tab shows MarketStrategyPanel", async () => {
    const user = userEvent.setup();
    const { rerender } = render(createElement(MarketPageComponent));
    const tabs = screen.getAllByRole("tab");
    const strategyTab = tabs.find((t) => t.textContent?.includes("Strategy"));
    expect(strategyTab).toBeTruthy();
    await user.click(strategyTab!);
    expect(navigateMock).toHaveBeenCalledWith({ search: { tab: "strategy" } });
    rerender(createElement(MarketPageComponent));
    // MarketStrategyPanel has strategy form labels
    expect(screen.getByText(/target grades/i)).toBeTruthy();
  });

  it("default tab is 'houses'", () => {
    render(createElement(MarketPageComponent));
    // The houses tab content should be visible by default
    // AuctionHouseDesk renders inside the houses tab
    expect(screen.getByText(/auction houses/i)).toBeTruthy();
  });

  it("deep-links ?tab=strategy to the Strategy panel", () => {
    useSearchMock.mockReturnValue({ tab: "strategy" });
    render(createElement(MarketPageComponent));
    // MarketStrategyPanel form labels render without clicking the tab
    expect(screen.getByText(/target grades/i)).toBeTruthy();
  });

  it("deep-links ?tab=alerts to the Alerts panel", () => {
    useSearchMock.mockReturnValue({ tab: "alerts" });
    render(createElement(MarketPageComponent));
    expect(screen.getByText(/new alert/i)).toBeTruthy();
  });

  it("deep-links ?tab=exchange to the Exchange panel", () => {
    useSearchMock.mockReturnValue({ tab: "exchange" });
    render(createElement(MarketPageComponent));
    // TradeTape heading is unique to the Exchange panel
    expect(screen.getByText(/trade tape/i)).toBeTruthy();
    expect(screen.queryByText(/target grades/i)).toBeNull();
  });

  it("falls back to 'houses' on an invalid ?tab value", () => {
    useSearchMock.mockReturnValue({ tab: "zzz-not-a-tab" });
    render(createElement(MarketPageComponent));
    // AuctionHouseDesk renders — same observable default as no tab param
    expect(screen.getByText(/auction houses/i)).toBeTruthy();
    expect(screen.queryByText(/target grades/i)).toBeNull();
  });
});
