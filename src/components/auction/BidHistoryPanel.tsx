import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting";
import type { AuctionBidRecord, Stable } from "@/game/types";

interface BidHistoryPanelProps {
  bidHistory: AuctionBidRecord[];
  stables: Stable[];
}

export function BidHistoryPanel({ bidHistory, stables }: BidHistoryPanelProps) {
  // ⚡ Bolt Optimization:
  // Pre-calculate hash map for O(1) lookups instead of running O(N) .find() inside the .map() loop.
  // Impact: Reduces rendering complexity of bid history from O(N*M) to O(N+M),
  // preventing performance degradation as the bid history grows long.
  const stableMap = useMemo(() => new Map(stables.map((s) => [s.id, s])), [stables]);

  return (
    <div
      id="bid-history-panel"
      className="rounded-md border bg-muted/30 p-2 space-y-0.5 max-h-40 overflow-y-auto"
    >
      {bidHistory.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-2">No bids yet</p>
      ) : (
        [...bidHistory].reverse().map((record, idx) => {
          const label =
            record.stableId === undefined
              ? "YOU"
              : (stableMap.get(record.stableId)?.name ?? record.stableId);
          return (
            <div key={idx} className="flex items-baseline justify-between text-xs gap-3">
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
            </div>
          );
        })
      )}
    </div>
  );
}
