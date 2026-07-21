import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { DebtBanner } from "@/components/dashboard/DebtBanner";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { h2r } from "@/tests/helpers/sampleGameState";
import { SOLVENCY_THRESHOLDS } from "@/core/financial/solvency";
import { horsePrice } from "@/core/horse/pricing";
import { createDefaultUserSettings } from "@/core/settings/settingsTypes";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

describe("DebtBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when cash >= 0", () => {
    const { container } = renderWithStore(<DebtBanner />, { cash: 50_000 });
    expect(container.firstChild).toBeNull();
  });

  it("renders warning banner when cash is negative", () => {
    renderWithStore(<DebtBanner />, { cash: -5_000, day: 1 });
    expect(screen.getByText("Cash reserves depleted")).toBeInTheDocument();
  });

  it("renders forced sale imminent label when approaching threshold", () => {
    renderWithStore(<DebtBanner />, {
      cash: SOLVENCY_THRESHOLDS.forcedSaleCash - 1_000,
      day: 5,
      consecutiveDaysInDebt: SOLVENCY_THRESHOLDS.forcedSaleDays - 2,
      userSettings: createDefaultUserSettings(5),
    });
    expect(screen.getByText("Forced sale imminent")).toBeInTheDocument();
  });

  it("renders creditors moving in label at forced_sale tier", () => {
    renderWithStore(<DebtBanner />, {
      cash: SOLVENCY_THRESHOLDS.forcedSaleCash - 1_000,
      day: 10,
      consecutiveDaysInDebt: SOLVENCY_THRESHOLDS.forcedSaleDays,
    });
    expect(screen.getByText("Creditors are moving in")).toBeInTheDocument();
  });

  it("renders insolvent label at insolvent tier", () => {
    renderWithStore(<DebtBanner />, {
      cash: SOLVENCY_THRESHOLDS.insolventCash - 500,
      day: 20,
    });
    expect(screen.getByText("Insolvent")).toBeInTheDocument();
  });

  it("shows grace badge when below forced threshold in warning tier", () => {
    renderWithStore(<DebtBanner />, {
      cash: SOLVENCY_THRESHOLDS.forcedSaleCash - 1_000,
      day: 3,
      consecutiveDaysInDebt: 2,
    });
    expect(screen.getByText(/grace remaining/i)).toBeInTheDocument();
  });

  it("does not show grace badge when above forced threshold", () => {
    renderWithStore(<DebtBanner />, {
      cash: -5_000,
      day: 1,
      consecutiveDaysInDebt: 1,
    });
    expect(screen.queryByText(/grace remaining/i)).not.toBeInTheDocument();
  });

  it("shows detail panel when expanded", () => {
    renderWithStore(<DebtBanner />, { cash: -5_000, day: 1 });
    const toggle = screen.getByText("Show details");
    fireEvent.click(toggle);
    expect(screen.getByText("Current debt")).toBeInTheDocument();
    expect(screen.getByText("Daily interest")).toBeInTheDocument();
    expect(screen.getByText("Days in phase")).toBeInTheDocument();
    expect(screen.getByText("Next action")).toBeInTheDocument();
  });

  it("shows seizure preview when in debt with owned horses", () => {
    const horse = createTestHorse({ id: "h1", name: "Star Runner", age: 5 });
    renderWithStore(<DebtBanner />, {
      cash: -5_000,
      day: 1,
      horses: h2r([horse]),
    });
    fireEvent.click(screen.getByText("Show details"));
    expect(screen.getByText(/seizure preview/i)).toBeInTheDocument();
    expect(screen.getByText("Star Runner")).toBeInTheDocument();
  });

  it("shows pay-down debt control when in debt", () => {
    renderWithStore(<DebtBanner />, { cash: -30_000, day: 1 });
    fireEvent.click(screen.getByText("Show details"));
    expect(screen.getByText(/pay down debt/i)).toBeInTheDocument();
  });

  it("shows quick-sell horse button when in debt with horses", () => {
    const horse = createTestHorse({ id: "h1", name: "Sell Me", age: 5 });
    renderWithStore(<DebtBanner />, {
      cash: -30_000,
      day: 1,
      horses: h2r([horse]),
    });
    fireEvent.click(screen.getByText("Show details"));
    expect(screen.getByText(/quick sell/i)).toBeInTheDocument();
  });

  it("does not show seizure preview when no owned horses", () => {
    renderWithStore(<DebtBanner />, {
      cash: -5_000,
      day: 1,
      horses: h2r([]),
    });
    fireEvent.click(screen.getByText("Show details"));
    expect(screen.queryByText(/seizure preview/i)).not.toBeInTheDocument();
  });

  it("respects custom imminentWarningDays from settings", () => {
    const settings = createDefaultUserSettings(1);
    settings.gameplay.imminentForcedSaleWarningDays = 3;
    renderWithStore(<DebtBanner />, {
      cash: SOLVENCY_THRESHOLDS.forcedSaleCash - 1_000,
      day: 4,
      consecutiveDaysInDebt: SOLVENCY_THRESHOLDS.forcedSaleDays - 3,
      userSettings: settings,
    });
    expect(screen.getByText("Forced sale imminent")).toBeInTheDocument();
  });

  it("does not show imminent label when days remaining exceed custom threshold", () => {
    const settings = createDefaultUserSettings(1);
    settings.gameplay.imminentForcedSaleWarningDays = 3;
    renderWithStore(<DebtBanner />, {
      cash: SOLVENCY_THRESHOLDS.forcedSaleCash - 1_000,
      day: 3,
      consecutiveDaysInDebt: SOLVENCY_THRESHOLDS.forcedSaleDays - 5,
      userSettings: settings,
    });
    expect(screen.queryByText("Forced sale imminent")).not.toBeInTheDocument();
    expect(screen.getByText("Cash reserves depleted")).toBeInTheDocument();
  });
});
