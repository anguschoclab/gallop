import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuctionErrorState } from "@/components/auction/AuctionStates";

describe("AuctionErrorState", () => {
  it("renders message text correctly", () => {
    render(<AuctionErrorState message="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows retry button when onRetry is provided", () => {
    render(<AuctionErrorState message="Error" onRetry={() => {}} />);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("hides retry button when onRetry is not provided", () => {
    render(<AuctionErrorState message="Error" />);
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });

  it("shows dismiss button when onDismiss is provided", () => {
    render(<AuctionErrorState message="Error" onDismiss={() => {}} />);
    expect(screen.getByLabelText("Dismiss error")).toBeInTheDocument();
  });

  it("hides dismiss button when onDismiss is not provided", () => {
    render(<AuctionErrorState message="Error" />);
    expect(screen.queryByLabelText("Dismiss error")).not.toBeInTheDocument();
  });

  it("clicking retry calls onRetry exactly once", () => {
    const onRetry = vi.fn();
    render(<AuctionErrorState message="Error" onRetry={onRetry} />);
    fireEvent.click(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("clicking dismiss calls onDismiss exactly once", () => {
    const onDismiss = vi.fn();
    render(<AuctionErrorState message="Error" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText("Dismiss error"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("shows custom retryLabel text when provided", () => {
    render(<AuctionErrorState message="Error" onRetry={() => {}} retryLabel="Reload Sale" />);
    expect(screen.getByText("Reload Sale")).toBeInTheDocument();
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });

  it("shows default 'Retry' text when retryLabel is not provided", () => {
    render(<AuctionErrorState message="Error" onRetry={() => {}} />);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("has role='alert' and aria-live='assertive'", () => {
    const { container } = render(<AuctionErrorState message="Error" />);
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });
});
