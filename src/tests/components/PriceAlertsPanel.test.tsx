/**
 * PriceAlertsPanel.test.tsx — Tests for the market price-alerts panel.
 *
 * Covers creating alerts through the form and the inline edit flow that wires
 * the store's updatePriceAlert action.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { useGame } from "@/game/store";
import { PriceAlertsPanel } from "@/components/market/PriceAlertsPanel";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: React.ReactNode }) => createElement("a", {}, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
  createFileRoute: () => (opts: any) => opts,
}));

describe("PriceAlertsPanel", () => {
  beforeEach(() => {
    seedStore({ ...createDefaultGameState(), day: 10 });
  });

  it("creates an alert through the form", () => {
    render(createElement(PriceAlertsPanel));
    fireEvent.click(screen.getByRole("button", { name: /create alert/i }));
    expect(useGame.getState().priceAlerts.length).toBe(1);
    expect(useGame.getState().priceAlerts[0].scope).toEqual({ kind: "market" });
  });

  it("edits an existing alert's threshold inline", () => {
    const id = useGame.getState().addPriceAlert({
      scope: { kind: "market" },
      thresholdPct: 10,
      windowDays: 7,
    });
    render(createElement(PriceAlertsPanel));

    fireEvent.click(screen.getByRole("button", { name: /edit alert for whole market/i }));
    const thresholdInput = screen.getByLabelText(/edit move %/i);
    fireEvent.change(thresholdInput, { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(useGame.getState().priceAlerts.find((a) => a.id === id)?.thresholdPct).toBe(25);
  });

  it("edits the alert window inline", () => {
    const id = useGame.getState().addPriceAlert({
      scope: { kind: "market" },
      thresholdPct: 10,
      windowDays: 7,
    });
    render(createElement(PriceAlertsPanel));

    fireEvent.click(screen.getByRole("button", { name: /edit alert for whole market/i }));
    fireEvent.change(screen.getByLabelText(/edit window/i), { target: { value: "14" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(useGame.getState().priceAlerts.find((a) => a.id === id)?.windowDays).toBe(14);
  });

  it("cancel discards inline edits", () => {
    const id = useGame.getState().addPriceAlert({
      scope: { kind: "market" },
      thresholdPct: 10,
      windowDays: 7,
    });
    render(createElement(PriceAlertsPanel));

    fireEvent.click(screen.getByRole("button", { name: /edit alert for whole market/i }));
    fireEvent.change(screen.getByLabelText(/edit move %/i), { target: { value: "99" } });
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(useGame.getState().priceAlerts.find((a) => a.id === id)?.thresholdPct).toBe(10);
  });
});
