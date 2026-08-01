/**
 * Bookmarks filter logic tests
 *
 * Verifies tag filtering is case-insensitive and uses AND logic.
 * Tests the filtering behavior of the BookmarksPage component.
 */

import { describe, it, expect } from "vitest";
import type { Bookmark } from "@/hooks/shared/useBookmarks";

// Extract the filter logic to test it in isolation
// This mirrors the logic in bookmarks.tsx useMemo
function filterBookmarks(
  bookmarks: Bookmark[],
  query: string,
  typeFilter: string,
  activeTags: string[],
): Bookmark[] {
  const q = query.trim().toLowerCase();
  const activeKeys = activeTags.map((t) => t.toLowerCase());
  const activeKeySet = new Set(activeKeys);
  return bookmarks.filter((b) => {
    if (typeFilter !== "all" && b.type !== typeFilter) return false;
    if (q) {
      const inLabel = b.label.toLowerCase().includes(q);
      const inId = b.id.toLowerCase().includes(q);
      const inType = b.type.toLowerCase().includes(q);
      const inSub = (b.subtitle ?? "").toLowerCase().includes(q);
      const inTag = (b.tags ?? []).some((t) => t.toLowerCase().includes(q));
      if (!inLabel && !inId && !inType && !inSub && !inTag) return false;
    }
    if (activeKeySet.size > 0) {
      const bTagSet = new Set((b.tags ?? []).map((t) => t.toLowerCase()));
      const allMatch = activeKeys.every((k) => bTagSet.has(k));
      if (!allMatch) return false;
    }
    return true;
  });
}

function mkBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    type: "horse",
    id: "h1",
    label: "Thunder",
    addedAt: Date.now(),
    ...overrides,
  };
}

describe("Bookmarks tag filter", () => {
  it("matches tags case-insensitively", () => {
    const bookmarks = [
      mkBookmark({ id: "h1", tags: ["Prospect"] }),
      mkBookmark({ id: "h2", tags: ["unrelated"] }),
    ];
    const filtered = filterBookmarks(bookmarks, "", "all", ["prospect"]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("h1");
  });

  it("requires all active tags to match (AND logic)", () => {
    const bookmarks = [
      mkBookmark({ id: "h1", tags: ["prospect", "fast"] }),
      mkBookmark({ id: "h2", tags: ["prospect"] }),
      mkBookmark({ id: "h3", tags: ["fast"] }),
    ];
    const filtered = filterBookmarks(bookmarks, "", "all", ["prospect", "fast"]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("h1");
  });

  it("filters out bookmarks with no tags when tags are active", () => {
    const bookmarks = [
      mkBookmark({ id: "h1", tags: ["prospect"] }),
      mkBookmark({ id: "h2", tags: [] }),
      mkBookmark({ id: "h3" }),
    ];
    const filtered = filterBookmarks(bookmarks, "", "all", ["prospect"]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("h1");
  });

  it("filters out bookmark with one matching and one non-matching tag", () => {
    const bookmarks = [mkBookmark({ id: "h1", tags: ["prospect", "slow"] })];
    const filtered = filterBookmarks(bookmarks, "", "all", ["prospect", "fast"]);
    expect(filtered).toHaveLength(0);
  });

  it("returns all bookmarks when no tags are active", () => {
    const bookmarks = [
      mkBookmark({ id: "h1", tags: ["prospect"] }),
      mkBookmark({ id: "h2", tags: [] }),
    ];
    const filtered = filterBookmarks(bookmarks, "", "all", []);
    expect(filtered).toHaveLength(2);
  });
});
