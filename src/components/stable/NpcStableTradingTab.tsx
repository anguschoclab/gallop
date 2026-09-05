/**
 * NpcStableTradingTab.tsx - Syndication stakes and Exchange activity for an NPC stable
 *
 * Shows which stallion syndicates the stable holds shares in, its current asks
 * and bids on the bloodstock exchange, and every trade it has settled.
 */

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/core/common/formatting";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";
import { createDefaultExchangeState } from "@/core/market/exchange";

const CARD = "bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4";
const HEAD = "text-[10px] font-black uppercase tracking-wide text-cream/40";
const EMPTY =
  "p-8 text-center text-[10px] font-mono text-cream/20 uppercase tracking-wide italic";

export function NpcStableTradingTab({ stableId }: { stableId: string }) {
  const syndicates = useGameWithShallow((s: GameState) => s.syndicates ?? {});
  const exchange = useGameWithShallow((s: GameState) => s.exchange ?? createDefaultExchangeState());
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const day = useGame((s: GameState) => s.day);

  const stakes = useMemo(
    () =>
      Object.values(syndicates)
        .map((syn) => {
          const shares = syn.shareHolders?.[stableId as never] ?? 0;
          return {
            id: syn.id,
            stallionId: syn.stallionId,
            stallionName: syn.stallionName,
            shares,
            pct: syn.totalShares > 0 ? (shares / syn.totalShares) * 100 : 0,
            value: shares * syn.sharePrice,
            studFee: syn.studFee,
          };
        })
        .filter((s) => s.shares > 0)
        .sort((a, b) => b.value - a.value),
    [syndicates, stableId],
  );

  const asks = useMemo(
    () => exchange.asks.filter((a) => a.sellerId === stableId),
    [exchange.asks, stableId],
  );
  const bids = useMemo(
    () => exchange.bids.filter((b) => b.bidderId === stableId),
    [exchange.bids, stableId],
  );
  const trades = useMemo(
    () =>
      exchange.trades
        .filter((t) => t.sellerId === stableId || t.buyerId === stableId)
        .slice()
        .sort((a, b) => b.day - a.day)
        .slice(0, 40),
    [exchange.trades, stableId],
  );

  const stakeValue = stakes.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="space-y-6">
      <Card className={`${CARD} border-l-amber-400`}>
        <CardHeader className="bg-black/20 border-b border-white/5 flex-row items-center justify-between">
          <CardTitle className={HEAD}>Syndication Stakes</CardTitle>
          <span className="font-mono text-[10px] text-cream/40">
            {formatCurrency(stakeValue)} held
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {stakes.length === 0 ? (
            <div className={EMPTY}>Holds no stallion shares.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {stakes.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-4">
                  <Link
                    to="/syndicate/$syndicateId"
                    params={{ syndicateId: s.id }}
                    className="text-xs font-bold uppercase text-cream hover:text-blue-400"
                  >
                    {s.stallionName}
                  </Link>
                  <div className="flex items-center gap-4 font-mono text-[10px] text-cream/50">
                    <span>
                      {s.shares} shares ({Math.round(s.pct)}%)
                    </span>
                    <span className="text-cream">{formatCurrency(s.value)}</span>
                    <span>Fee {formatCurrency(s.studFee)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className={`${CARD} border-l-rose-400`}>
          <CardHeader className="bg-black/20 border-b border-white/5">
            <CardTitle className={HEAD}>Open Asks ({asks.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {asks.length === 0 ? (
              <div className={EMPTY}>No horses listed for sale.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {asks.map((a) => (
                  <div key={a.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to="/stable/$horseId"
                        params={{ horseId: a.horseId }}
                        className="text-xs font-bold uppercase text-cream hover:text-blue-400"
                      >
                        {horses[a.horseId]?.name ?? "Unknown"}
                      </Link>
                      <span className="font-mono text-xs text-cream tabular-nums">
                        {formatCurrency(a.price)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase text-cream/40">
                      {a.intent && (
                        <Badge variant="outline" className="border-white/10 text-cream/60">
                          {a.intent}
                        </Badge>
                      )}
                      <span>Fair {formatCurrency(a.fairValue)}</span>
                      <span>Expires day {a.expiresDay}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`${CARD} border-l-emerald-400`}>
          <CardHeader className="bg-black/20 border-b border-white/5">
            <CardTitle className={HEAD}>Standing Bids ({bids.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {bids.length === 0 ? (
              <div className={EMPTY}>Not bidding on anything.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {bids.map((b) => (
                  <div key={b.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to="/stable/$horseId"
                        params={{ horseId: b.horseId }}
                        className="text-xs font-bold uppercase text-cream hover:text-blue-400"
                      >
                        {horses[b.horseId]?.name ?? "Unknown"}
                      </Link>
                      <span className="font-mono text-xs text-cream tabular-nums">
                        {formatCurrency(b.price)}
                      </span>
                    </div>
                    <div className="font-mono text-[9px] uppercase text-cream/40">{b.rationale}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={`${CARD} border-l-blue-400`}>
        <CardHeader className="bg-black/20 border-b border-white/5 flex-row items-center justify-between">
          <CardTitle className={HEAD}>Exchange Trade History</CardTitle>
          <span className="font-mono text-[10px] text-cream/40">Day {day}</span>
        </CardHeader>
        <CardContent className="p-0">
          {trades.length === 0 ? (
            <div className={EMPTY}>No completed exchange trades.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {trades.map((t) => {
                const sold = t.sellerId === stableId;
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase text-cream truncate">
                        {t.horseName}
                      </div>
                      <div className="font-mono text-[9px] uppercase text-cream/40">
                        Day {t.day} · {sold ? `to ${t.buyerName}` : `from ${t.sellerName}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono text-xs tabular-nums ${sold ? "text-success" : "text-cream"}`}
                      >
                        {sold ? "+" : "−"}
                        {formatCurrency(t.price)}
                      </div>
                      <div className="font-mono text-[9px] uppercase text-cream/30">
                        {sold ? "sold" : "bought"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
