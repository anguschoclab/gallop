import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const navigate = vi.fn();
let searchState: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useSearch: () => searchState,
}));

import { useRacePhase } from "@/hooks/race/useRacePhase";

describe("useRacePhase", () => {
  beforeEach(() => {
    navigate.mockClear();
    searchState = {};
  });

  it("defaults to preshow for an unresolved race", () => {
    const { result } = renderHook(() => useRacePhase(false));
    expect(result.current.phase).toBe("preshow");
  });

  it("defaults to review for a resolved race", () => {
    const { result } = renderHook(() => useRacePhase(true));
    expect(result.current.phase).toBe("review");
  });

  it("reads the phase from the URL search params", () => {
    searchState = { phase: "live" };
    const { result } = renderHook(() => useRacePhase(false));
    expect(result.current.phase).toBe("live");
  });

  it("ignores unknown phase values and falls back", () => {
    searchState = { phase: "bogus" };
    const { result } = renderHook(() => useRacePhase(false));
    expect(result.current.phase).toBe("preshow");
  });

  it("transitions preshow → live via setPhase and writes to the URL with replace", () => {
    searchState = {};
    const { result } = renderHook(() => useRacePhase(false));
    act(() => result.current.setPhase("live"));
    expect(navigate).toHaveBeenCalledTimes(1);
    const arg = navigate.mock.calls[0][0];
    expect(arg.replace).toBe(true);
    expect(arg.search({})).toEqual({ phase: "live" });
  });

  it("transitions live → review and preserves other search params", () => {
    searchState = { phase: "live", followTarget: "h1" };
    const { result } = renderHook(() => useRacePhase(false));
    act(() => result.current.setPhase("review"));
    const arg = navigate.mock.calls[0][0];
    expect(arg.search({ phase: "live", followTarget: "h1" })).toEqual({
      phase: "review",
      followTarget: "h1",
    });
  });
});
