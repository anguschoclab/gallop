import { useCallback, useEffect, useMemo, useState } from "react";

export type BookmarkEntityType = "horse" | "jockey" | "stable" | "race" | "sire";

export interface Bookmark {
  type: BookmarkEntityType;
  id: string;
  label: string;
  subtitle?: string;
  tags?: string[];
  addedAt: number;
}

const STORAGE_KEY = "gallop.bookmarks.v1";

type Listener = (bookmarks: Bookmark[]) => void;
const listeners = new Set<Listener>();
let cache: Bookmark[] | null = null;

export function resetCache() {
  cache = null;
}

function read(): Bookmark[] {
  if (cache !== null) return cache;
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

function normalizeTag(tag: string) {
  return tag.trim().replace(/\s+/g, " ");
}

function dedupeTags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const n = normalizeTag(t);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => read());

  useEffect(() => {
    const listener: Listener = (next) => setBookmarks(next);
    listeners.add(listener);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      cache = null;
      setBookmarks(read());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
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
    write([...current, { ...b, tags: dedupeTags(b.tags ?? []), addedAt: Date.now() }]);
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
      write([...current, { ...b, tags: dedupeTags(b.tags ?? []), addedAt: Date.now() }]);
    }
  }, []);

  const setTags = useCallback((type: BookmarkEntityType, id: string, tags: string[]) => {
    write(
      read().map((b) =>
        keyOf(b.type, b.id) === keyOf(type, id) ? { ...b, tags: dedupeTags(tags) } : b,
      ),
    );
  }, []);

  const addTag = useCallback((type: BookmarkEntityType, id: string, tag: string) => {
    const norm = normalizeTag(tag);
    if (!norm) return;
    write(
      read().map((b) =>
        keyOf(b.type, b.id) === keyOf(type, id)
          ? { ...b, tags: dedupeTags([...(b.tags ?? []), norm]) }
          : b,
      ),
    );
  }, []);

  const removeTag = useCallback((type: BookmarkEntityType, id: string, tag: string) => {
    const key = tag.toLowerCase();
    write(
      read().map((b) =>
        keyOf(b.type, b.id) === keyOf(type, id)
          ? { ...b, tags: (b.tags ?? []).filter((t) => t.toLowerCase() !== key) }
          : b,
      ),
    );
  }, []);

  const allTags = useMemo(() => {
    const seen = new Map<string, string>();
    for (const b of bookmarks) {
      for (const t of b.tags ?? []) {
        const key = t.toLowerCase();
        if (!seen.has(key)) seen.set(key, t);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [bookmarks]);

  const clear = useCallback(() => write([]), []);

  return {
    bookmarks,
    isBookmarked,
    add,
    remove,
    toggle,
    setTags,
    addTag,
    removeTag,
    allTags,
    clear,
  };
}
