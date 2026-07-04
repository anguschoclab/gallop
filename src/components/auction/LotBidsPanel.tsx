/**
 * LotBidsPanel.tsx - Three-state bid history panel for the auction sale page.
 *
 * States:
 *  - loading: bidHistory not yet resolved (undefined) → skeleton rows
 *  - empty:   bidHistory resolved but no bids placed → clear empty CTA
 *  - data:    rendered list of bids, newest first
 */
import { useMemo } from "react";
import { Gavel, Inbox } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/core/common/formatting";
import type { AuctionBidRecord, Stable } from "@/game/types";

interface LotBidsPanelProps {
  bidHistory: AuctionBidRecord[] | undefined;
  stables: Stable[];
  /** When true, render skeleton rows regardless of bidHistory state. */
  isLoading?: boolean;
}

export function LotBidsPanel({ bidHistory, stables, isLoading }: LotBidsPanelProps) {
  const stableMap = useMemo(
    () => new Map(stables.map((s) => [s.id, s])),
    [stables],
  );

  const showSkeleton = isLoading || bidHistory === undefined;
  const isEmpty = !showSkeleton && (bidHistory?.length ?? 0) === 0;

  return (
    <section
      aria-labelledby="lot-bids-heading"
      className="border border-white/5 bg-black/20 rounded"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3
          id="lot-bids-heading"
          className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/60"
        >
          Bid Ledger
        </h3>
        {!showSkeleton && !isEmpty && (
          <span className="font-mono text-[10px] text-cream/40 tabular-nums">
            {bidHistory!.length} {bidHistory!.length === 1 ? "bid" : "bids"}
          </span>
        )}
      </header>

      <div className="max-h-56 overflow-y-auto">
        {showSkeleton ? (
          <BidSkeletonRows />
        ) : isEmpty ? (
          <BidEmptyState />
        ) : (
          <ul className="divide-y divide-white/5">
            {[...bidHistory!].reverse().map((record, idx) => {
              const isYou = record.stableId === undefined;
              const label = isYou
                ? "YOU"
                : (stableMap.get(record.stableId!)?.name ?? record.stableId);
              return (
                <li
                  key={`${record.tick}-${idx}`}
                  className="flex items-baseline justify-between gap-3 px-4 py-2 text-xs"
                >
                  <span
                    className={cn(
                      "font-medium truncate",
                      isYou ? "text-gold" : "text-cream/80",
                    )}
                  >
                    {label}
                  </span>
                  <span className="tabular-nums text-cream text-right shrink-0 font-mono">
                    {formatCurrency(record.amount)}
                  </span>
                  <span className="tabular-nums text-cream/40 shrink-0 text-[10px] font-mono">
                    t{record.tick}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function BidSkeletonRows() {
  return (
    <ul
      role="status"
      aria-label="Loading bids"
      className="divide-y divide-white/5"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="flex items-baseline justify-between gap-3 px-4 py-3"
        >
          <span
            className="h-3 w-24 bg-white/5 rounded animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
          <span
            className="h-3 w-20 bg-white/5 rounded animate-pulse"
            style={{ animationDelay: `${i * 80 + 40}ms` }}
          />
          <span
            className="h-3 w-8 bg-white/5 rounded animate-pulse"
            style={{ animationDelay: `${i * 80 + 80}ms` }}
          />
        </li>
      ))}
    </ul>
  );
}

function BidEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-3">
      <div className="relative">
        <Inbox className="h-10 w-10 text-cream/20" aria-hidden />
        <Gavel
          className="h-5 w-5 text-gold/60 absolute -bottom-1 -right-1"
          aria-hidden
        />
      </div>
      <p className="font-bold text-cream/70 uppercase tracking-[0.25em] text-xs font-[family-name:var(--font-display)]">
        No bids yet
      </p>
      <p className="text-[11px] text-cream/40 max-w-xs leading-relaxed">
        The book is open. Place the opening bid to set the pace — your offer
        will appear here.
      </p>
    </div>
  );
}
