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

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: React.ReactNode; to?: string }) =>
    createElement("a", { to }, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
  createFileRoute: () => (opts: any) => opts,
}));

// Import the component from the route file
import { Route } from "@/routes/market";

// Route is created by createFileRoute (mocked to return opts)
// MarketPage is the component function
const MarketPageComponent = (Route as any)?.component;

describe("Market page tabs", () => {
  beforeEach(() => {
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
    render(createElement(MarketPageComponent));
    const tabs = screen.getAllByRole("tab");
    const alertsTab = tabs.find((t) => t.textContent?.includes("Alerts"));
    expect(alertsTab).toBeTruthy();
    await user.click(alertsTab!);
    // PriceAlertsPanel has a "New alert" heading
    expect(screen.getByText(/new alert/i)).toBeTruthy();
  });

  it("clicking 'Strategy' tab shows MarketStrategyPanel", async () => {
    const user = userEvent.setup();
    render(createElement(MarketPageComponent));
    const tabs = screen.getAllByRole("tab");
    const strategyTab = tabs.find((t) => t.textContent?.includes("Strategy"));
    expect(strategyTab).toBeTruthy();
    await user.click(strategyTab!);
    // MarketStrategyPanel has strategy form labels
    expect(screen.getByText(/target grades/i)).toBeTruthy();
  });

  it("default tab is 'houses'", () => {
    render(createElement(MarketPageComponent));
    // The houses tab content should be visible by default
    // AuctionHouseDesk renders inside the houses tab
    expect(screen.getByText(/auction houses/i)).toBeTruthy();
  });
});
