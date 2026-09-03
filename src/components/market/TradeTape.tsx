/**
 * TradeTape.tsx - Live exchange trade tape
 *
 * Chronological feed of settled exchange trades, newest first. Shows who traded
 * with whom, at what price relative to the day's price index, which side
 * initiated the fill, and whether the player was involved.
 *
 * Dependencies: @/core/market/exchange (ExchangeTrade), @/core/common/formatting
 * Related files: src/components/market/ExchangePanel.tsx
 */

import { Activity, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/core/common/formatting";
import type { ExchangeTrade } from "@/core/market/exchange";

export function TradeTape({
  trades,
  day,
  limit = 16,
}: {
  trades: ExchangeTrade[];
  day: number;
  limit?: number;
}) {
  const tape = [...trades].sort((a, b) => b.day - a.day).slice(0, limit);
  const todayCount = trades.filter((t) => t.day === day).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-cream-muted">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Trade Tape
        </h3>
        <span className="flex items-center gap-1.5 text-[10px] text-cream-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden />
          {todayCount} today
        </span>
      </div>

      {tape.length === 0 ? (
        <p className="text-xs text-cream-muted">No trades settled yet.</p>
      ) : (
        <ul className="space-y-1">
          {tape.map((t) => {
            const playerSide =
              t.buyerId === "player" ? "bought" : t.sellerId === "player" ? "sold" : null;
            const takenByBuyer = t.initiatedBy === "ask";
            return (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded border border-white/5 bg-slate-950/50 px-3 py-1.5 text-xs"
                title={`Day ${t.day} · commission ${formatCurrency(t.commission)} · ${
                  takenByBuyer ? "buyer took the ask" : "seller hit the bid"
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {takenByBuyer ? (
                    <ArrowUpRight className="h-3 w-3 shrink-0 text-destructive" aria-hidden />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 shrink-0 text-success" aria-hidden />
                  )}
                  <span className="truncate text-cream">{t.horseName}</span>
                  {playerSide && (
                    <Badge variant="outline" className="shrink-0 text-[9px] uppercase">
                      You {playerSide}
                    </Badge>
                  )}
                </span>
                <span className="min-w-0 truncate text-[10px] text-cream-muted">
                  {t.sellerName} → {t.buyerName} · D{t.day}
                </span>
                <span className="shrink-0 tabular-nums text-cream">{formatCurrency(t.price)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
