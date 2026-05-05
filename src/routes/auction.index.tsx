import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { KIND_LABELS } from "@/game/auction";
import { Gavel, Clock, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/auction/")({
  component: AuctionPage,
});

function AuctionPage() {
  const auctions = useGame((s) => s.auctions ?? []);
  const horses = useGame((s) => s.horses);
  const day = useGame((s) => s.day);

  const upcoming = auctions
    .filter((a) => !a.resolved)
    .sort((a, b) => a.day - b.day);

  const past = auctions
    .filter((a) => a.resolved)
    .sort((a, b) => b.day - a.day)
    .slice(0, 10);

  const eligibleToConsign = horses.filter(
    (h) => h.owned && !h.consignedSaleId && (h.age === 0 || h.age === 1 || h.age === 2)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
        <p className="text-muted-foreground">Weanling &amp; yearling auctions</p>
      </div>

      {/* Upcoming Sales */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Upcoming Sales</h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              No upcoming sales. The next weanling sale opens around day 60 (Mar 1) and the yearling sale around day 240 (Aug 28).
            </CardContent>
          </Card>
        ) : (
          upcoming.map((sale) => {
            const daysAway = sale.day - day;
            const playerLots = sale.lots.filter((l) => !l.consignorStableId && !l.withdrawn);
            return (
              <Card key={sale.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{sale.name}</CardTitle>
                        <Badge variant="outline">{KIND_LABELS[sale.kind] ?? sale.kind}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {gameCalendarDate(sale.day)} · {sale.lots.filter((l) => !l.withdrawn).length} lots
                        {daysAway > 0 && ` · in ${daysAway} day${daysAway === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {playerLots.length > 0 && (
                    <p className="text-sm text-success font-medium">
                      {playerLots.length} of your horse{playerLots.length > 1 ? "s" : ""} consigned
                    </p>
                  )}
                  <Link to="/auction/$saleId" params={{ saleId: sale.id }}>
                    <Button size="sm" className="w-full">
                      <Gavel className="h-4 w-4 mr-2" />
                      {daysAway <= 0 ? "Enter Sale" : "Preview Lots"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      {/* Eligible horses to consign */}
      {eligibleToConsign.length > 0 && upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Eligible to Consign</h2>
          <div className="grid gap-2">
            {(() => {
              const weanlingSale = upcoming.find((a) => a.kind === "weanling" || a.kind === "weanling_south");
              const yearlingSale = upcoming.find((a) => a.kind === "yearling" || a.kind === "yearling_south");
              return eligibleToConsign.map((horse) => {
                const targetSale = horse.age === 0 ? weanlingSale : yearlingSale;
              return (
                <Card key={horse.id} className="p-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">{horse.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {horse.age === 0 ? "Weanling" : horse.age === 1 ? "Yearling" : "2YO"} · {horse.gender}
                    </p>
                  </div>
                  {targetSale ? (
                    <Link to="/auction/$saleId" params={{ saleId: targetSale.id }}>
                      <Button size="sm" variant="outline">
                        Consign to {targetSale.name.split(" ").slice(0, 2).join(" ")}
                      </Button>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">No matching sale open</span>
                  )}
                </Card>
              );
              });
            })()}
          </div>
        </section>
      )}

      {/* Past Sales */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Past Sales</h2>
          {past.map((sale) => {
            const sold = sale.lots.filter((l) => !l.passed && !l.withdrawn && l.hammerPrice).length;
            const passed = sale.lots.filter((l) => l.passed).length;
            const topLot = sale.lots
              .filter((l) => l.hammerPrice)
              .sort((a, b) => (b.hammerPrice ?? 0) - (a.hammerPrice ?? 0))[0];
            const topHorse = topLot ? horses.find((h) => h.id === topLot.horseId) : undefined;
            return (
              <Card key={sale.id} className="opacity-80">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{sale.name}</CardTitle>
                        <Badge variant="secondary">{gameCalendarDate(sale.day)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {sold} sold · {passed} passed
                        {topLot && topHorse && ` · Top lot: ${topHorse.name} $${topLot.hammerPrice!.toLocaleString()}`}
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
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
    </div>
  );
}
