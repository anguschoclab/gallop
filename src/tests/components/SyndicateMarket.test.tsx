import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { SyndicateMarket } from "@/components/market/SyndicateMarket";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("SyndicateMarket", () => {
  it("renders empty state when no syndicates exist", () => {
    renderWithStore(<SyndicateMarket />, {
      syndicates: {},
      horses: {},
      cash: 100000,
    });
    expect(screen.getByText("No syndicates available")).toBeInTheDocument();
  });

  it("renders syndicate cards when syndicates exist", () => {
    const syndicate = {
      id: "syn1",
      stallionId: "h1",
      stallionName: "Thunder Strike",
      totalShares: 10,
      sharePrice: 50000,
      studFee: 25000,
      lifetimeEarnings: 1000000,
      shareHolders: { player: 2, npc1: 3 },
    };
    const horse = { id: "h1", name: "Thunder Strike" };

    renderWithStore(<SyndicateMarket />, {
      syndicates: { h1: syndicate as any },
      horses: { h1: horse as any },
      cash: 100000,
    });
    expect(screen.getByText("Thunder Strike")).toBeInTheDocument();
    expect(screen.getByText("You own 2 shares")).toBeInTheDocument();
  });

  it("disables buy button when cash is less than share price", () => {
    const syndicate = {
      id: "syn1",
      stallionId: "h1",
      stallionName: "Expensive Stallion",
      totalShares: 10,
      sharePrice: 500000,
      studFee: 25000,
      lifetimeEarnings: 1000000,
      shareHolders: { player: 0 },
    };
    const horse = { id: "h1", name: "Expensive Stallion" };

    renderWithStore(<SyndicateMarket />, {
      syndicates: { h1: syndicate as any },
      horses: { h1: horse as any },
      cash: 100000,
    });
    const buyButton = screen.getByText("Buy 1 Share").closest("button");
    expect(buyButton).toBeDisabled();
  });

  it("enables buy button when cash is sufficient", () => {
    const syndicate = {
      id: "syn1",
      stallionId: "h1",
      stallionName: "Affordable Stallion",
      totalShares: 10,
      sharePrice: 50000,
      studFee: 25000,
      lifetimeEarnings: 1000000,
      shareHolders: { player: 0 },
    };
    const horse = { id: "h1", name: "Affordable Stallion" };

    renderWithStore(<SyndicateMarket />, {
      syndicates: { h1: syndicate as any },
      horses: { h1: horse as any },
      cash: 100000,
    });
    const buyButton = screen.getByText("Buy 1 Share").closest("button");
    expect(buyButton).not.toBeDisabled();
  });

  it("shows sell button only when player owns shares", () => {
    const syndicate = {
      id: "syn1",
      stallionId: "h1",
      stallionName: "Shared Stallion",
      totalShares: 10,
      sharePrice: 50000,
      studFee: 25000,
      lifetimeEarnings: 1000000,
      shareHolders: { player: 3 },
    };
    const horse = { id: "h1", name: "Shared Stallion" };

    renderWithStore(<SyndicateMarket />, {
      syndicates: { h1: syndicate as any },
      horses: { h1: horse as any },
      cash: 100000,
    });
    expect(screen.getByText("Sell 1 Share")).toBeInTheDocument();
  });

  it("does not show sell button when player owns no shares", () => {
    const syndicate = {
      id: "syn1",
      stallionId: "h1",
      stallionName: "No Share Stallion",
      totalShares: 10,
      sharePrice: 50000,
      studFee: 25000,
      lifetimeEarnings: 1000000,
      shareHolders: { player: 0 },
    };
    const horse = { id: "h1", name: "No Share Stallion" };

    renderWithStore(<SyndicateMarket />, {
      syndicates: { h1: syndicate as any },
      horses: { h1: horse as any },
      cash: 100000,
    });
    expect(screen.queryByText("Sell 1 Share")).not.toBeInTheDocument();
  });
});
