/**
 * SyndicateLedgerPanel.tsx - Per-syndicate historical ledger.
 *
 * Shows how the player's stake in a syndicate has changed over time (stake
 * value sparkline from daily snapshots), plus the payout history: stud-fee
 * distributions paid to the player and share purchases/sales.
 *
 * Dependencies: @/game/store, @/core/breeding/syndicateLedger
 * Related files: SyndicateStakesPage.tsx (renders inside the expanded row),
 *   src/game/store/persistedKeys.ts (syndicateValueSnapshots persistence)
 */
import { useMemo } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import {
  syndicateLedgerTimeSeries,
  type ShareActivityFeedItem,
  type ShareTransaction,
  type SyndicateValueSnapshot,
} from "@/services/breeding/breedingFacade";
import { Sparkline } from "@/components/charts/Sparkline";
import { formatCurrency } from "@/lib/formatting";
import { TrendingUp } from "lucide-react";

const EMPTY_SNAPSHOTS: SyndicateValueSnapshot[] = [];
const EMPTY_FEED: ShareActivityFeedItem[] = [];
const EMPTY_TX: ShareTransaction[] = [];

const EVENT_LABELS: Record<string, string> = {
  share_purchase: "Share purchase",
  share_sale: "Share sale",
  fee_distribution: "Dividend payout",
  devolution: "Ownership change",
  investor_solicit: "Investor solicitation",
  investor_buyout: "Investor buyout",
};

function StakeSparkline({ points }: { points: { day: number; stakeValue: number }[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-16 items-center justify-center text-[10px] text-cream/40 font-mono">
        {points.length === 0
          ? "No daily snapshots yet — stake value is recorded each day you hold shares."
          : "One snapshot so far — the chart fills in as days pass."}
      </div>
    );
  }
  const days = points.map((p) => p.day);
  const values = points.map((p) => p.stakeValue);
  const minD = Math.min(...days);
  const maxD = Math.max(...days);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  return (
    <div>
      <div className="w-full max-w-md" role="img" aria-label="Stake value over time">
        <Sparkline data={values} height={64} />
      </div>
      <div className="flex justify-between max-w-md text-[9px] font-mono text-cream/40">
        <span>Day {minD}</span>
        <span>
          {formatCurrency(minV)} – {formatCurrency(maxV)}
        </span>
        <span>Day {maxD}</span>
      </div>
    </div>
  );
}

export function SyndicateLedgerPanel({ syndicateId }: { syndicateId: string }) {
  const snapshots = useGameWithShallow((s) => s.syndicateValueSnapshots ?? EMPTY_SNAPSHOTS);
  const feed = useGameWithShallow((s) => s.shareActivityFeed ?? EMPTY_FEED);
  const transactions = useGameWithShallow((s) => s.shareTransactions ?? EMPTY_TX);
  const day = useGame((s) => s.day);

  const series = useMemo(
    () => syndicateLedgerTimeSeries(snapshots, feed, syndicateId),
    [snapshots, feed, syndicateId],
  );
  const events = useMemo(
    () => [...feed].filter((f) => f.syndicateId === syndicateId).sort((a, b) => b.day - a.day),
    [feed, syndicateId],
  );
  const txs = useMemo(
    () =>
      [...transactions].filter((t) => t.syndicateId === syndicateId).sort((a, b) => b.day - a.day),
    [transactions, syndicateId],
  );

  const latest = series.at(-1);
  const totalIncome = events
    .filter((e) => e.type === "fee_distribution")
    .reduce((s, e) => s + e.cashMoved, 0);

  return (
    <div className="space-y-3 border-t border-purple-500/20 pt-3 mt-3">
      <div className="text-[10px] font-black uppercase text-cream/70 tracking-wider flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
          Syndicate Ledger · your stake over time
        </div>
        <span className="font-mono text-[9px] text-purple-300">
          Dividends to date: {formatCurrency(totalIncome)}
          {latest ? ` · Stake: ${formatCurrency(latest.stakeValue)} (day ${latest.day})` : ""}
        </span>
      </div>

      <StakeSparkline points={series} />
      {latest && (
        <div className="text-[10px] font-mono text-cream/50">
          Cumulative dividend income: {formatCurrency(latest.cumulativePlayerIncome)} · day {day}
        </div>
      )}

      {events.length > 0 && (
        <div>
          <div className="text-[9px] font-black uppercase tracking-wider text-cream/40 pb-1">
            Payouts &amp; events
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {events.map((e) => (
              <div
                key={e.id}
                className="bg-black/40 border border-white/5 p-2 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-[9px] text-cream/40 shrink-0">Day {e.day}</span>
                  <span className="text-[11px] text-cream/90 truncate">
                    {EVENT_LABELS[e.type] ?? e.type}
                    {e.type === "fee_distribution" && e.totalFee
                      ? ` (pool ${formatCurrency(e.totalFee)})`
                      : ""}
                  </span>
                </div>
                <span
                  className={`font-mono font-black text-xs shrink-0 ${
                    e.cashMoved > 0 ? "text-emerald-400" : "text-cream/40"
                  }`}
                >
                  {e.cashMoved > 0 ? `+${formatCurrency(e.cashMoved)}` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {txs.length > 0 && (
        <div>
          <div className="text-[9px] font-black uppercase tracking-wider text-cream/40 pb-1">
            Share transactions
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
            {txs.map((t) => {
              const mine =
                (t.buyerStableId as string) === "player" ||
                (t.buyerStableId as string) === "__player__";
              return (
                <div
                  key={t.id}
                  className="bg-black/40 border border-white/5 p-2 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[9px] text-cream/40 shrink-0">Day {t.day}</span>
                    <span className="text-[11px] text-cream/90 truncate">
                      {mine
                        ? `Bought ${t.shares} shares`
                        : `${t.buyerStableId} bought ${t.shares} shares from ${t.sellerStableId}`}{" "}
                      @ {formatCurrency(t.pricePerShare)}
                    </span>
                  </div>
                  <span className="font-mono text-xs shrink-0 text-cream/70">
                    {formatCurrency(t.shares * t.pricePerShare)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {events.length === 0 && txs.length === 0 && (
        <p className="text-[10px] text-cream/40 font-mono">
          No ledger entries yet — dividends and share trades will appear here.
        </p>
      )}
    </div>
  );
}
