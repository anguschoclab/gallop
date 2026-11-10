/**
 * Characterization tests for BiddingPanel.
 *
 * Pins bid-button gating, reserve messaging, buy-now visibility, and feedback
 * rendering ahead of the section-extraction refactor.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BiddingPanel } from "@/domains/auction/ui/BiddingPanel";

const mkLot = (overrides: Partial<any> = {}) => ({
  id: "l1",
  horseId: "h1",
  consignorStableId: "s1",
  saleId: "s1",
  reservePrice: 0,
  passed: false,
  withdrawn: false,
  ...overrides,
});

const defaultProps = () => ({
  currentLot: mkLot(),
  currentPrice: 1000,
  nextBid: 1100,
  cash: 5000,
  isPlayerLeading: false,
  isPlayerConsigned: false,
  horseName: "Test Horse",
  onBid: vi.fn(),
  onSetMaxBid: vi.fn(),
  onBuyNow: vi.fn(() => ({ ok: true })),
  message: "",
});

describe("BiddingPanel", () => {
  it("renders nothing for a passed lot", () => {
    const { container } = render(
      <BiddingPanel {...defaultProps()} currentLot={mkLot({ passed: true })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("fires onBid with nextBid when the enabled bid button is clicked", () => {
    const props = defaultProps();
    render(<BiddingPanel {...props} />);
    const button = screen.getByRole("button", { name: /^Bid \$/ });
    fireEvent.click(button);
    expect(props.onBid).toHaveBeenCalledWith(1100);
  });

  it("disables the bid button when cash is below nextBid", () => {
    render(<BiddingPanel {...defaultProps()} cash={100} />);
    expect(screen.getByRole("button", { name: /^Bid \$/ })).toBeDisabled();
  });

  it("disables the bid button when the player is leading", () => {
    render(<BiddingPanel {...defaultProps()} isPlayerLeading />);
    expect(screen.getByRole("button", { name: /^Bid \$/ })).toBeDisabled();
  });

  it("disables the bid button for player-consigned lots", () => {
    render(<BiddingPanel {...defaultProps()} isPlayerConsigned />);
    expect(screen.getByRole("button", { name: /^Bid \$/ })).toBeDisabled();
  });

  it("shows reserve messaging", () => {
    const { rerender } = render(<BiddingPanel {...defaultProps()} />);
    expect(screen.getByText("No reserve")).toBeInTheDocument();

    rerender(<BiddingPanel {...defaultProps()} currentLot={mkLot({ reservePrice: 2000 })} />);
    expect(screen.getByText("Reserve not met")).toBeInTheDocument();

    rerender(<BiddingPanel {...defaultProps()} currentLot={mkLot({ reservePrice: 500 })} />);
    expect(screen.getByText("Reserve met")).toBeInTheDocument();
  });

  it("shows buy-now control only when a price is set and not player-consigned", () => {
    const { rerender } = render(
      <BiddingPanel
        {...defaultProps()}
        currentLot={mkLot({ buyNowPrice: 9000 })}
        buyNowPrice={9000}
      />,
    );
    expect(screen.getByRole("button", { name: /Buy Now/i })).toBeInTheDocument();

    rerender(
      <BiddingPanel
        {...defaultProps()}
        currentLot={mkLot({ buyNowPrice: 9000 })}
        buyNowPrice={9000}
        isPlayerConsigned
      />,
    );
    expect(screen.queryByRole("button", { name: /Buy Now/i })).not.toBeInTheDocument();
  });

  it("renders the feedback message", () => {
    render(<BiddingPanel {...defaultProps()} message="Bid placed." />);
    expect(screen.getByText("Bid placed.")).toBeInTheDocument();
    expect(screen.getByText("All bids are binding.")).toBeInTheDocument();
  });
});
