/**
 * Bookmarks filter logic tests
 *
 * Verifies tag filtering is case-insensitive and uses AND logic, query matching
 * spans label/id/type/subtitle/tags, and all sort orders — against the real
 * extracted implementation in domains/bookmarks/model/bookmarkFilter.ts.
 */

import { describe, it, expect } from "vitest";
import {
  filterBookmarks,
  sortBookmarks,
} from "@/domains/bookmarks/model/bookmarkFilter";
import type { Bookmark } from "@/platform/game/hooks/useBookmarks";

function mkBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    type: "horse",
    id: "h1",
    label: "Thunder",
    addedAt: Date.now(),
    ...overrides,
  };
}

const filter = (bookmarks: Bookmark[], query = "", type = "all", tags: string[] = []) =>
  filterBookmarks(bookmarks, {
    query,
    typeFilter: type as Parameters<typeof filterBookmarks>[1]["typeFilter"],
    activeTags: tags,
  });

describe("Bookmarks tag filter", () => {
  it("matches tags case-insensitively", () => {
    const bookmarks = [
      mkBookmark({ id: "h1", tags: ["Prospect"] }),
      mkBookmark({ id: "h2", tags: ["unrelated"] }),
    ];
    const filtered = filter(bookmarks, "", "all", ["prospect"]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("h1");
  });

  it("requires all active tags to match (AND logic)", () => {
    const bookmarks = [
      mkBookmark({ id: "h1", tags: ["prospect", "fast"] }),
      mkBookmark({ id: "h2", tags: ["prospect"] }),
      mkBookmark({ id: "h3", tags: ["fast"] }),
    ];
    const filtered = filter(bookmarks, "", "all", ["prospect", "fast"]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("h1");
  });

  it("filters out bookmarks with no tags when tags are active", () => {
    const bookmarks = [
      mkBookmark({ id: "h1", tags: ["prospect"] }),
      mkBookmark({ id: "h2", tags: [] }),
      mkBookmark({ id: "h3" }),
    ];
    const filtered = filter(bookmarks, "", "all", ["prospect"]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("h1");
  });

  it("filters out bookmark with one matching and one non-matching tag", () => {
    const bookmarks = [mkBookmark({ id: "h1", tags: ["prospect", "slow"] })];
    const filtered = filter(bookmarks, "", "all", ["prospect", "fast"]);
    expect(filtered).toHaveLength(0);
  });

  it("returns all bookmarks when no tags are active", () => {
    const bookmarks = [
      mkBookmark({ id: "h1", tags: ["prospect"] }),
      mkBookmark({ id: "h2", tags: [] }),
    ];
    const filtered = filter(bookmarks, "", "all", []);
    expect(filtered).toHaveLength(2);
  });
});

describe("Bookmarks query filter", () => {
  const bookmarks = [
    mkBookmark({ id: "h1", label: "Thunder", type: "horse", subtitle: "Colt · 2yo" }),
    mkBookmark({ id: "j9", label: "Irene", type: "jockey" }),
    mkBookmark({ id: "s2", label: "Godolphin", type: "stable", tags: ["elite"] }),
  ];

  it("matches on label", () => {
    expect(filter(bookmarks, "thund")).toHaveLength(1);
  });

  it("matches on id", () => {
    expect(filter(bookmarks, "j9")).toHaveLength(1);
  });

  it("matches on entity type", () => {
    expect(filter(bookmarks, "stable")).toHaveLength(1);
  });

  it("matches on subtitle", () => {
    expect(filter(bookmarks, "2yo")).toHaveLength(1);
  });

  it("matches on tag contents", () => {
    expect(filter(bookmarks, "elite")).toHaveLength(1);
  });

  it("filters by entity type", () => {
    expect(filter(bookmarks, "", "jockey")).toHaveLength(1);
    expect(filter(bookmarks, "", "jockey")[0].id).toBe("j9");
  });
});

describe("Bookmarks sorting", () => {
  const bookmarks = [
    mkBookmark({ id: "b", label: "Bravo", type: "jockey", addedAt: 20 }),
    mkBookmark({ id: "a", label: "Alpha", type: "horse", addedAt: 10 }),
    mkBookmark({ id: "c", label: "Charlie", type: "sire", addedAt: 30 }),
  ];

  it("recent sorts newest first", () => {
    expect(sortBookmarks(bookmarks, "recent").map((b) => b.id)).toEqual(["c", "b", "a"]);
  });

  it("oldest sorts oldest first", () => {
    expect(sortBookmarks(bookmarks, "oldest").map((b) => b.id)).toEqual(["a", "b", "c"]);
  });

  it("name sorts alphabetically", () => {
    expect(sortBookmarks(bookmarks, "name").map((b) => b.id)).toEqual(["a", "b", "c"]);
  });

  it("type sorts by BOOKMARK_TYPE_ORDER with recent tiebreak", () => {
    expect(sortBookmarks(bookmarks, "type").map((b) => b.id)).toEqual(["a", "c", "b"]);
  });

  it("does not mutate the input array", () => {
    const input = [...bookmarks];
    sortBookmarks(bookmarks, "name");
    expect(bookmarks.map((b) => b.id)).toEqual(input.map((b) => b.id));
  });
});
