/**
 * BiddingHistoryTable.tsx - Player auction bidding history
 *
 * Lists every auction lot the player bid on: the sale and house, the horse, each
 * bid placed, the hammer price and whether the lot was won or lost.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/common/StatCard";
import { PillToggleGroup } from "@/components/common/PillToggleGroup";
import { formatCurrency } from "@/core/common/formatting";
import { getAuctionHouse } from "@/core/prestige";
import {
  biddingHistorySummary,
  type PlayerBiddingRecord,
} from "@/core/auction/biddingHistory";

const OUTCOMES = ["all", "won", "outbid", "passed"] as const;
type OutcomeFilter = (typeof OUTCOMES)[number];

const OUTCOME_STYLES: Record<PlayerBiddingRecord["outcome"], string> = {
  won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  outbid: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  passed: "bg-slate-500/15 text-cream-muted border-white/10",
  open: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

export function BiddingHistoryTable({ history }: { history: PlayerBiddingRecord[] }) {
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");

  const rows = useMemo(
    () => (outcome === "all" ? history : history.filter((r) => r.outcome === outcome)),
    [history, outcome],
  );
  const summary = useMemo(() => biddingHistorySummary(history), [history]);

  if (history.length === 0) {
    return (
      <div className="rounded-md border border-white/5 bg-slate-900/40 p-8 text-center text-sm text-cream-muted">
        You haven&apos;t bid at auction yet. Bids placed in the sale ring or in the book will show up
        here with the hammer price.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Lots Contested" value={String(summary.lots)} sub={`${summary.outbid} outbid`} />
        <StatCard
          label="Lots Won"
          value={String(summary.won)}
          sub={`${Math.round(summary.winRate * 100)}% success`}
        />
        <StatCard label="Total Spend" value={formatCurrency(summary.spend)} sub="Hammer prices paid" />
        <StatCard
          label="Average Hammer"
          value={formatCurrency(summary.averageHammer)}
          sub="Per lot won"
        />
      </div>

      <PillToggleGroup
        label="Outcome"
        options={OUTCOMES.map((o) => ({ value: o, label: o }))}
        value={outcome}
        onChange={(v) => setOutcome(v as OutcomeFilter)}
      />

      <div className="rounded-md border border-white/5 bg-slate-900/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5">
              <TableHead>Day</TableHead>
              <TableHead>Sale</TableHead>
              <TableHead>Horse</TableHead>
              <TableHead className="text-right">My Bids</TableHead>
              <TableHead className="text-right">Top Bid</TableHead>
              <TableHead className="text-right">Hammer</TableHead>
              <TableHead className="text-right">Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const house = r.houseId ? getAuctionHouse(r.houseId) : undefined;
              return (
                <TableRow key={r.id} className="border-white/5">
                  <TableCell className="text-cream-muted">{r.day}</TableCell>
                  <TableCell>
                    <div className="text-cream">{r.saleName}</div>
                    <div className="text-xs text-cream-muted">
                      {house ? house.name : r.saleKind.replace(/_/g, " ")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/stable/$horseId"
                      params={{ horseId: r.horseId }}
                      className="text-cream hover:text-primary underline-offset-2 hover:underline"
                    >
                      {r.horseName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-xs text-cream-muted">
                    <span title={r.bids.map((b) => formatCurrency(b)).join(" → ")}>
                      {r.bids.length} bid{r.bids.length === 1 ? "" : "s"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-cream">
                    {formatCurrency(r.topBid)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-cream">
                    {r.hammerPrice !== undefined ? formatCurrency(r.hammerPrice) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={OUTCOME_STYLES[r.outcome]}>
                      {r.outcome}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
