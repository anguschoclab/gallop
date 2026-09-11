import { useMemo, useState } from "react";
import {
  Trophy,
  ArrowLeftRight,
  Building2,
  Search,
  X,
  Calendar,
  Sparkles,
  Newspaper,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGameWithShallow } from "@/game/store";
import { NewsContent } from "@/components/narrative/NewsContent";
import {
  buildAlmanacNewsFeed,
  filterAlmanacNewsFeed,
  type AlmanacFeedCategory,
  type AlmanacFeedItem,
} from "@/services/history/historyFacade";
import type { TrackRecord, SeasonRecord } from "@/services/history/historyFacade";
import type { Transaction } from "@/services/transactions/transactionsFacade";
import type { Horse } from "@/services/horse/horseFacade";
import type { NewsItem } from "@/services/narrative/newsTypes";
import { cn } from "@/lib/cn";

const EMPTY_ARRAY: never[] = [];
const EMPTY_OBJECT = {} as Record<string, never>;
const INITIAL_PAGE_SIZE = 40;
const PAGE_INCREMENT = 40;

export function AlmanacNewsFeed() {
  const {
    day: currentDay,
    news,
    archive,
    trackRecords,
    seasonRecords,
    transactions,
    horses,
  } = useGameWithShallow((s) => ({
    day: s.day,
    news: (s.news ?? EMPTY_ARRAY) as NewsItem[],
    archive: s.archive,
    trackRecords: (s.trackRecords ?? EMPTY_OBJECT) as Record<string, TrackRecord>,
    seasonRecords: (s.seasonRecords ?? EMPTY_ARRAY) as SeasonRecord[],
    transactions: (s.transactions ?? EMPTY_ARRAY) as Transaction[],
    horses: (s.horses ?? EMPTY_OBJECT) as Record<string, Horse>,
  }));

  const [category, setCategory] = useState<AlmanacFeedCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [visibleLimit, setVisibleLimit] = useState<number>(INITIAL_PAGE_SIZE);

  // 1. Build unified master feed
  const masterFeed = useMemo(
    () =>
      buildAlmanacNewsFeed({
        news,
        archivedNews: archive?.news,
        trackRecords,
        seasonRecords,
        transactions,
        horses,
        currentDay,
      }),
    [news, archive?.news, trackRecords, seasonRecords, transactions, horses, currentDay],
  );

  // 2. Compute category counts across all events
  const counts = useMemo(() => {
    let track = 0;
    let transfer = 0;
    let stable = 0;
    for (const item of masterFeed) {
      if (item.category === "track") track++;
      else if (item.category === "transfer") transfer++;
      else if (item.category === "stable") stable++;
    }
    return {
      all: masterFeed.length,
      track,
      transfer,
      stable,
    };
  }, [masterFeed]);

  // 3. Extract all distinct years for the year filter
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const item of masterFeed) {
      set.add(item.year);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [masterFeed]);

  // 4. Apply filtering
  const filteredFeed = useMemo(
    () =>
      filterAlmanacNewsFeed(masterFeed, {
        category,
        searchQuery,
        year: selectedYear,
      }),
    [masterFeed, category, searchQuery, selectedYear],
  );

  // 5. Slice for display pagination
  const visibleItems = useMemo(
    () => filteredFeed.slice(0, visibleLimit),
    [filteredFeed, visibleLimit],
  );

  const hasMore = filteredFeed.length > visibleLimit;

  // 6. Group visible items by date
  const dateGroups = useMemo(() => {
    const groups: {
      day: number;
      calendarDate: string;
      relativeDate: string;
      items: AlmanacFeedItem[];
    }[] = [];

    for (const item of visibleItems) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.day === item.day) {
        lastGroup.items.push(item);
      } else {
        groups.push({
          day: item.day,
          calendarDate: item.calendarDate,
          relativeDate: item.relativeDate,
          items: [item],
        });
      }
    }
    return groups;
  }, [visibleItems]);

  const handleResetFilters = () => {
    setCategory("all");
    setSearchQuery("");
    setSelectedYear(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="News Category Filters">
              <button
                type="button"
                onClick={() => setCategory("all")}
                aria-pressed={category === "all"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5",
                  category === "all"
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-muted/40 text-cream-muted hover:text-cream hover:bg-muted/60",
                )}
              >
                All News
                <span className="text-[10px] opacity-70 tabular-nums">({counts.all})</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory("track")}
                aria-pressed={category === "track"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5",
                  category === "track"
                    ? "bg-emerald-600 text-white shadow"
                    : "bg-muted/40 text-cream-muted hover:text-cream hover:bg-muted/60",
                )}
              >
                <Trophy className="h-3.5 w-3.5" />
                Track Events
                <span className="text-[10px] opacity-70 tabular-nums">({counts.track})</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory("transfer")}
                aria-pressed={category === "transfer"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5",
                  category === "transfer"
                    ? "bg-amber-600 text-white shadow"
                    : "bg-muted/40 text-cream-muted hover:text-cream hover:bg-muted/60",
                )}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Horse Transfers
                <span className="text-[10px] opacity-70 tabular-nums">({counts.transfer})</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory("stable")}
                aria-pressed={category === "stable"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5",
                  category === "stable"
                    ? "bg-sky-600 text-white shadow"
                    : "bg-muted/40 text-cream-muted hover:text-cream hover:bg-muted/60",
                )}
              >
                <Building2 className="h-3.5 w-3.5" />
                Stable News
                <span className="text-[10px] opacity-70 tabular-nums">({counts.stable})</span>
              </button>
            </div>

            {/* Keyword Search */}
            <div className="relative min-w-[240px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by horse, track, stable..."
                className="pl-9 pr-8 h-9 text-xs bg-black/20 border-white/10 text-cream placeholder:text-cream-muted/50 rounded-md"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream p-0.5"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Optional Year Filters when spanning multiple years */}
          {years.length > 1 && (
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <Calendar className="h-3 w-3 text-cream-muted" />
              <span className="text-[11px] font-mono text-cream-muted uppercase tracking-wider">
                Year:
              </span>
              <button
                type="button"
                onClick={() => setSelectedYear(undefined)}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-mono transition-colors",
                  selectedYear === undefined
                    ? "bg-white/10 text-cream font-bold"
                    : "text-cream-muted hover:text-cream",
                )}
              >
                All Years
              </button>
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setSelectedYear(y)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-mono transition-colors",
                    selectedYear === y
                      ? "bg-white/10 text-cream font-bold"
                      : "text-cream-muted hover:text-cream",
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feed Contents */}
      {masterFeed.length === 0 ? (
        <Card className="border-white/5 bg-slate-900/40">
          <CardContent className="py-16 text-center space-y-3">
            <Newspaper className="h-10 w-10 text-cream-muted/30 mx-auto" />
            <p className="text-cream font-medium">No news recorded yet</p>
            <p className="text-xs text-cream-muted max-w-md mx-auto leading-relaxed">
              Your world's history will be chronicled here as races are run, horses are traded, and
              stable operations unfold.
            </p>
          </CardContent>
        </Card>
      ) : filteredFeed.length === 0 ? (
        <Card className="border-white/5 bg-slate-900/40">
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-cream font-medium">No events match your criteria</p>
            <p className="text-xs text-cream-muted">
              Try broadening your category filter or clearing the search keyword.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs mt-2"
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Timeline Spine */}
          <div className="relative border-l-2 border-white/10 pl-6 ml-3 space-y-8">
            {dateGroups.map((group) => (
              <div key={group.day} className="space-y-4">
                {/* Date Header Node */}
                <div className="relative flex items-center gap-3 -ml-[31px]">
                  <div className="h-3 w-3 rounded-full bg-gold ring-4 ring-slate-950" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-cream font-[family-name:var(--font-display)] tracking-tight">
                      {group.calendarDate}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono border-white/10 text-cream/60 py-0 h-4"
                    >
                      Day {String(group.day).padStart(3, "0")}
                    </Badge>
                    <span className="text-[11px] text-cream-muted/70 italic">
                      · {group.relativeDate}
                    </span>
                  </div>
                </div>

                {/* Group Event Cards */}
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <TimelineEventCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {hasMore && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleLimit((prev) => prev + PAGE_INCREMENT)}
                className="text-xs gap-2 border-white/10 bg-slate-900/60 hover:bg-slate-800 text-cream"
              >
                <ChevronDown className="h-4 w-4" />
                Show older news ({filteredFeed.length - visibleLimit} more)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TimelineEventCard({ item }: { item: AlmanacFeedItem }) {
  const isTrack = item.category === "track";
  const isTransfer = item.category === "transfer";
  const isStable = item.category === "stable";

  return (
    <Card
      className={cn(
        "relative border-white/5 bg-slate-900/40 hover:bg-slate-900/60 transition-all group",
        item.importance === "high" && "border-gold/30 bg-slate-900/50",
      )}
    >
      <CardContent className="p-4 space-y-2">
        {/* Card Header Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Category Indicator */}
            {isTrack && (
              <Badge className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase px-1.5 py-0 h-4.5 gap-1">
                <Trophy className="h-2.5 w-2.5" />
                Track Event
              </Badge>
            )}
            {isTransfer && (
              <Badge className="bg-amber-950/80 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase px-1.5 py-0 h-4.5 gap-1">
                <ArrowLeftRight className="h-2.5 w-2.5" />
                Horse Transfer
              </Badge>
            )}
            {isStable && (
              <Badge className="bg-sky-950/80 text-sky-300 border border-sky-500/30 text-[10px] font-black uppercase px-1.5 py-0 h-4.5 gap-1">
                <Building2 className="h-2.5 w-2.5" />
                Stable News
              </Badge>
            )}

            {/* Subcategory Chip */}
            <span className="text-[10px] font-mono uppercase tracking-wider text-cream-muted/60">
              · {item.subcategory}
            </span>

            {/* High Importance Tag */}
            {item.importance === "high" && (
              <Badge className="bg-gold/20 text-gold-bright border border-gold/40 text-[9px] font-black uppercase px-1 py-0 h-4 gap-0.5">
                <Sparkles className="h-2.5 w-2.5" />
                Featured
              </Badge>
            )}
          </div>

          <span className="text-[11px] font-mono text-cream-muted/50 tabular-nums">
            {item.calendarDate}
          </span>
        </div>

        {/* Headline with Active Entity Links */}
        <h3 className="font-semibold text-cream group-hover:text-gold transition-colors text-sm sm:text-base leading-snug">
          <NewsContent text={item.headline} links={item.entityLinks} />
        </h3>

        {/* Detail Body */}
        <p className="text-xs text-cream-muted leading-relaxed">
          <NewsContent text={item.detail} links={item.entityLinks} />
        </p>

        {/* Metadata Chips if present */}
        {item.meta && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5 text-[11px] font-mono text-cream-muted/70">
            {item.meta.price !== undefined && (
              <span className="text-gold font-bold">
                Value: ${item.meta.price.toLocaleString()}
              </span>
            )}
            {item.meta.grade && (
              <span className="text-cream font-medium">Grade: {item.meta.grade}</span>
            )}
            {item.meta.time !== undefined && <span>Time: {item.meta.time.toFixed(2)}s</span>}
            {item.meta.trackName && <span>Track: {item.meta.trackName}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
