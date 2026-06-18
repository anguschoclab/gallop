import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBookmarks, resetCache, type Bookmark } from "@/hooks/shared/useBookmarks";

const STORAGE_KEY = "gallop.bookmarks.v1";

describe("useBookmarks", () => {
  beforeEach(() => {
    localStorage.clear();
    resetCache();
  });

  it("starts empty when localStorage is empty", () => {
    const { result } = renderHook(() => useBookmarks());
    expect(result.current.bookmarks).toEqual([]);
    expect(result.current.isBookmarked("horse", "h1")).toBe(false);
    expect(result.current.allTags).toEqual([]);
  });

  it("adds a bookmark", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "Thunder", subtitle: "3yo Colt" });
    });
    expect(result.current.bookmarks).toHaveLength(1);
    expect(result.current.bookmarks[0].type).toBe("horse");
    expect(result.current.bookmarks[0].id).toBe("h1");
    expect(result.current.bookmarks[0].label).toBe("Thunder");
    expect(result.current.isBookmarked("horse", "h1")).toBe(true);
  });

  it("does not add duplicate bookmarks", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "Thunder" });
      result.current.add({ type: "horse", id: "h1", label: "Thunder 2" });
    });
    expect(result.current.bookmarks).toHaveLength(1);
    expect(result.current.bookmarks[0].label).toBe("Thunder");
  });

  it("removes a bookmark", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "Thunder" });
      result.current.remove("horse", "h1");
    });
    expect(result.current.bookmarks).toEqual([]);
    expect(result.current.isBookmarked("horse", "h1")).toBe(false);
  });

  it("toggles a bookmark on and off", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.toggle({ type: "jockey", id: "j1", label: "Smith" });
    });
    expect(result.current.isBookmarked("jockey", "j1")).toBe(true);

    act(() => {
      result.current.toggle({ type: "jockey", id: "j1", label: "Smith" });
    });
    expect(result.current.isBookmarked("jockey", "j1")).toBe(false);
  });

  it("clears all bookmarks", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "A" });
      result.current.add({ type: "race", id: "r1", label: "B" });
      result.current.clear();
    });
    expect(result.current.bookmarks).toEqual([]);
  });

  it("deduplicates tags on add", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "A", tags: ["prospect", "prospect"] });
    });
    expect(result.current.bookmarks[0].tags).toEqual(["prospect"]);
  });

  it("normalizes tags (trim and collapse whitespace)", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "A", tags: ["  hot  prospect  "] });
    });
    expect(result.current.bookmarks[0].tags).toEqual(["hot prospect"]);
  });

  it("filters out empty tags", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "A", tags: ["", "   ", "valid"] });
    });
    expect(result.current.bookmarks[0].tags).toEqual(["valid"]);
  });

  it("setTags replaces existing tags", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "A", tags: ["old"] });
      result.current.setTags("horse", "h1", ["new", "new"]);
    });
    expect(result.current.bookmarks[0].tags).toEqual(["new"]);
  });

  it("addTag appends a tag", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "A", tags: ["fast"] });
      result.current.addTag("horse", "h1", "strong");
    });
    expect(result.current.bookmarks[0].tags).toEqual(["fast", "strong"]);
  });

  it("addTag deduplicates case-insensitively", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "A", tags: ["Fast"] });
      result.current.addTag("horse", "h1", "fast");
    });
    expect(result.current.bookmarks[0].tags).toEqual(["Fast"]);
  });

  it("removeTag removes by case-insensitive match", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "A", tags: ["Fast", "Strong"] });
      result.current.removeTag("horse", "h1", "fast");
    });
    expect(result.current.bookmarks[0].tags).toEqual(["Strong"]);
  });

  it("aggregates allTags alphabetically", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "A", tags: ["zulu", "alpha"] });
      result.current.add({ type: "race", id: "r1", label: "B", tags: ["alpha", "beta"] });
    });
    expect(result.current.allTags).toEqual(["alpha", "beta", "zulu"]);
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "Thunder" });
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as Bookmark[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].label).toBe("Thunder");
    expect(typeof parsed[0].addedAt).toBe("number");
  });

  it("reads from localStorage on mount", () => {
    const existing: Bookmark[] = [
      { type: "horse", id: "h1", label: "Legacy", addedAt: Date.now() },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    resetCache();

    const { result } = renderHook(() => useBookmarks());
    expect(result.current.bookmarks).toHaveLength(1);
    expect(result.current.isBookmarked("horse", "h1")).toBe(true);
  });

  it("syncs across multiple hook instances via listeners", () => {
    const { result: a } = renderHook(() => useBookmarks());
    const { result: b } = renderHook(() => useBookmarks());

    act(() => {
      a.current.add({ type: "horse", id: "h1", label: "A" });
    });
    expect(b.current.bookmarks).toHaveLength(1);

    act(() => {
      b.current.remove("horse", "h1");
    });
    expect(a.current.bookmarks).toEqual([]);
  });

  it("syncs across tabs on storage event", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => {
      result.current.add({ type: "horse", id: "h1", label: "A" });
    });

    // Simulate another tab clearing storage
    localStorage.removeItem(STORAGE_KEY);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEY, newValue: null, oldValue: "[]" }),
      );
    });

    expect(result.current.bookmarks).toEqual([]);
  });
});
