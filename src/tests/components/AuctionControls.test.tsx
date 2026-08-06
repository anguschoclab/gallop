import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuctionControls } from "@/components/auction/sub/AuctionControls";

vi.mock("@/core/auction/runner", () => ({
  nextBidAmount: (current: number) => Math.ceil(current * 1.1),
}));

vi.mock("@/components/auction/AuctionStates", () => ({
  AuctionErrorState: () => null,
}));

vi.mock("@/components/auction/sub/BidInputPanel", () => ({
  BidInputPanel: () => <div data-testid="bid-input-panel" />,
}));

vi.mock("@/components/auction/sub/MaxBidPanel", () => ({
  MaxBidPanel: () => <div data-testid="max-bid-panel" />,
}));

const noop = vi.fn();

describe("AuctionControls", () => {
  it("renders bid button with correct amount when player is not leading", () => {
    render(
      <AuctionControls
        currentBid={10000}
        playerIsLeading={false}
        paused={false}
        onTogglePause={noop}
        onBid={noop}
        onPass={noop}
        onSkip={noop}
        playerMaxBid={undefined}
        onSetMaxBid={noop}
      />,
    );
    expect(screen.getByText(/BID/i)).toBeInTheDocument();
    expect(screen.getByText(/\$11,000/i)).toBeInTheDocument();
  });

  it("disables bid button when player is leading", () => {
    render(
      <AuctionControls
        currentBid={10000}
        playerIsLeading={true}
        paused={false}
        onTogglePause={noop}
        onBid={noop}
        onPass={noop}
        onSkip={noop}
        playerMaxBid={undefined}
        onSetMaxBid={noop}
      />,
    );
    const leadingText = screen.getByText("LEADING");
    const button = leadingText.closest("button");
    expect(button).toBeDisabled();
  });

  it("disables bid button when it is player's own consignment", () => {
    render(
      <AuctionControls
        currentBid={10000}
        playerIsLeading={false}
        paused={false}
        onTogglePause={noop}
        onBid={noop}
        onPass={noop}
        onSkip={noop}
        playerMaxBid={undefined}
        onSetMaxBid={noop}
        isPlayerConsignment={true}
      />,
    );
    const bidButton = screen.getByText(/BID/i).closest("button");
    expect(bidButton).toBeDisabled();
  });

  it("shows Pause button when not paused", () => {
    render(
      <AuctionControls
        currentBid={10000}
        playerIsLeading={false}
        paused={false}
        onTogglePause={noop}
        onBid={noop}
        onPass={noop}
        onSkip={noop}
        playerMaxBid={undefined}
        onSetMaxBid={noop}
      />,
    );
    expect(screen.getByText("Pause")).toBeInTheDocument();
  });

  it("shows Resume button when paused", () => {
    render(
      <AuctionControls
        currentBid={10000}
        playerIsLeading={false}
        paused={true}
        onTogglePause={noop}
        onBid={noop}
        onPass={noop}
        onSkip={noop}
        playerMaxBid={undefined}
        onSetMaxBid={noop}
      />,
    );
    expect(screen.getByText("Resume")).toBeInTheDocument();
  });

  it("renders Pass and Skip to Results controls", () => {
    render(
      <AuctionControls
        currentBid={10000}
        playerIsLeading={false}
        paused={false}
        onTogglePause={noop}
        onBid={noop}
        onPass={noop}
        onSkip={noop}
        playerMaxBid={undefined}
        onSetMaxBid={noop}
      />,
    );
    expect(screen.getByText("Pass")).toBeInTheDocument();
    expect(screen.getByText("Skip to Results")).toBeInTheDocument();
  });

  it("hides advanced bidding panels for player consignment", () => {
    render(
      <AuctionControls
        currentBid={10000}
        playerIsLeading={false}
        paused={false}
        onTogglePause={noop}
        onBid={noop}
        onPass={noop}
        onSkip={noop}
        playerMaxBid={undefined}
        onSetMaxBid={noop}
        isPlayerConsignment={true}
      />,
    );
    expect(screen.queryByTestId("bid-input-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("max-bid-panel")).not.toBeInTheDocument();
  });

  it("shows advanced bidding panels when not player consignment", () => {
    render(
      <AuctionControls
        currentBid={10000}
        playerIsLeading={false}
        paused={false}
        onTogglePause={noop}
        onBid={noop}
        onPass={noop}
        onSkip={noop}
        playerMaxBid={undefined}
        onSetMaxBid={noop}
      />,
    );
    expect(screen.getByTestId("bid-input-panel")).toBeInTheDocument();
    expect(screen.getByTestId("max-bid-panel")).toBeInTheDocument();
  });

  it("displays error message when error prop is provided", () => {
    render(
      <AuctionControls
        currentBid={10000}
        playerIsLeading={false}
        paused={false}
        onTogglePause={noop}
        onBid={noop}
        onPass={noop}
        onSkip={noop}
        playerMaxBid={undefined}
        onSetMaxBid={noop}
        error="Insufficient funds"
      />,
    );
    expect(screen.getByText("Insufficient funds")).toBeInTheDocument();
  });
});
