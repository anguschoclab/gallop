import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCompareStables, MAX_COMPARE } from "@/hooks/stable/useCompareStables";

describe("useCompareStables", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useCompareStables());
    act(() => result.current.clear());
  });

  it("toggle adds an ID when not present", () => {
    const { result } = renderHook(() => useCompareStables());
    act(() => result.current.toggle("s1"));
    expect(result.current.ids).toEqual(["s1"]);
  });

  it("toggle removes an ID when present", () => {
    const { result } = renderHook(() => useCompareStables());
    act(() => result.current.toggle("s1"));
    act(() => result.current.toggle("s1"));
    expect(result.current.ids).toEqual([]);
  });

  it("add is a no-op when at MAX_COMPARE and ID not already in set", () => {
    const { result } = renderHook(() => useCompareStables());
    act(() => {
      result.current.add("s1");
      result.current.add("s2");
      result.current.add("s3");
      result.current.add("s4");
    });
    expect(result.current.ids).toHaveLength(MAX_COMPARE);
    act(() => result.current.add("s5"));
    expect(result.current.ids).toHaveLength(MAX_COMPARE);
    expect(result.current.ids).not.toContain("s5");
  });

  it("remove removes an ID", () => {
    const { result } = renderHook(() => useCompareStables());
    act(() => {
      result.current.add("s1");
      result.current.add("s2");
    });
    act(() => result.current.remove("s1"));
    expect(result.current.ids).toEqual(["s2"]);
  });

  it("clear empties the set", () => {
    const { result } = renderHook(() => useCompareStables());
    act(() => {
      result.current.add("s1");
      result.current.add("s2");
    });
    act(() => result.current.clear());
    expect(result.current.ids).toEqual([]);
  });

  it("has returns true for present IDs and false for absent", () => {
    const { result } = renderHook(() => useCompareStables());
    act(() => result.current.add("s1"));
    expect(result.current.has("s1")).toBe(true);
    expect(result.current.has("s2")).toBe(false);
  });

  it("MAX_COMPARE is 4", () => {
    expect(MAX_COMPARE).toBe(4);
  });
});
