import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLeaderboardControls } from "@/hooks/leaderboard/useLeaderboardControls";

interface TestItem {
  v: number;
  name: string;
  cat: string;
}

const items: TestItem[] = [
  { v: 3, name: "Charlie", cat: "a" },
  { v: 1, name: "Alice", cat: "a" },
  { v: 2, name: "Bob", cat: "b" },
];

const sortOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

const filterOptions = [
  { value: "all", label: "All" },
  { value: "a", label: "Category A" },
  { value: "b", label: "Category B" },
];

const sortFns = {
  asc: (a: TestItem, b: TestItem) => a.v - b.v,
  desc: (a: TestItem, b: TestItem) => b.v - a.v,
};

const filterFns = {
  all: () => true,
  a: (item: TestItem) => item.cat === "a",
  b: (item: TestItem) => item.cat === "b",
};

const searchFn = (item: TestItem, q: string) => item.name.toLowerCase().includes(q.toLowerCase());

describe("useLeaderboardControls", () => {
  it("sorts ascending by numeric field", () => {
    const { result } = renderHook(() =>
      useLeaderboardControls({ items, sortOptions, sortFns, defaultSort: "asc" }),
    );
    expect(result.current.processed.map((i) => i.v)).toEqual([1, 2, 3]);
  });

  it("sorts descending by numeric field", () => {
    const { result } = renderHook(() =>
      useLeaderboardControls({ items, sortOptions, sortFns, defaultSort: "desc" }),
    );
    expect(result.current.processed.map((i) => i.v)).toEqual([3, 2, 1]);
  });

  it("filters to exclude non-matching items", () => {
    const { result } = renderHook(() =>
      useLeaderboardControls({
        items,
        sortOptions,
        filterOptions,
        sortFns,
        filterFns,
        defaultSort: "asc",
        defaultFilter: "a",
      }),
    );
    expect(result.current.processed.map((i) => i.name)).toEqual(["Alice", "Charlie"]);
  });

  it("searches by string match", () => {
    const { result } = renderHook(() =>
      useLeaderboardControls({
        items,
        sortOptions,
        sortFns,
        searchFn,
        defaultSort: "asc",
      }),
    );
    act(() => result.current.setSearchQuery("ali"));
    expect(result.current.processed.map((i) => i.name)).toEqual(["Alice"]);
  });

  it("applies filter → search → sort pipeline in order", () => {
    const { result } = renderHook(() =>
      useLeaderboardControls({
        items,
        sortOptions,
        filterOptions,
        sortFns,
        filterFns,
        searchFn,
        defaultSort: "desc",
        defaultFilter: "a",
      }),
    );
    act(() => result.current.setSearchQuery("a"));
    // filter "a" → Alice, Charlie
    // search "a" → Alice, Charlie (both contain "a")
    // sort desc → Charlie(3), Alice(1)
    expect(result.current.processed.map((i) => i.name)).toEqual(["Charlie", "Alice"]);
  });

  it("returns empty array for empty items", () => {
    const { result } = renderHook(() =>
      useLeaderboardControls({ items: [], sortOptions, sortFns, defaultSort: "asc" }),
    );
    expect(result.current.processed).toEqual([]);
  });

  it("re-sorts when sortValue changes", () => {
    const { result } = renderHook(() =>
      useLeaderboardControls({ items, sortOptions, sortFns, defaultSort: "asc" }),
    );
    expect(result.current.processed.map((i) => i.v)).toEqual([1, 2, 3]);
    act(() => result.current.setSortValue("desc"));
    expect(result.current.processed.map((i) => i.v)).toEqual([3, 2, 1]);
  });

  it("re-filters when filterValue changes", () => {
    const { result } = renderHook(() =>
      useLeaderboardControls({
        items,
        sortOptions,
        filterOptions,
        sortFns,
        filterFns,
        defaultSort: "asc",
        defaultFilter: "all",
      }),
    );
    expect(result.current.processed.length).toBe(3);
    act(() => result.current.setFilterValue("b"));
    expect(result.current.processed.map((i) => i.name)).toEqual(["Bob"]);
  });

  it("re-filters when searchQuery changes", () => {
    const { result } = renderHook(() =>
      useLeaderboardControls({ items, sortOptions, sortFns, searchFn, defaultSort: "asc" }),
    );
    expect(result.current.processed.length).toBe(3);
    act(() => result.current.setSearchQuery("bob"));
    expect(result.current.processed.map((i) => i.name)).toEqual(["Bob"]);
  });

  it("applies default sort on init", () => {
    const { result } = renderHook(() => useLeaderboardControls({ items, sortOptions, sortFns }));
    expect(result.current.sortValue).toBe("asc");
  });

  it("uses 'all' filter and no filtering when no filterOptions", () => {
    const { result } = renderHook(() =>
      useLeaderboardControls({ items, sortOptions, sortFns, defaultSort: "asc" }),
    );
    expect(result.current.filterValue).toBe("all");
    expect(result.current.processed.length).toBe(3);
  });

  it("ignores searchQuery when no searchFn provided", () => {
    const { result } = renderHook(() =>
      useLeaderboardControls({ items, sortOptions, sortFns, defaultSort: "asc" }),
    );
    act(() => result.current.setSearchQuery("nothing"));
    expect(result.current.processed.length).toBe(3);
  });

  it("returns stable reference for same items and controls", () => {
    const { result, rerender } = renderHook(() =>
      useLeaderboardControls({ items, sortOptions, sortFns, defaultSort: "asc" }),
    );
    const first = result.current.processed;
    rerender();
    expect(result.current.processed).toBe(first);
  });
});
