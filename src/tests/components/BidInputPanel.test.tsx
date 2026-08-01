import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRef } from "react";
import { act, render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BidInputPanel, type BidInputPanelHandle } from "@/components/auction/sub/BidInputPanel";

describe("BidInputPanel", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("exposes focusAndScroll via ref", () => {
    const ref = createRef<BidInputPanelHandle>();
    render(<BidInputPanel ref={ref} currentBid={1000} nextMin={1300} onBid={vi.fn()} />);
    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.focusAndScroll).toBe("function");
  });

  it("focusAndScroll focuses the input element", () => {
    const ref = createRef<BidInputPanelHandle>();
    render(<BidInputPanel ref={ref} currentBid={1000} nextMin={1300} onBid={vi.fn()} />);
    ref.current!.focusAndScroll();
    const input = screen.getByRole("spinbutton");
    expect(document.activeElement).toBe(input);
  });

  it("focusAndScroll pre-fills the input with the given value", () => {
    const ref = createRef<BidInputPanelHandle>();
    render(<BidInputPanel ref={ref} currentBid={1000} nextMin={1300} onBid={vi.fn()} />);
    act(() => {
      ref.current!.focusAndScroll(5000);
    });
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.value).toBe("5000");
  });

  it("focusAndScroll scrolls the container into view", () => {
    const ref = createRef<BidInputPanelHandle>();
    render(<BidInputPanel ref={ref} currentBid={1000} nextMin={1300} onBid={vi.fn()} />);
    ref.current!.focusAndScroll();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("custom bid submission still works after ref change", () => {
    const onBid = vi.fn();
    render(<BidInputPanel currentBid={1000} nextMin={1300} onBid={onBid} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "2000" } });
    fireEvent.click(screen.getByText("GO"));
    expect(onBid).toHaveBeenCalledWith(2000);
  });

  it("rejects bid <= currentBid", () => {
    const onBid = vi.fn();
    render(<BidInputPanel currentBid={1000} nextMin={1300} onBid={onBid} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "500" } });
    fireEvent.click(screen.getByText("GO"));
    expect(onBid).not.toHaveBeenCalled();
  });
});
