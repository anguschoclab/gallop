import { useCallback, useEffect, useState } from "react";

export type BookmarkEntityType = "horse" | "jockey" | "stable" | "race" | "sire";

export interface Bookmark {
  type: BookmarkEntityType;
  id: string;
  label: string;
  subtitle?: string;
  addedAt: number;
}

const STORAGE_KEY = "gallop.bookmarks.v1";

type Listener = (bookmarks: Bookmark[]) => void;
const listeners = new Set<Listener>();
let cache: Bookmark[] | null = null;

function read(): Bookmark[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Bookmark[]) : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(next: Bookmark[]) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l(next));
}

function keyOf(type: BookmarkEntityType, id: string) {
  return `${type}:${id}`;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => read());

  useEffect(() => {
    const listener: Listener = (next) => setBookmarks(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const isBookmarked = useCallback(
    (type: BookmarkEntityType, id: string) =>
      bookmarks.some((b) => keyOf(b.type, b.id) === keyOf(type, id)),
    [bookmarks],
  );

  const add = useCallback((b: Omit<Bookmark, "addedAt">) => {
    const current = read();
    if (current.some((x) => keyOf(x.type, x.id) === keyOf(b.type, b.id))) return;
    write([...current, { ...b, addedAt: Date.now() }]);
  }, []);

  const remove = useCallback((type: BookmarkEntityType, id: string) => {
    write(read().filter((b) => keyOf(b.type, b.id) !== keyOf(type, id)));
  }, []);

  const toggle = useCallback((b: Omit<Bookmark, "addedAt">) => {
    const current = read();
    const exists = current.some((x) => keyOf(x.type, x.id) === keyOf(b.type, b.id));
    if (exists) {
      write(current.filter((x) => keyOf(x.type, x.id) !== keyOf(b.type, b.id)));
    } else {
      write([...current, { ...b, addedAt: Date.now() }]);
    }
  }, []);

  const clear = useCallback(() => write([]), []);

  return { bookmarks, isBookmarked, add, remove, toggle, clear };
}
