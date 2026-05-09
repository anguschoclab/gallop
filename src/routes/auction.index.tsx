import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { shallow } from "zustand/shallow";
import { useAuctions } from "@/game/hooks/useMarketState";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gameCalendarDate, dayOfYear } from "@/core/calendar/dateFormatting";
import { KIND_LABELS, SALE_TRIGGERS } from "@/game/auctionData";
import { CONSIGNMENT_COMMISSION, isLotEligible } from "@/game/auction";
import { Gavel, Clock, CheckCircle, Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { NumericValue } from "@/components/HorseBits";
import { formatCurrency } from "@/lib/formatting";
import { SilkDot } from "@/components/SilkDot";
import { cn } from "@/lib/utils";
import { ConsignDialog } from "@/components/auction/ConsignDialog";
import type { AuctionSale, Horse } from "@/game/types";

// Type for mixed AuctionSale and scheduled sale objects
type SaleDisplay =
  | AuctionSale
  | {
      id: string;
      name: string;
      kind: string;
      day: number;
      lots: Array<{ consignorStableId?: string; withdrawn?: boolean }>;
      resolved: false;
      isScheduled: true;
    };

export const Route = createFileRoute("/auction/")({
  component: AuctionPage,
});

function AuctionPage() {
  const auctions = useAuctions() as AuctionSale[];
  const horses = useGame((s) => s.horses);
  const day = useGame((s) => s.day);

  const [consignOpen, setConsignOpen] = useState(false);
  const [consignTarget, setConsignTarget] = useState<{ horse: Horse; sale: AuctionSale } | null>(
    null,
  );

  const activeUpcoming = auctions.filter((a) => !a.resolved).sort((a, b) => a.day - b.day);
  const todaysSales = activeUpcoming.filter((s) => s.day === day);

  // Mix active upcoming with scheduled upcoming (from SALE_TRIGGERS)
  const allUpcoming: SaleDisplay[] = SALE_TRIGGERS.map((t) => {
    const actual = activeUpcoming.find((a) => a.kind === t.kind);
    if (actual) return actual;

    const currentDoy = dayOfYear(day);
    const daysAway = t.doy >= currentDoy ? t.doy - currentDoy : 365 - currentDoy + t.doy;
    const futureDay = day + daysAway;

    return {
      id: `scheduled-${t.kind}`,
      name: t.name,
      kind: t.kind,
      day: futureDay,
      lots: [],
      resolved: false,
      isScheduled: true, // Custom flag to mark it as not fully generated
    };
  }).sort((a, b) => a.day - b.day);

  const past = auctions
    .filter((a) => a.resolved)
    .sort((a, b) => b.day - a.day)
    .slice(0, 10);

  // Player horses available to consign — anything not currently consigned.
  const playerHorses = horses.filter((h) => h.owned && !h.consignedSaleId);

  /**
   * For each player horse, find the next active upcoming sale where it's eligible.
   * We only allow consigning to fully generated active sales.
   */
  function findEligibleSale(horse: Horse): AuctionSale | undefined {
    return activeUpcoming.find((sale) => isLotEligible(horse, sale.kind));
  }

  const consignablePairs = playerHorses
    .map((h) => ({ horse: h, sale: findEligibleSale(h) }))
    .filter((p): p is { horse: Horse; sale: AuctionSale } => p.sale !== undefined);

  function openConsign(horse: Horse, sale: AuctionSale) {
    setConsignTarget({ horse, sale });
    setConsignOpen(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
          Sales
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Eight sales a year — weanlings, yearlings, 2YOs in training, mixed, racing-age, and
          broodmare dispersals.
        </p>
      </div>

      {/* "Sale today" hero — only when applicable */}
      {todaysSales.length > 0 && (
        <section className="space-y-3">
          {todaysSales.map((sale) => (
            <Card
              key={sale.id}
              className="border-2 border-warning bg-warning/5 ring-1 ring-warning/30"
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-warning" />
                    <span className="text-xs font-bold uppercase tracking-wider text-warning">
                      Sale today
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{sale.name}</h3>
                  <p className="text-sm text-cream-muted">
                    {KIND_LABELS[sale.kind] ?? sale.kind} ·{" "}
                    <NumericValue value={sale.lots.filter((l) => !l.withdrawn).length} /> lots in
                    the ring
                  </p>
                </div>
                <Link to="/auction/$saleId" params={{ saleId: sale.id }}>
                  <Button size="lg" className="shadow-md">
                    <Gavel className="h-4 w-4 mr-2" />
                    Enter the Ring
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Upcoming Sales */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold font-[family-name:var(--font-display)]">
          Upcoming Sales
        </h2>
        {allUpcoming.length === 0 ? (
          <Card className="border-gold-muted">
            <CardContent className="p-6 text-center text-cream-muted text-sm font-[family-name:var(--font-body)] italic">
              No sales on the calendar. The ring will open again soon.
            </CardContent>
          </Card>
        ) : (
          allUpcoming.map((sale) => {
            const daysAway = sale.day - day;
            const playerLots = sale.lots
              ? sale.lots.filter((l) => !l.consignorStableId && !l.withdrawn)
              : [];
            const isToday = daysAway === 0;
            const isScheduled = "isScheduled" in sale && sale.isScheduled;

            return (
              <Card
                key={sale.id}
                className={cn(
                  "border-l-4 border-gold-muted",
                  isToday ? "border-l-warning" : "border-l-gold",
                  isScheduled && "opacity-80 border-dashed",
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg font-[family-name:var(--font-display)]">
                          {sale.name}
                        </CardTitle>
                        <Badge className="border border-gold-muted bg-t700 text-cream font-[family-name:var(--font-body)]">
                          {KIND_LABELS[sale.kind as keyof typeof KIND_LABELS] ?? sale.kind}
                        </Badge>
                      </div>
                      <p className="text-sm text-cream-muted mt-1 font-[family-name:var(--font-body)]">
                        {gameCalendarDate(sale.day)}
                        {!isScheduled && (
                          <>
                            {" "}
                            · <NumericValue
                              value={sale.lots.filter((l) => !l.withdrawn).length}
                            />{" "}
                            lots
                          </>
                        )}
                        {daysAway > 0 && (
                          <>
                            {" "}
                            · in <NumericValue value={daysAway} /> day{daysAway === 1 ? "" : "s"}
                          </>
                        )}
                      </p>
                    </div>
                    <Clock className="h-5 w-5 text-cream-muted shrink-0 mt-1" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {playerLots.length > 0 && (
                    <p className="text-sm text-success font-medium font-[family-name:var(--font-body)]">
                      <NumericValue value={playerLots.length} /> of your horse
                      {playerLots.length > 1 ? "s" : ""} consigned
                    </p>
                  )}
                  {isScheduled ? (
                    <Button size="sm" className="w-full" variant="secondary" disabled>
                      <CalendarIcon className="h-4 w-4 mr-2 opacity-50" />
                      Catalog opens {gameCalendarDate(sale.day)}
                    </Button>
                  ) : (
                    <Link to="/auction/$saleId" params={{ saleId: sale.id }}>
                      <Button
                        size="sm"
                        className="w-full"
                        variant={isToday ? "default" : "secondary"}
                      >
                        <Gavel className="h-4 w-4 mr-2" />
                        {isToday ? "Enter Ring" : "Preview Lots"}
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      {/* Eligible to Consign — opens ConsignDialog */}
      {consignablePairs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)]">
              Eligible to Consign
            </h2>
            <span className="text-xs text-cream-muted">
              {Math.round(CONSIGNMENT_COMMISSION * 100)}% sale-house commission applies
            </span>
          </div>
          <div className="grid gap-2">
            {consignablePairs.map(({ horse, sale }) => (
              <Card
                key={horse.id}
                className="p-3 flex items-center justify-between gap-4 border-gold-muted"
              >
                <div className="flex items-center gap-2">
                  <SilkDot color={horse.silk} size="sm" />
                  <div>
                    <p className="font-medium text-sm text-cream font-[family-name:var(--font-display)]">
                      {horse.name}
                    </p>
                    <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                      {ageLabel(horse)} · {horse.gender} · →{" "}
                      {sale.name.split(" ").slice(0, 3).join(" ")}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openConsign(horse, sale)}>
                  Consign…
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Past Sales */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold font-[family-name:var(--font-display)]">
            Past Sales
          </h2>
          {past.map((sale) => {
            const sold = sale.lots.filter((l) => !l.passed && !l.withdrawn && l.hammerPrice).length;
            const passed = sale.lots.filter((l) => l.passed).length;
            const topLot = sale.lots
              .filter((l) => l.hammerPrice)
              .sort((a, b) => (b.hammerPrice ?? 0) - (a.hammerPrice ?? 0))[0];
            const topHorse = topLot ? horses.find((h) => h.id === topLot.horseId) : undefined;
            return (
              <Card key={sale.id} className="opacity-80 border-gold-muted">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base font-[family-name:var(--font-display)]">
                          {sale.name}
                        </CardTitle>
                        <Badge className="bg-t700 text-cream font-[family-name:var(--font-mono)] tabular-nums">
                          {gameCalendarDate(sale.day)}
                        </Badge>
                      </div>
                      <p className="text-xs text-cream-muted mt-1 font-[family-name:var(--font-body)]">
                        <NumericValue value={sold} /> sold · <NumericValue value={passed} /> passed
                        {topLot && topHorse && (
                          <>
                            {" "}
                            · Top lot:{" "}
                            <span className="font-[family-name:var(--font-display)] text-cream">
                              {topHorse.name}
                            </span>{" "}
                            {formatCurrency(topLot.hammerPrice!)}
                          </>
                        )}
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-cream-muted shrink-0 mt-1" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Link to="/auction/$saleId" params={{ saleId: sale.id }}>
                    <Button size="sm" variant="ghost" className="w-full">
                      View Results
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {/* Consign dialog */}
      {consignTarget && (
        <ConsignDialog
          horse={consignTarget.horse}
          sale={consignTarget.sale}
          open={consignOpen}
          onOpenChange={(open) => {
            setConsignOpen(open);
            if (!open) setConsignTarget(null);
          }}
        />
      )}
    </div>
  );
}

function ageLabel(horse: Horse): string {
  if (horse.age === 0) return "Weanling";
  if (horse.age === 1) return "Yearling";
  if (horse.age === 2) return "2YO";
  if (horse.gender === "mare") return `Broodmare (${horse.age})`;
  return `${horse.age}YO`;
}
