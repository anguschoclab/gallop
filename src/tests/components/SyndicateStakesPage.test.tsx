import { describe, it, expect, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SyndicateStakesPage } from "@/components/syndicates/SyndicateStakesPage";
import type { PlayerSyndicateStake } from "@/core/breeding/syndicateStakes";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: {
    children?: ReactNode;
    to?: string;
    params?: Record<string, unknown>;
  }) => {
    const { asChild, ...rest } = props as any;
    return createElement(
      "a",
      { ...rest, href: props.to, "data-params": JSON.stringify(props.params ?? {}) },
      children,
    );
  },
}));

const mockStakes: PlayerSyndicateStake[] = [
  {
    id: "syn-1",
    stallionId: "stallion-1",
    stallionName: "Northern Dancer",
    stallionAge: 7,
    shares: 10,
    totalShares: 40,
    equityPct: 25,
    sharePrice: 25_000,
    stakeValue: 250_000,
    studFee: 50_000,
    previousStudFee: 40_000,
    feeGrowth: 10_000,
    lifetimeEarnings: 400_000,
    playerEarningsShare: 100_000,
    lifetimeStakesFoals: 5,
    lifetimeG1Foals: 2,
    averageSatisfaction: 85,
    playerSatisfaction: 90,
    investorCount: 1,
    investorAverageSatisfaction: 85,
    reputationPointsTotal: 14,
    reputationImpactStatus: "positive",
    reputationImpactLabel: "Prestige Boost",
    reputationImpactDescription:
      "Exceptional progeny and 85% partner satisfaction elevates bloodstock prestige",
    recentEvents: [
      {
        id: "evt-1",
        day: 50,
        source: "syndication_stake",
        amount: 14,
        description: "Underwrote 25% of the Northern Dancer syndicate.",
      },
    ],
  },
  {
    id: "syn-2",
    stallionId: "stallion-2",
    stallionName: "Cold Frost",
    stallionAge: 8,
    shares: 4,
    totalShares: 40,
    equityPct: 10,
    sharePrice: 10_000,
    stakeValue: 40_000,
    studFee: 15_000,
    previousStudFee: 20_000,
    feeGrowth: -5_000,
    lifetimeEarnings: 50_000,
    playerEarningsShare: 5_000,
    lifetimeStakesFoals: 0,
    lifetimeG1Foals: 0,
    averageSatisfaction: 35,
    playerSatisfaction: 40,
    investorCount: 0,
    investorAverageSatisfaction: null,
    reputationPointsTotal: -4,
    reputationImpactStatus: "negative",
    reputationImpactLabel: "Reputation Drag",
    reputationImpactDescription:
      "Dissatisfied syndicate partners and fee contraction create reputational drag",
    recentEvents: [],
  },
];

describe("SyndicateStakesPage", () => {
  it("renders empty state callout when no stakes are owned", () => {
    render(<SyndicateStakesPage stakes={[]} />);

    expect(screen.getByText(/no syndicate stakes/i)).toBeInTheDocument();
    expect(screen.getByText(/explore market/i)).toBeInTheDocument();
  });

  it("renders summary stat cards with aggregated metrics", () => {
    render(<SyndicateStakesPage stakes={mockStakes} />);

    expect(screen.getByText(/2 syndicates/i)).toBeInTheDocument();
    expect(screen.getByText("$290,000")).toBeInTheDocument(); // totalStakeValue (250k + 40k)
    expect(screen.getByText("$105,000")).toBeInTheDocument(); // totalDividends (100k + 5k)
    expect(screen.getByText("+10 pts")).toBeInTheDocument(); // netReputation (14 - 4)
  });

  it("renders guide banner explaining reputation mechanics", () => {
    render(<SyndicateStakesPage stakes={mockStakes} />);

    expect(
      screen.getByText(/how syndicate performance shapes your bloodstock reputation/i),
    ).toBeInTheDocument();
  });

  it("renders table rows with stallion name, shares, satisfaction, and reputation impact", () => {
    render(<SyndicateStakesPage stakes={mockStakes} />);

    expect(screen.getByText("Northern Dancer")).toBeInTheDocument();
    expect(screen.getByText("Cold Frost")).toBeInTheDocument();

    expect(screen.getByText("10/40 (25%)")).toBeInTheDocument();
    expect(screen.getAllByText("Prestige Boost").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Reputation Drag").length).toBeGreaterThanOrEqual(1);
  });

  it("filters rows interactively by stallion name query", () => {
    render(<SyndicateStakesPage stakes={mockStakes} />);

    const searchInput = screen.getByPlaceholderText(/filter by stallion/i);
    fireEvent.change(searchInput, { target: { value: "Northern" } });

    expect(screen.getByText("Northern Dancer")).toBeInTheDocument();
    expect(screen.queryByText("Cold Frost")).not.toBeInTheDocument();
  });

  it("filters rows interactively by status pill", () => {
    render(<SyndicateStakesPage stakes={mockStakes} />);

    const dragPill = screen.getByRole("button", { name: /at risk/i });
    fireEvent.click(dragPill);

    expect(screen.queryByText("Northern Dancer")).not.toBeInTheDocument();
    expect(screen.getByText("Cold Frost")).toBeInTheDocument();
  });

  it("expands and collapses historical reputation event log drawer", () => {
    render(<SyndicateStakesPage stakes={mockStakes} />);

    expect(
      screen.queryByText(/historical reputation events · northern dancer/i),
    ).not.toBeInTheDocument();

    const toggleButton = screen.getByRole("button", {
      name: /view reputation events for northern dancer/i,
    });
    fireEvent.click(toggleButton);

    expect(
      screen.getByText(/historical reputation events · northern dancer/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Underwrote 25% of the Northern Dancer syndicate."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("+14 pts").length).toBeGreaterThanOrEqual(2);

    fireEvent.click(toggleButton);
    expect(
      screen.queryByText(/historical reputation events · northern dancer/i),
    ).not.toBeInTheDocument();
  });
});
