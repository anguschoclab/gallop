/**
 * bookmarkFilter.ts - Pure filter + sort logic for the bookmarks page.
 *
 * Extracted from BookmarksPage so the rules are unit-testable without rendering.
 */

import type { Bookmark, BookmarkEntityType } from "@/platform/game/hooks/useBookmarks";

export const BOOKMARK_TYPE_ORDER: Record<BookmarkEntityType, number> = {
  horse: 0,
  sire: 1,
  jockey: 2,
  stable: 3,
  race: 4,
};

export type BookmarkSortKey = "recent" | "oldest" | "name" | "type";

export interface BookmarkFilterInput {
  query: string;
  typeFilter: BookmarkEntityType | "all";
  activeTags: string[];
}

export function filterBookmarks(
  bookmarks: Bookmark[],
  { query, typeFilter, activeTags }: BookmarkFilterInput,
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

export function sortBookmarks(list: Bookmark[], sort: BookmarkSortKey): Bookmark[] {
  return [...list].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.addedAt - b.addedAt;
      case "name":
        return a.label.localeCompare(b.label);
      case "type":
        return (
          (BOOKMARK_TYPE_ORDER[a.type] ?? 0) - (BOOKMARK_TYPE_ORDER[b.type] ?? 0) ||
          b.addedAt - a.addedAt
        );
      case "recent":
      default:
        return b.addedAt - a.addedAt;
    }
  });
}
