/**
 * RivalStakesPage.tsx — Buy stakes in rival stables' racehorses and track
 * your share of their prize money, market price and prestige.
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageHeader } from "@/shared/ui/common/PageHeader";
import { StatCard } from "@/shared/ui/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { formatCurrency } from "@/shared/common/formatting";
import { getOrdinalSuffix } from "@/shared/common/ordinal";
import { cn } from "@/shared/lib/cn";
import { MAX_RIVAL_STAKE_PERCENT } from "@/domains/syndicates/model/rivalStakes";
import { useRivalStakes, type StakeStatus } from "@/domains/syndicates/application/useRivalStakes";
import { RivalStakeDialog, type RivalStakeTarget } from "@/domains/syndicates/ui/RivalStakeDialog";

const STATUS_LABEL: Record<StakeStatus, string> = {
  racing: "Racing",
  retired: "Retired",
  deceased: "Died",
  yours: "Now yours",
  missing: "Gone",
};

function signed(n: number): string {
  return `${n >= 0 ? "+" : "−"}${formatCurrency(Math.abs(n))}`;
}

export function RivalStakesPage({ stableId }: { stableId?: string } = {}) {
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ target: RivalStakeTarget; mode: "buy" | "sell" } | null>(
    null,
  );
  const { holdings, candidates, summary, recentPayouts, cash } = useRivalStakes(query, stableId);
  const embedded = Boolean(stableId);
  const shownHoldings = embedded ? holdings.filter((h) => h.stake.stableId === stableId) : holdings;

  return (
    <div className={cn("space-y-6", !embedded && "p-6")}>
      {!embedded && (
        <PageHeader
          title="Rival Horse Stakes"
          subtitle={`Buy up to ${MAX_RIVAL_STAKE_PERCENT}% of a rival's racehorse. You get your share of every prize it wins, and your prestige rises with its wins.`}
        />
      )}

      {!embedded && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Stakes held"
            value={String(summary.count)}
            sub={`Cash ${formatCurrency(cash)}`}
          />
          <StatCard label="Invested" value={formatCurrency(summary.invested)} sub="What you paid" />
          <StatCard
            label="Stake value now"
            value={formatCurrency(summary.value)}
            sub="Your share of their price"
          />
          <StatCard
            label="Prize share earned"
            value={formatCurrency(summary.prize)}
            sub="Paid into your cash"
          />
          <StatCard
            label="Prestige earned"
            value={`+${summary.prestige}`}
            sub={`Total return ${signed(summary.totalReturn)}`}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your stakes</CardTitle>
        </CardHeader>
        <CardContent>
          {shownHoldings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No stakes yet. Pick a horse below to buy a share of its prizes.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Horse</TableHead>
                    <TableHead className="text-right">Stake</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Horse price</TableHead>
                    <TableHead className="text-right">Your share of price</TableHead>
                    <TableHead className="text-right">Prize share</TableHead>
                    <TableHead className="text-right">Prestige</TableHead>
                    <TableHead className="text-right">Return</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shownHoldings.map((h) => (
                    <TableRow key={h.stake.horseId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {h.horse ? (
                            <Link
                              to="/stable/$horseId"
                              params={{ horseId: h.stake.horseId }}
                              className="font-medium text-foreground hover:text-primary"
                            >
                              {h.stake.horseName}
                            </Link>
                          ) : (
                            <span className="font-medium">{h.stake.horseName}</span>
                          )}
                          {h.status !== "racing" && (
                            <Badge variant="outline" className="text-xs">
                              {STATUS_LABEL[h.status]}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{h.ownerName}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{h.stake.percent}%</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(h.stake.costBasis)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(h.horseValue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(h.stakeValue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(h.stake.prizeEarned)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        +{h.stake.reputationEarned}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          h.totalReturn >= 0 ? "text-primary" : "text-destructive",
                        )}
                      >
                        {signed(h.totalReturn)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {h.status === "racing" && h.stake.percent < MAX_RIVAL_STAKE_PERCENT && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setDialog({
                                  mode: "buy",
                                  target: {
                                    horseId: h.stake.horseId,
                                    horseName: h.stake.horseName,
                                    ownerName: h.ownerName,
                                    horseValue: h.horseValue,
                                    heldPercent: h.stake.percent,
                                  },
                                })
                              }
                            >
                              Buy more
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDialog({
                                mode: "sell",
                                target: {
                                  horseId: h.stake.horseId,
                                  horseName: h.stake.horseName,
                                  ownerName: h.ownerName,
                                  horseValue: h.horseValue,
                                  heldPercent: h.stake.percent,
                                },
                              })
                            }
                          >
                            {h.status === "deceased" || h.status === "missing"
                              ? "Write off"
                              : "Sell"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!embedded && recentPayouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent payouts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {recentPayouts.map((p) => (
              <div
                key={`${p.horseId}-${p.raceId}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>
                  <span className="text-muted-foreground tabular-nums">Day {p.day} · </span>
                  <span className="font-medium">{p.horseName}</span>{" "}
                  <span className="text-muted-foreground">
                    {p.position}
                    {getOrdinalSuffix(p.position)} in {p.raceName}
                  </span>
                </span>
                <span className="tabular-nums">
                  {formatCurrency(p.share)}{" "}
                  <span className="text-muted-foreground">of {formatCurrency(p.prize)}</span>
                  {p.reputation > 0 && (
                    <span className="ml-2 text-primary">+{p.reputation} prestige</span>
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">
            {embedded ? "Buy a stake in this stable's horses" : "Rival horses for sale"}
          </CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search horses or stables"
              placeholder="Search horse or stable"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rival racehorses match.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Horse</TableHead>
                    <TableHead className="text-right">Age</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                    <TableHead className="text-right">Wins / starts</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Per 1%</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((c) => (
                    <TableRow key={c.horse.id}>
                      <TableCell>
                        <Link
                          to="/stable/$horseId"
                          params={{ horseId: c.horse.id }}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {c.horse.name}
                        </Link>
                        {c.heldPercent > 0 && (
                          <Badge variant="outline" className="ml-2 text-xs text-primary">
                            You own {c.heldPercent}%
                          </Badge>
                        )}
                        {!embedded && (
                          <div className="text-xs text-muted-foreground">{c.ownerName}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.horse.age}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Math.round(c.rating)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.wins} / {c.starts}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(c.earnings)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(c.value)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(c.pricePerPercent)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={c.capacity === 0}
                          onClick={() =>
                            setDialog({
                              mode: "buy",
                              target: {
                                horseId: c.horse.id,
                                horseName: c.horse.name,
                                ownerName: c.ownerName,
                                horseValue: c.value,
                                heldPercent: c.heldPercent,
                              },
                            })
                          }
                        >
                          {c.capacity === 0 ? "Max held" : "Buy stake"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <RivalStakeDialog
        target={dialog?.target ?? null}
        mode={dialog?.mode ?? "buy"}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
