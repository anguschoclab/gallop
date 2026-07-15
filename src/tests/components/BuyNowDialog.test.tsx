import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BuyNowDialog } from "@/components/auction/BuyNowDialog";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from "sonner";

describe("BuyNowDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders disabled button when disabled prop is true", () => {
    render(
      <BuyNowDialog
        horseName="Thunder"
        buyNowPrice={50000}
        cash={10000}
        onBuyNow={vi.fn()}
        disabled
      />,
    );
    const btn = screen.getByRole("button", { name: /Buy Now/i });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("shows insufficient funds message when disabled", () => {
    render(
      <BuyNowDialog
        horseName="Thunder"
        buyNowPrice={50000}
        cash={10000}
        onBuyNow={vi.fn()}
        disabled
      />,
    );
    expect(screen.getByText(/Insufficient funds/i)).toBeTruthy();
    expect(screen.getByText(/\$40,000 more/i)).toBeTruthy();
  });

  it("does not render AlertDialog content when disabled", () => {
    render(
      <BuyNowDialog
        horseName="Thunder"
        buyNowPrice={50000}
        cash={10000}
        onBuyNow={vi.fn()}
        disabled
      />,
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("renders trigger button with formatted price when enabled", () => {
    render(
      <BuyNowDialog horseName="Thunder" buyNowPrice={50000} cash={100000} onBuyNow={vi.fn()} />,
    );
    const btn = screen.getByRole("button", { name: /Buy Now/i });
    expect(btn.textContent).toContain("$50,000");
  });

  it("opens dialog on click when enabled", async () => {
    render(
      <BuyNowDialog horseName="Thunder" buyNowPrice={50000} cash={100000} onBuyNow={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Buy Now/i }));
    expect(screen.getByText(/Buy Thunder now for/i)).toBeTruthy();
  });

  it("shows correct description with amount and horse name", async () => {
    render(
      <BuyNowDialog horseName="Thunder" buyNowPrice={50000} cash={100000} onBuyNow={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Buy Now/i }));
    expect(screen.getAllByText(/\$50,000/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Thunder/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/transfer to your stable/i)).toBeTruthy();
  });

  it("shows success toast on successful buy", async () => {
    const onBuyNow = vi.fn(() => ({ ok: true }));
    render(
      <BuyNowDialog horseName="Thunder" buyNowPrice={50000} cash={100000} onBuyNow={onBuyNow} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Buy Now/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Buy Now$/i }));
    expect(toast.success).toHaveBeenCalledWith("Thunder joins your stable.");
  });

  it("shows info toast when buy_now_unavailable", async () => {
    const onBuyNow = vi.fn(() => ({ ok: false, reason: "buy_now_unavailable" }));
    render(
      <BuyNowDialog horseName="Thunder" buyNowPrice={50000} cash={100000} onBuyNow={onBuyNow} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Buy Now/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Buy Now$/i }));
    expect(toast.info).toHaveBeenCalledWith("Buy-now removed — bidding is active.");
  });

  it("shows error toast with reason on other failure", async () => {
    const onBuyNow = vi.fn(() => ({ ok: false, reason: "insufficient_funds" }));
    render(
      <BuyNowDialog horseName="Thunder" buyNowPrice={50000} cash={100000} onBuyNow={onBuyNow} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Buy Now/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Buy Now$/i }));
    expect(toast.error).toHaveBeenCalledWith("Buy Now failed: insufficient_funds");
  });

  it("defaults horseName to 'Horse' when null", async () => {
    const onBuyNow = vi.fn(() => ({ ok: true }));
    render(
      <BuyNowDialog
        horseName={null as any}
        buyNowPrice={50000}
        cash={100000}
        onBuyNow={onBuyNow}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Buy Now/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Buy Now$/i }));
    expect(toast.success).toHaveBeenCalledWith("Horse joins your stable.");
  });
});
