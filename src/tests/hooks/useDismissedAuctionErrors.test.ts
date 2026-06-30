import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDismissedAuctionErrors } from "@/hooks/auction/useDismissedAuctionErrors";

beforeEach(() => {
  sessionStorage.clear();
});

describe("useDismissedAuctionErrors", () => {
  it("isDismissed returns false when sessionStorage is empty", () => {
    const { result } = renderHook(() => useDismissedAuctionErrors());
    expect(result.current.isDismissed("sale1", "sale_not_found")).toBe(false);
  });

  it("isDismissed returns true after dismissError is called", () => {
    const { result } = renderHook(() => useDismissedAuctionErrors());
    act(() => result.current.dismissError("sale1", "sale_not_found"));
    expect(result.current.isDismissed("sale1", "sale_not_found")).toBe(true);
  });

  it("dismissError writes to sessionStorage with correct key format", () => {
    const { result } = renderHook(() => useDismissedAuctionErrors());
    act(() => result.current.dismissError("sale1", "data_unavailable"));
    expect(sessionStorage.getItem("gallop:auction:dismissed:sale1:data_unavailable")).toBe("1");
  });

  it("clearDismissed with specific errorType removes only that key", () => {
    const { result } = renderHook(() => useDismissedAuctionErrors());
    act(() => {
      result.current.dismissError("sale1", "sale_not_found");
      result.current.dismissError("sale1", "bid_error");
    });
    act(() => result.current.clearDismissed("sale1", "sale_not_found"));
    expect(result.current.isDismissed("sale1", "sale_not_found")).toBe(false);
    expect(result.current.isDismissed("sale1", "bid_error")).toBe(true);
  });

  it("clearDismissed with no errorType removes all keys for that saleId", () => {
    const { result } = renderHook(() => useDismissedAuctionErrors());
    act(() => {
      result.current.dismissError("sale1", "sale_not_found");
      result.current.dismissError("sale1", "bid_error");
      result.current.dismissError("sale1", "data_unavailable");
    });
    act(() => result.current.clearDismissed("sale1"));
    expect(result.current.isDismissed("sale1", "sale_not_found")).toBe(false);
    expect(result.current.isDismissed("sale1", "bid_error")).toBe(false);
    expect(result.current.isDismissed("sale1", "data_unavailable")).toBe(false);
  });

  it("different saleIds have independent dismissed states", () => {
    const { result } = renderHook(() => useDismissedAuctionErrors());
    act(() => result.current.dismissError("sale1", "sale_not_found"));
    expect(result.current.isDismissed("sale1", "sale_not_found")).toBe(true);
    expect(result.current.isDismissed("sale2", "sale_not_found")).toBe(false);
  });

  it("different errorTypes within same saleId are independent", () => {
    const { result } = renderHook(() => useDismissedAuctionErrors());
    act(() => result.current.dismissError("sale1", "bid_error"));
    expect(result.current.isDismissed("sale1", "bid_error")).toBe(true);
    expect(result.current.isDismissed("sale1", "sale_not_found")).toBe(false);
  });

  it("clearDismissed for one saleId does not affect another", () => {
    const { result } = renderHook(() => useDismissedAuctionErrors());
    act(() => {
      result.current.dismissError("sale1", "sale_not_found");
      result.current.dismissError("sale2", "sale_not_found");
    });
    act(() => result.current.clearDismissed("sale1"));
    expect(result.current.isDismissed("sale1", "sale_not_found")).toBe(false);
    expect(result.current.isDismissed("sale2", "sale_not_found")).toBe(true);
  });
});
