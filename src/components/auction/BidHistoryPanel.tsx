import { cn } from "@/lib/utils";
import { formatCurrency } from "@/components/HorseBits";
import type { AuctionBidRecord, Stable } from "@/game/types";

interface BidHistoryPanelProps {
  bidHistory: AuctionBidRecord[];
  stables: Stable[];
}

export function BidHistoryPanel({ bidHistory, stables }: BidHistoryPanelProps) {
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
              : (stables.find((s) => s.id === record.stableId)?.name ?? record.stableId);
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
