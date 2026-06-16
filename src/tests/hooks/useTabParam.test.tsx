import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const navigate = vi.fn();
let searchState: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useSearch: () => searchState,
}));

import { useTabParam } from "@/hooks/ui/useTabParam";

describe("useTabParam", () => {
  it("returns the fallback when no tab param is set", () => {
    searchState = {};
    const { result } = renderHook(() => useTabParam("shed", ["shed", "broodmares"]));
    expect(result.current.tab).toBe("shed");
  });

  it("returns the current tab from search", () => {
    searchState = { tab: "broodmares" };
    const { result } = renderHook(() => useTabParam("shed", ["shed", "broodmares"]));
    expect(result.current.tab).toBe("broodmares");
  });

  it("falls back when the search tab is not a valid value", () => {
    searchState = { tab: "bogus" };
    const { result } = renderHook(() => useTabParam("shed", ["shed", "broodmares"]));
    expect(result.current.tab).toBe("shed");
  });

  it("navigates with the new tab on setTab", () => {
    searchState = { tab: "shed" };
    navigate.mockClear();
    const { result } = renderHook(() => useTabParam("shed", ["shed", "broodmares"]));
    act(() => result.current.setTab("broodmares"));
    expect(navigate).toHaveBeenCalledTimes(1);
    const arg = navigate.mock.calls[0][0];
    expect(arg.search).toEqual({ tab: "broodmares" });
  });
});
