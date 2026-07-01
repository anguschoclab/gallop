import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/core/common/formatting";
import type { AuctionBidRecord, Stable } from "@/game/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Gavel,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

const PAGE_SIZE = 10;

type SortOrder = "newest" | "oldest";

interface BidHistoryPanelProps {
  bidHistory: AuctionBidRecord[];
  stables: Stable[];
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
  error?: string | null;
  onRetry?: () => void;
  onPlaceBid?: () => void;
  canPlaceBid?: boolean;
}

export function BidHistoryPanel({
  bidHistory,
  stables,
  historyOpen,
  onHistoryOpenChange,
  error,
  onRetry,
  onPlaceBid,
  canPlaceBid,
}: BidHistoryPanelProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const stableMap = useMemo(() => new Map(stables.map((s) => [s.id, s])), [stables]);

  const sortedHistory = useMemo(() => {
    const sorted = [...bidHistory].sort((a, b) =>
      sortOrder === "newest" ? b.tick - a.tick : a.tick - b.tick,
    );
    return sorted;
  }, [bidHistory, sortOrder]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [bidHistory]);

  const visibleBids = sortedHistory.slice(0, visibleCount);
  const hasMore = visibleCount < sortedHistory.length;

  return (
    <Sheet open={historyOpen} onOpenChange={onHistoryOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] flex flex-col rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Bid History ({bidHistory.length})</span>
            <div className="flex items-center gap-2">
              {canPlaceBid && (
                <Button size="sm" className="h-8 gap-1.5 font-bold" onClick={onPlaceBid}>
                  <Gavel className="h-3.5 w-3.5" />
                  Place Bid
                </Button>
              )}
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Bid history for the current auction lot
          </SheetDescription>
        </SheetHeader>

        {/* Sorting Controls */}
        {!error && bidHistory.length > 0 && (
          <div className="flex items-center gap-1 px-4 py-2 border-b">
            <Button
              variant={sortOrder === "newest" ? "default" : "outline"}
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setSortOrder("newest")}
            >
              <ArrowDownNarrowWide className="h-3 w-3" />
              Newest
            </Button>
            <Button
              variant={sortOrder === "oldest" ? "default" : "outline"}
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setSortOrder("oldest")}
            >
              <ArrowUpNarrowWide className="h-3 w-3" />
              Oldest
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <AlertCircle className="h-10 w-10 text-destructive/60" />
              <p className="text-sm text-destructive font-bold text-center">{error}</p>
              {onRetry && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={onRetry}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              )}
            </div>
          ) : bidHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-8">No bids yet</p>
          ) : (
            <ul className="space-y-0.5">
              {visibleBids.map((record, idx) => {
                const label =
                  record.stableId === undefined
                    ? "YOU"
                    : (stableMap.get(record.stableId)?.name ?? record.stableId);
                return (
                  <li key={idx} className="flex items-baseline justify-between text-xs gap-3 py-1">
                    <span
                      className={cn(
                        "font-medium truncate",
                        record.stableId === undefined && "text-primary",
                      )}
                    >
                      {label}
                    </span>
                    <span className="tabular-nums text-right shrink-0">
                      {formatCurrency(record.amount)}
                    </span>
                    <span className="tabular-nums text-muted-foreground shrink-0 text-[10px]">
                      t{record.tick}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Load More */}
        {!error && hasMore && (
          <div className="px-4 py-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full font-bold"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Load more ({sortedHistory.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
