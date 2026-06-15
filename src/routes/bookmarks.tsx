import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark as BookmarkIcon, Trash2, X, Search, Tag as TagIcon, Plus } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { useBookmarks, type Bookmark, type BookmarkEntityType } from "@/hooks/shared/useBookmarks";

export const Route = createFileRoute("/bookmarks")({
  component: BookmarksPage,
});

const TYPE_LABELS: Record<BookmarkEntityType, string> = {
  horse: "Horse",
  jockey: "Jockey",
  stable: "Stable",
  race: "Race",
  sire: "Sire",
};

const TYPE_FILTERS: ReadonlyArray<{ value: BookmarkEntityType | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "horse", label: "Horses" },
  { value: "sire", label: "Sires" },
  { value: "jockey", label: "Jockeys" },
  { value: "stable", label: "Stables" },
  { value: "race", label: "Races" },
];

type SortKey = "recent" | "oldest" | "name" | "type";

const SORTS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "recent", label: "Recently saved" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "type", label: "Type" },
];

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
  const { bookmarks, remove, clear, allTags, addTag, removeTag } = useBookmarks();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<BookmarkEntityType | "all">("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("recent");

  const toggleTagFilter = (tag: string) => {
    const key = tag.toLowerCase();
    setActiveTags((prev) =>
      prev.some((t) => t.toLowerCase() === key)
        ? prev.filter((t) => t.toLowerCase() !== key)
        : [...prev, tag],
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeKeys = activeTags.map((t) => t.toLowerCase());
    let list = bookmarks.filter((b) => {
      if (typeFilter !== "all" && b.type !== typeFilter) return false;
      if (q) {
        const inLabel = b.label.toLowerCase().includes(q);
        const inId = b.id.toLowerCase().includes(q);
        const inType = b.type.toLowerCase().includes(q);
        const inSub = (b.subtitle ?? "").toLowerCase().includes(q);
        const inTag = (b.tags ?? []).some((t) => t.toLowerCase().includes(q));
        if (!inLabel && !inId && !inType && !inSub && !inTag) return false;
      }
      if (activeKeys.length > 0) {
        const bTags = (b.tags ?? []).map((t) => t.toLowerCase());
        const allMatch = activeKeys.every((k) => bTags.includes(k));
        if (!allMatch) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.addedAt - b.addedAt;
        case "name":
          return a.label.localeCompare(b.label);
        case "type":
          return a.type.localeCompare(b.type) || b.addedAt - a.addedAt;
        case "recent":
        default:
          return b.addedAt - a.addedAt;
      }
    });
    return list;
  }, [bookmarks, query, typeFilter, activeTags, sort]);

  const resultsLabel = `${filtered.length} of ${bookmarks.length}`;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-[10px] uppercase font-black tracking-[0.25em] text-cream/30">Saved</p>
          <h1 className="text-4xl font-black font-[family-name:var(--font-display)] text-cream uppercase tracking-tight flex items-center gap-3">
            <BookmarkIcon className="h-7 w-7 text-gold" />
            Bookmarks
          </h1>
          <p className="text-xs text-cream-muted mt-1 font-mono">{resultsLabel} shown</p>
        </div>
        {bookmarks.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clear}
            className="gap-2 text-[10px] uppercase tracking-widest"
          >
            <Trash2 className="h-3 w-3" /> Clear all
          </Button>
        )}
      </header>

      {bookmarks.length === 0 ? (
        <div className="border border-dashed border-white/10 p-16 text-center">
          <BookmarkIcon className="h-10 w-10 mx-auto text-cream/20 mb-4" />
          <h2 className="text-lg font-bold text-cream">No bookmarks yet</h2>
          <p className="text-sm text-cream-muted mt-2 max-w-md mx-auto">
            Save horses, jockeys, stables, sires, and races to quickly come back to them. Look for
            the bookmark icon on profile pages and roster lists.
          </p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream/30" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, ID, type, or tag…"
                className="pl-9 h-9 bg-slate-950/40 border-white/10 text-sm font-mono"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as BookmarkEntityType | "all")}
              className="h-9 bg-slate-950/40 border border-white/10 text-cream text-xs font-mono uppercase tracking-widest px-3"
              aria-label="Filter by type"
            >
              {TYPE_FILTERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 bg-slate-950/40 border border-white/10 text-cream text-xs font-mono uppercase tracking-widest px-3"
              aria-label="Sort by"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  Sort: {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tag filter row */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-cream/30 flex items-center gap-1">
                <TagIcon className="h-3 w-3" /> Tags
              </span>
              {allTags.map((tag) => {
                const active = activeTags.some((t) => t.toLowerCase() === tag.toLowerCase());
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTagFilter(tag)}
                    className={cn(
                      "h-6 px-2 text-[10px] font-mono uppercase tracking-widest border transition-colors",
                      active
                        ? "border-gold/60 bg-gold/10 text-gold"
                        : "border-white/10 text-cream/50 hover:border-gold/30 hover:text-cream",
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
              {activeTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTags([])}
                  className="text-[10px] uppercase font-black tracking-widest text-cream/40 hover:text-destructive flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          )}

          {/* List */}
          {filtered.length === 0 ? (
            <div className="border border-dashed border-white/10 p-12 text-center text-sm text-cream-muted">
              No bookmarks match your filters.
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((b) => (
                <BookmarkCard
                  key={`${b.type}:${b.id}`}
                  bookmark={b}
                  onRemove={() => remove(b.type, b.id)}
                  onAddTag={(tag) => addTag(b.type, b.id, tag)}
                  onRemoveTag={(tag) => removeTag(b.type, b.id, tag)}
                  suggestions={allTags}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

interface BookmarkCardProps {
  bookmark: Bookmark;
  onRemove: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  suggestions: string[];
}

function BookmarkCard({
  bookmark,
  onRemove,
  onAddTag,
  onRemoveTag,
  suggestions,
}: BookmarkCardProps) {
  const [tagInput, setTagInput] = useState("");
  const href = entityHref(bookmark);

  const submitTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    onAddTag(t);
    setTagInput("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      submitTag();
    }
  };

  const availableSuggestions = suggestions.filter(
    (s) => !(bookmark.tags ?? []).some((t) => t.toLowerCase() === s.toLowerCase()),
  );

  return (
    <li className="group relative border border-white/10 bg-slate-950/40 hover:border-gold/40 transition-colors p-3 space-y-3">
      <div className="flex items-start gap-2">
        <Link
          to={href.to as any}
          params={href.params as any}
          search={href.search as any}
          className="block flex-1 min-w-0"
        >
          <div className="text-[9px] uppercase font-black tracking-widest text-gold/70">
            {TYPE_LABELS[bookmark.type]}
          </div>
          <div className="text-sm font-bold text-cream truncate">{bookmark.label}</div>
          {bookmark.subtitle && (
            <div className="text-[11px] text-cream-muted font-mono truncate">
              {bookmark.subtitle}
            </div>
          )}
          <div className="text-[9px] text-cream/20 font-mono mt-1">
            ID {bookmark.id.substring(0, 8).toUpperCase()}
          </div>
        </Link>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove bookmark"
          className="h-6 w-6 inline-flex items-center justify-center text-cream/30 hover:text-destructive shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2 border-t border-white/5 pt-2">
        <div className="flex flex-wrap gap-1.5 items-center">
          {(bookmark.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 h-5 px-1.5 text-[10px] font-mono uppercase tracking-widest border border-gold/40 text-gold bg-gold/5"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemoveTag(tag)}
                aria-label={`Remove tag ${tag}`}
                className="hover:text-destructive"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          {(bookmark.tags ?? []).length === 0 && (
            <span className="text-[10px] uppercase font-mono tracking-widest text-cream/20">
              No tags
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Add tag…"
            className="h-7 text-[11px] font-mono bg-slate-950/60 border-white/10"
            list={`tag-suggestions-${bookmark.type}-${bookmark.id}`}
          />
          <datalist id={`tag-suggestions-${bookmark.type}-${bookmark.id}`}>
            {availableSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={submitTag}
            aria-label="Add tag"
            className="h-7 w-7 inline-flex items-center justify-center border border-white/10 text-cream/60 hover:text-gold hover:border-gold/40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}
