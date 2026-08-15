import { describe, it, expect } from "vitest";
import { BOOKMARK_TYPE_ORDER } from "@/hooks/shared/useBookmarks";
import type { Bookmark, BookmarkEntityType } from "@/hooks/shared/useBookmarks";

function makeBookmark(type: BookmarkEntityType, addedAt: number): Bookmark {
  return {
    type,
    id: `${type}-${addedAt}`,
    label: `Bookmark ${type} ${addedAt}`,
    addedAt,
  };
}

describe("BOOKMARK_TYPE_ORDER", () => {
  it("ranks horse < sire < jockey < stable < race", () => {
    expect(BOOKMARK_TYPE_ORDER.horse).toBeLessThan(BOOKMARK_TYPE_ORDER.sire);
    expect(BOOKMARK_TYPE_ORDER.sire).toBeLessThan(BOOKMARK_TYPE_ORDER.jockey);
    expect(BOOKMARK_TYPE_ORDER.jockey).toBeLessThan(BOOKMARK_TYPE_ORDER.stable);
    expect(BOOKMARK_TYPE_ORDER.stable).toBeLessThan(BOOKMARK_TYPE_ORDER.race);
  });
});

describe("bookmark type sort", () => {
  it("sorts by type rank order, not alphabetical", () => {
    const bookmarks: Bookmark[] = [
      makeBookmark("race", 100),
      makeBookmark("horse", 200),
      makeBookmark("jockey", 300),
      makeBookmark("sire", 400),
      makeBookmark("stable", 500),
    ];

    const sorted = [...bookmarks].sort(
      (a, b) =>
        (BOOKMARK_TYPE_ORDER[a.type] ?? 0) - (BOOKMARK_TYPE_ORDER[b.type] ?? 0) ||
        b.addedAt - a.addedAt,
    );

    const types = sorted.map((b) => b.type);
    expect(types).toEqual(["horse", "sire", "jockey", "stable", "race"]);
  });

  it("breaks ties by addedAt descending", () => {
    const bookmarks: Bookmark[] = [
      makeBookmark("horse", 100),
      makeBookmark("horse", 200),
      makeBookmark("horse", 50),
    ];

    const sorted = [...bookmarks].sort(
      (a, b) =>
        (BOOKMARK_TYPE_ORDER[a.type] ?? 0) - (BOOKMARK_TYPE_ORDER[b.type] ?? 0) ||
        b.addedAt - a.addedAt,
    );

    expect(sorted.map((b) => b.addedAt)).toEqual([200, 100, 50]);
  });
});
