import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark as BookmarkIcon, Trash2, X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  useBookmarks,
  type Bookmark,
  type BookmarkEntityType,
} from "@/hooks/shared/useBookmarks";

export const Route = createFileRoute("/bookmarks")({
  component: BookmarksPage,
});

const TYPE_LABELS: Record<BookmarkEntityType, string> = {
  horse: "Horses",
  jockey: "Jockeys",
  stable: "Stables",
  race: "Races",
  sire: "Sires",
};

const TYPE_ORDER: BookmarkEntityType[] = ["horse", "sire", "jockey", "stable", "race"];

function entityHref(b: Bookmark): {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
} {
  switch (b.type) {
    case "horse":
      return { to: "/stable/$horseId", params: { horseId: b.id } };
    case "jockey":
      return { to: "/jockey/$jockeyId", params: { jockeyId: b.id } };
    case "stable":
      return { to: "/npc-stables/$stableId", params: { stableId: b.id } };
    case "sire":
      return { to: "/sire-watch/$stallionId", params: { stallionId: b.id } };
    case "race":
      return { to: "/race/$raceId", params: { raceId: b.id } };
  }
}

function BookmarksPage() {
  const { bookmarks, remove, clear } = useBookmarks();

  const grouped = useMemo(() => {
    const groups: Record<BookmarkEntityType, Bookmark[]> = {
      horse: [],
      jockey: [],
      stable: [],
      race: [],
      sire: [],
    };
    for (const b of bookmarks) groups[b.type].push(b);
    for (const key of TYPE_ORDER) groups[key].sort((a, b) => b.addedAt - a.addedAt);
    return groups;
  }, [bookmarks]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-fade-in">
      <header className="flex items-end justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-[10px] uppercase font-black tracking-[0.25em] text-cream/30">
            Saved
          </p>
          <h1 className="text-4xl font-black font-[family-name:var(--font-display)] text-cream uppercase tracking-tight flex items-center gap-3">
            <BookmarkIcon className="h-7 w-7 text-gold" />
            Bookmarks
          </h1>
          <p className="text-xs text-cream-muted mt-1 font-mono">
            {bookmarks.length} saved {bookmarks.length === 1 ? "item" : "items"}
          </p>
        </div>
        {bookmarks.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clear}
            className="gap-2 text-[10px] uppercase tracking-widest"
          >
            <Trash2 className="h-3 w-3" />
            Clear all
          </Button>
        )}
      </header>

      {bookmarks.length === 0 && (
        <div className="border border-dashed border-white/10 p-16 text-center">
          <BookmarkIcon className="h-10 w-10 mx-auto text-cream/20 mb-4" />
          <h2 className="text-lg font-bold text-cream">No bookmarks yet</h2>
          <p className="text-sm text-cream-muted mt-2 max-w-md mx-auto">
            Save horses, jockeys, stables, sires, and races to quickly come back to them. Look for
            the bookmark icon on any profile page.
          </p>
        </div>
      )}

      {TYPE_ORDER.map((type) => {
        const items = grouped[type];
        if (items.length === 0) return null;
        return (
          <section key={type} className="space-y-3">
            <h2 className="text-[10px] uppercase font-black tracking-[0.25em] text-cream/40 border-b border-white/5 pb-2">
              {TYPE_LABELS[type]}{" "}
              <span className="text-cream/20 font-mono">· {items.length}</span>
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {items.map((b) => {
                const href = entityHref(b);
                return (
                  <li
                    key={`${b.type}:${b.id}`}
                    className="group relative border border-white/10 bg-slate-950/40 hover:border-gold/40 transition-colors"
                  >
                    <Link
                      to={href.to as any}
                      params={href.params as any}
                      search={href.search as any}
                      className="block p-3 pr-10"
                    >
                      <div className="text-[9px] uppercase font-black tracking-widest text-gold/70">
                        {b.type}
                      </div>
                      <div className="text-sm font-bold text-cream truncate">{b.label}</div>
                      {b.subtitle && (
                        <div className="text-[11px] text-cream-muted font-mono truncate">
                          {b.subtitle}
                        </div>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(b.type, b.id)}
                      aria-label="Remove bookmark"
                      className="absolute top-2 right-2 h-6 w-6 inline-flex items-center justify-center text-cream/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
