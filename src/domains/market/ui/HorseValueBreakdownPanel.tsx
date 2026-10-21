/**
 * HorseValueBreakdownPanel.tsx — Why a horse is priced what it is.
 *
 * Shows each price factor (stats, age, potential, build, fans, pedigree,
 * recent results), the racing/breeding blend, last-30-day price movement and
 * the most each rival stable would bid. Rival horses need a scouting report
 * first, matching how the rest of the game hides unscouted stats.
 */

import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, Minus, Scale, Search } from "lucide-react";
import type { AuctionHouse } from "@/domains/prestige/simulation";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { formatCurrency } from "@/shared/common/formatting";
import { cn } from "@/shared/lib/cn";
import type { Horse } from "@/platform/game/types";
import { useHorseValueBreakdown } from "@/domains/market/application/useHorseValueBreakdown";

function pct(m: number): string {
  const d = Math.round((m - 1) * 1000) / 10;
  if (d === 0) return "±0%";
  return `${d > 0 ? "+" : "−"}${Math.abs(d)}%`;
}

function money(n: number): string {
  if (n === 0) return formatCurrency(0);
  return `${n > 0 ? "+" : "−"}${formatCurrency(Math.abs(n))}`;
}

function Trend({ value }: { value: number | null }) {
  if (value === null || value === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />;
  return value > 0 ? (
    <ArrowUpRight className="h-3.5 w-3.5 text-primary" aria-hidden />
  ) : (
    <ArrowDownRight className="h-3.5 w-3.5 text-destructive" aria-hidden />
  );
}

const LIMIT_LABEL = {
  not_interested: "Not interested",
  valuation: "Its valuation",
  personality: "Buying style",
  cash: "Cash on hand",
} as const;

export function HorseValueBreakdownPanel({
  horse: rawHorse,
  house,
  className,
}: {
  horse: Horse;
  house?: AuctionHouse;
  className?: string;
}) {
  const { breakdown, movement, bidders, scout } = useHorseValueBreakdown(rawHorse, house);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-primary" /> Price breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        {!breakdown || !movement ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border p-4">
            <p className="text-muted-foreground">
              Scout {rawHorse.name} to see how its stats, results and reputation set its price and
              what rival stables would bid.
            </p>
            <Button
              size="sm"
              onClick={() => {
                const r = scout();
                if (r.success) toast.success(r.message ?? `Scout sent to ${rawHorse.name}`);
                else toast.error(r.message ?? "Couldn't send a scout");
              }}
            >
              <Search className="h-3.5 w-3.5" /> Scout
            </Button>
          </div>
        ) : (
          <>
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
                Racing value, step by step
              </div>
              <ol className="space-y-1">
                {breakdown.factors.map((f) => (
                  <li key={f.key} className="grid grid-cols-[8.5rem_1fr_4rem_6rem] items-baseline gap-2">
                    <span className="font-medium text-foreground">{f.label}</span>
                    <span className="truncate text-xs text-muted-foreground" title={f.detail}>
                      {f.detail}
                    </span>
                    <span
                      className={cn(
                        "text-right text-xs tabular-nums",
                        f.multiplier === null
                          ? "text-muted-foreground"
                          : f.multiplier > 1
                            ? "text-primary"
                            : f.multiplier < 1
                              ? "text-destructive"
                              : "text-muted-foreground",
                      )}
                    >
                      {f.multiplier === null ? "base" : pct(f.multiplier)}
                    </span>
                    <span className="text-right tabular-nums text-foreground">{formatCurrency(f.valueAfter)}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 grid gap-1 rounded-md border border-border bg-muted/30 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Racing value × {Math.round(breakdown.blend.racingWeight * 100)}%
                  </span>
                  <span className="tabular-nums">{formatCurrency(breakdown.racingValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Breeding value × {Math.round(breakdown.blend.breedingWeight * 100)}% (
                    {breakdown.breedingDetail})
                  </span>
                  <span className="tabular-nums">{formatCurrency(breakdown.breedingValue)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 font-semibold">
                  <span>Auction-house value ({breakdown.blend.phase})</span>
                  <span className="tabular-nums">{formatCurrency(breakdown.marketValue)}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Best speed figure:{" "}
                <span className="text-foreground">{breakdown.bestSpeedFigure ?? "none yet"}</span> — fast
                times only raise the price through the wins and places they produce.
              </p>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
                Price movement, last {movement.windowDays} days
              </div>
              <div className="grid gap-1.5 text-xs">
                <MoveRow
                  label="Overall"
                  detail={
                    movement.priceThen === null
                      ? "No earlier price on record"
                      : `${formatCurrency(movement.priceThen)} → ${formatCurrency(movement.priceNow)}`
                  }
                  value={movement.change}
                />
                <MoveRow
                  label="Recent wins & places"
                  detail={`${movement.winsInWindow} win${movement.winsInWindow === 1 ? "" : "s"} in this period`}
                  value={movement.fromResults}
                />
                <MoveRow
                  label="Reputation"
                  detail={
                    movement.fameThen === null
                      ? `Fame ${Math.round(movement.fameNow)}`
                      : `Fame ${Math.round(movement.fameThen)} → ${Math.round(movement.fameNow)}`
                  }
                  value={movement.fromReputation}
                />
                <MoveRow
                  label="Ranking"
                  detail={
                    movement.rankNow === null
                      ? "Unranked"
                      : movement.rankThen === null
                        ? `#${movement.rankNow}`
                        : `#${movement.rankThen} → #${movement.rankNow} (rank follows results and fame)`
                  }
                  value={null}
                  hideValue
                />
                {movement.fromOther !== null && (
                  <MoveRow label="Fans, stats & age" detail="Everything else, including new fans" value={movement.fromOther} />
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
                Most each rival stable would bid
              </div>
              {bidders.length === 0 ? (
                <p className="text-xs text-muted-foreground">No rival stable would bid on this horse.</p>
              ) : (
                <div className="grid gap-1 text-xs">
                  {bidders.map((b) => (
                    <div key={b.stableId} className="grid grid-cols-[1fr_6rem_6rem_6rem] items-baseline gap-2">
                      <span className="truncate">
                        {b.stableName} <span className="text-muted-foreground">· {b.personality}</span>
                      </span>
                      <span className="text-right tabular-nums text-muted-foreground" title="What it thinks the horse is worth">
                        {formatCurrency(b.valuation)}
                      </span>
                      <span className="text-right font-semibold tabular-nums">{formatCurrency(b.walkAway)}</span>
                      <span className="text-right text-muted-foreground">{LIMIT_LABEL[b.limitedBy]}</span>
                    </div>
                  ))}
                  <p className="mt-1 text-muted-foreground">
                    Columns: their valuation, top bid, and what stops them going higher. Rivals value
                    stats, fame and pedigree by their own buying style.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MoveRow({
  label,
  detail,
  value,
  hideValue,
}: {
  label: string;
  detail: string;
  value: number | null;
  hideValue?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1rem_9rem_1fr_6rem] items-center gap-2">
      <Trend value={value} />
      <span className="font-medium text-foreground">{label}</span>
      <span className="truncate text-muted-foreground" title={detail}>
        {detail}
      </span>
      <span
        className={cn(
          "text-right tabular-nums",
          value === null ? "text-muted-foreground" : value > 0 ? "text-primary" : value < 0 ? "text-destructive" : "",
        )}
      >
        {hideValue ? "" : value === null ? "—" : money(value)}
      </span>
    </div>
  );
}
