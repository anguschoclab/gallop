import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const navigate = vi.fn();
let searchState: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useSearch: () => searchState,
}));

import { useRegionalComparisonParams } from "@/hooks/analytics/useRegionalComparisonParams";

describe("useRegionalComparisonParams", () => {
  beforeEach(() => {
    navigate.mockClear();
    searchState = {};
  });

  it("returns default values when no URL params present", () => {
    const { result } = renderHook(() => useRegionalComparisonParams());
    expect(result.current.region).toBeNull();
    expect(result.current.weeksA).toBe(12);
    expect(result.current.weeksB).toBe(4);
    expect(result.current.metric).toBe("raw");
    expect(result.current.compare).toBe(false);
    expect(result.current.surface).toEqual(["Turf", "Dirt", "Synthetic"]);
    expect(result.current.distPreset).toBe("all");
  });

  it("reads region from URL", () => {
    searchState = { region: "usa" };
    const { result } = renderHook(() => useRegionalComparisonParams());
    expect(result.current.region).toBe("usa");
  });

  it("reads surface comma-separated string and parses to string array", () => {
    searchState = { surface: "Turf,Dirt" };
    const { result } = renderHook(() => useRegionalComparisonParams());
    expect(result.current.surface).toEqual(["Turf", "Dirt"]);
  });

  it("reads distMin and distMax as numbers", () => {
    searchState = { distMin: 1400, distMax: 2000 };
    const { result } = renderHook(() => useRegionalComparisonParams());
    expect(result.current.distMin).toBe(1400);
    expect(result.current.distMax).toBe(2000);
  });

  it("reads distPreset enum value", () => {
    searchState = { distPreset: "sprint" };
    const { result } = renderHook(() => useRegionalComparisonParams());
    expect(result.current.distPreset).toBe("sprint");
  });

  it("reads metric and compare from URL", () => {
    searchState = { metric: "rate", compare: true };
    const { result } = renderHook(() => useRegionalComparisonParams());
    expect(result.current.metric).toBe("rate");
    expect(result.current.compare).toBe(true);
  });

  it("setRegion calls navigate with updated search params", () => {
    searchState = {};
    const { result } = renderHook(() => useRegionalComparisonParams());
    act(() => result.current.setRegion("europe"));
    expect(navigate).toHaveBeenCalledTimes(1);
    const arg = navigate.mock.calls[0][0];
    expect(arg.search({})).toMatchObject({ region: "europe" });
  });

  it("setRegion(null) navigates with region undefined", () => {
    searchState = { region: "usa" };
    const { result } = renderHook(() => useRegionalComparisonParams());
    act(() => result.current.setRegion(null));
    const arg = navigate.mock.calls[0][0];
    expect(arg.search({ region: "usa" })).toMatchObject({ region: undefined });
  });

  it("setWeeksA calls navigate with updated search params", () => {
    searchState = {};
    const { result } = renderHook(() => useRegionalComparisonParams());
    act(() => result.current.setWeeksA(8));
    const arg = navigate.mock.calls[0][0];
    expect(arg.search({})).toMatchObject({ weeksA: 8 });
  });

  it("setMetric calls navigate with updated search params", () => {
    searchState = {};
    const { result } = renderHook(() => useRegionalComparisonParams());
    act(() => result.current.setMetric("rate"));
    const arg = navigate.mock.calls[0][0];
    expect(arg.search({})).toMatchObject({ metric: "rate" });
  });

  it("setSurface joins array to comma-separated string and navigates", () => {
    searchState = {};
    const { result } = renderHook(() => useRegionalComparisonParams());
    act(() => result.current.setSurface(["Turf", "Dirt"]));
    const arg = navigate.mock.calls[0][0];
    expect(arg.search({})).toMatchObject({ surface: "Turf,Dirt" });
  });

  it("setDistPreset('sprint') maps to distMin=0, distMax=1400 and navigates", () => {
    searchState = {};
    const { result } = renderHook(() => useRegionalComparisonParams());
    act(() => result.current.setDistPreset("sprint"));
    const arg = navigate.mock.calls[0][0];
    expect(arg.search({})).toMatchObject({ distPreset: "sprint", distMin: 0, distMax: 1400 });
  });

  it("setDistPreset('all') clears distMin and distMax", () => {
    searchState = { distMin: 1400, distMax: 2000, distPreset: "mile" };
    const { result } = renderHook(() => useRegionalComparisonParams());
    act(() => result.current.setDistPreset("all"));
    const arg = navigate.mock.calls[0][0];
    expect(arg.search({ distMin: 1400, distMax: 2000, distPreset: "mile" })).toMatchObject({
      distPreset: "all",
      distMin: undefined,
      distMax: undefined,
    });
  });

  it("setCompare calls navigate with updated search params", () => {
    searchState = {};
    const { result } = renderHook(() => useRegionalComparisonParams());
    act(() => result.current.setCompare(true));
    const arg = navigate.mock.calls[0][0];
    expect(arg.search({})).toMatchObject({ compare: true });
  });
});
