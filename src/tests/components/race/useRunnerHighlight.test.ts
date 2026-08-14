import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRunnerHighlight } from "@/components/race/useRunnerHighlight";

const runners = [
  { horseId: "h1", owned: true },
  { horseId: "h2", owned: false },
  { horseId: "h3", owned: true },
];

describe("useRunnerHighlight", () => {
  it("initially pins owned runners", () => {
    const { result } = renderHook(() => useRunnerHighlight(runners));
    expect(result.current.pinned.has("h1")).toBe(true);
    expect(result.current.pinned.has("h3")).toBe(true);
  });

  it("does not initially pin non-owned runners", () => {
    const { result } = renderHook(() => useRunnerHighlight(runners));
    expect(result.current.pinned.has("h2")).toBe(false);
  });

  it("togglePin adds a horseId to pinned set", () => {
    const { result } = renderHook(() => useRunnerHighlight(runners));
    act(() => result.current.togglePin("h2"));
    expect(result.current.pinned.has("h2")).toBe(true);
  });

  it("togglePin removes an already-pinned horseId", () => {
    const { result } = renderHook(() => useRunnerHighlight(runners));
    act(() => result.current.togglePin("h1"));
    expect(result.current.pinned.has("h1")).toBe(false);
  });

  it("isHighlighted returns true for pinned runner", () => {
    const { result } = renderHook(() => useRunnerHighlight(runners));
    expect(result.current.isHighlighted("h1")).toBe(true);
  });

  it("isHighlighted returns true for hovered runner", () => {
    const { result } = renderHook(() => useRunnerHighlight(runners));
    act(() => result.current.setHovered("h2"));
    expect(result.current.isHighlighted("h2")).toBe(true);
  });

  it("isHighlighted returns false for untracked runner", () => {
    const { result } = renderHook(() => useRunnerHighlight(runners));
    expect(result.current.isHighlighted("h2")).toBe(false);
  });

  it("anyHighlight is false when no pins and no hover", () => {
    const { result } = renderHook(() => useRunnerHighlight([{ horseId: "h1", owned: false }]));
    expect(result.current.anyHighlight).toBe(false);
  });

  it("anyHighlight is true when pins exist but no hover", () => {
    const { result } = renderHook(() => useRunnerHighlight(runners));
    expect(result.current.anyHighlight).toBe(true);
  });

  it("anyHighlight is true when hover is set but no pins", () => {
    const { result } = renderHook(() => useRunnerHighlight([{ horseId: "h1", owned: false }]));
    act(() => result.current.setHovered("h1"));
    expect(result.current.anyHighlight).toBe(true);
  });

  it("setHovered updates hovered state", () => {
    const { result } = renderHook(() => useRunnerHighlight(runners));
    act(() => result.current.setHovered("h2"));
    expect(result.current.hovered).toBe("h2");
    act(() => result.current.setHovered(null));
    expect(result.current.hovered).toBe(null);
  });
});
