import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { useAuctions } from "@/game/hooks/useMarketState";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gameCalendarDate, dayOfYear } from "@/core/calendar/dateFormatting";
import { KIND_LABELS, SALE_TRIGGERS } from "@/game/auctionData";
import { isLotEligible } from "@/game/auction";
import { CONSIGNMENT_COMMISSION } from "@/game/constants/gameConstants";
import {
  Gavel,
  Clock,
  CheckCircle,
  Sparkles,
  Calendar as CalendarIcon,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  Package,
  ExternalLink,
} from "lucide-react";
import { NumericValue } from "@/components/HorseBits";
import { formatCurrency } from "@/lib/formatting";
import { SilkDot } from "@/components/SilkDot";
import { cn } from "@/lib/utils";
import { ConsignDialog } from "@/components/auction/ConsignDialog";
import type { AuctionSale, Horse } from "@/game/types";

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
      isScheduled: true,
    };
  }).sort((a, b) => a.day - b.day);

  const past = auctions
    .filter((a) => a.resolved)
    .sort((a, b) => b.day - a.day)
    .slice(0, 10);

  const playerHorses = horses.filter((h) => h.owned && !h.consignedSaleId);

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
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Auction Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gold/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-gold-bright uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-xs font-bold mb-1 opacity-60">
            <Gavel className="h-3.5 w-3.5" />
            Public Sales
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
            The Auction Block
          </h1>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>
              Active Windows: <NumericValue value={activeUpcoming.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Commission Rate: <NumericValue value={Math.round(CONSIGNMENT_COMMISSION * 100)} />%
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Exchange: <span className="text-success font-black">OPEN</span>
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Badge
            variant="outline"
            className="border-gold/30 text-gold-muted bg-gold/5 font-mono text-[10px] uppercase tracking-widest px-3 py-1 h-8 rounded-none"
          >
            TRADING_FLOOR_ACCESS
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Pillar: Consignment & Archives */}
        <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-6">
          {/* Consign to Sale */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Package className="h-3.5 w-3.5 text-gold/60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
                Consign to Sale
              </h2>
            </div>
            <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-2 border-l-gold/40">
              <CardHeader className="pb-2 border-b border-white/5 bg-black/20">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-[9px] font-black uppercase tracking-widest text-cream/40">
                    Eligible Horses
                  </CardTitle>
                  <span className="text-[9px] font-mono text-gold-bright font-black uppercase">
                    POOL: {consignablePairs.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {consignablePairs.map(({ horse, sale }, i) => (
                    <div
                      key={horse.id}
                      className="p-4 hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <SilkDot color={horse.silk} size="sm" />
                          <span className="font-bold text-cream uppercase tracking-tight text-xs group-hover:text-gold transition-colors">
                            {horse.name}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="h-4 text-[8px] border-white/10 text-cream/40 font-mono"
                        >
                          D{sale.day}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-[9px] font-mono text-cream/20 uppercase tracking-tighter">
                          {ageLabel(horse)} · {horse.gender}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[9px] font-black uppercase border border-gold/20 hover:bg-gold/10 text-gold"
                          onClick={() => openConsign(horse, sale)}
                        >
                          CONSIGN
                        </Button>
                      </div>
                    </div>
                  ))}
                  {consignablePairs.length === 0 && (
                    <div className="p-12 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
                      No assets ready for deployment
                    </div>
                  )}
                </div>
              </CardContent>
              <div className="p-3 bg-black/40 border-t border-white/5 text-center">
                <p className="text-[8px] font-mono text-cream/20 uppercase">
                  House Commission Fixed at {Math.round(CONSIGNMENT_COMMISSION * 100)}%
                </p>
              </div>
            </Card>
          </section>

          {/* Past Transactions */}
          {past.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2 px-1">
                <HardDrive className="h-3.5 w-3.5 text-cream/30" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
                  Transaction Archive
                </h2>
              </div>
              <div className="space-y-2">
                {past.slice(0, 5).map((sale) => {
                  const topLot = sale.lots
                    .filter((l) => l.hammerPrice)
                    .sort((a, b) => (b.hammerPrice ?? 0) - (a.hammerPrice ?? 0))[0];
                  return (
                    <Link
                      key={sale.id}
                      to="/auction/$saleId"
                      params={{ saleId: sale.id }}
                      className="block group"
                    >
                      <div className="p-3 border border-white/5 bg-slate-900/20 group-hover:border-white/20 transition-all">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-cream/60 group-hover:text-cream transition-colors uppercase truncate max-w-[140px]">
                            {sale.name}
                          </span>
                          <span className="text-[9px] font-mono text-cream/20 uppercase">
                            RESOLVED
                          </span>
                        </div>
                        {topLot && (
                          <div className="flex justify-between items-center text-[9px] font-mono text-cream/40">
                            <span>TOP_LOT</span>
                            <span className="text-success">
                              {formatCurrency(topLot.hammerPrice!)}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </aside>

        {/* Right Pillar: Main Auction Schedule */}
        <main className="lg:col-span-8 space-y-8">
          {/* Live / Today Section */}
          {todaysSales.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-success">
                  Live Exchange Floor
                </h2>
              </div>
              <div className="grid gap-4">
                {todaysSales.map((sale) => (
                  <Card
                    key={sale.id}
                    className="bg-slate-900/60 border-success/30 rounded-none shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                      <Gavel className="h-32 w-32 -rotate-12 text-success" />
                    </div>
                    <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                      <div className="space-y-2 text-center md:text-left">
                        <Badge className="bg-success text-slate-950 font-black uppercase text-[10px] tracking-[0.2em] rounded-none px-3">
                          Active_Ring
                        </Badge>
                        <h3 className="text-4xl font-black text-cream font-[family-name:var(--font-display)] uppercase tracking-tight">
                          {sale.name}
                        </h3>
                        <p className="text-xs font-mono text-cream/40 uppercase tracking-tighter">
                          {KIND_LABELS[sale.kind] ?? sale.kind} ·{" "}
                          <NumericValue value={sale.lots.filter((l) => !l.withdrawn).length} /> Lots
                          Listed
                        </p>
                      </div>
                      <Link
                        to="/auction/$saleId"
                        params={{ saleId: sale.id }}
                        className="w-full md:w-auto"
                      >
                        <Button
                          size="lg"
                          className="w-full h-14 px-8 bg-success hover:bg-success/90 text-slate-950 font-black uppercase tracking-[0.2em] rounded-none text-xs shadow-[0_0_30px_rgba(34,197,94,0.2)]"
                        >
                          <Gavel className="h-4 w-4 mr-3" />
                          ENTER_THE_RING
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Ledger */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2 px-1">
              <CalendarIcon className="h-3.5 w-3.5 text-cream/40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
                Upcoming Exchange Windows
              </h2>
            </div>
            <div className="border border-white/5 bg-slate-900/20 shadow-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/40 border-b border-white/10">
                  <tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold-muted/60">
                    <th className="px-6 py-4 font-black">Window Designation</th>
                    <th className="px-4 py-4 font-black">Category</th>
                    <th className="px-4 py-4 font-black text-center">Status</th>
                    <th className="px-4 py-4 font-black text-right">Enter</th>
                    <th className="px-6 py-4 font-black text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allUpcoming.map((sale) => {
                    const daysAway = sale.day - day;
                    const isScheduled = "isScheduled" in sale && sale.isScheduled;
                    const playerLots = sale.lots
                      ? sale.lots.filter((l) => !l.consignorStableId && !l.withdrawn)
                      : [];

                    return (
                      <tr
                        key={sale.id}
                        className={cn(
                          "group hover:bg-white/[0.02] transition-colors relative",
                          daysAway === 0 && "bg-success/[0.02]",
                        )}
                      >
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-cream uppercase tracking-tight group-hover:text-gold transition-colors">
                              {sale.name}
                            </div>
                            <div className="text-[9px] font-mono text-cream/20 uppercase tracking-tighter">
                              D{String(sale.day).padStart(3, "0")} · {gameCalendarDate(sale.day)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <Badge
                            variant="outline"
                            className="text-[8px] h-4 font-black uppercase tracking-tighter border-white/10 text-cream/40 rounded-none"
                          >
                            {KIND_LABELS[sale.kind as keyof typeof KIND_LABELS] ?? sale.kind}
                          </Badge>
                        </td>
                        <td className="px-4 py-5 text-center">
                          {isScheduled ? (
                            <span className="text-[9px] font-black uppercase text-cream/20 tracking-widest">
                              SCHEDULED
                            </span>
                          ) : daysAway === 0 ? (
                            <span className="text-[9px] font-black uppercase text-success tracking-widest animate-pulse">
                              ACTIVE_RING
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase text-gold/40 tracking-widest text-center">
                              CATALOG_OPEN
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-5 text-right font-mono text-xs tabular-nums">
                          {isScheduled ? (
                            <span className="text-cream/20 italic uppercase text-[9px]">TBD</span>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-cream/60">
                                {sale.lots.filter((l) => !l.withdrawn).length} LOTS
                              </span>
                              {playerLots.length > 0 && (
                                <span className="text-[8px] text-success font-black uppercase">
                                  INC_{playerLots.length}_ASSET
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          {isScheduled ? (
                            <Button
                              disabled
                              size="sm"
                              variant="ghost"
                              className="h-8 px-4 text-[9px] font-black uppercase border border-white/5 opacity-20"
                            >
                              PENDING
                            </Button>
                          ) : (
                            <Link to="/auction/$saleId" params={{ saleId: sale.id }}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={cn(
                                  "h-8 px-4 text-[9px] font-black uppercase border border-white/10 hover:border-gold/40 hover:text-gold transition-all rounded-none",
                                  daysAway === 0
                                    ? "border-success text-success bg-success/5"
                                    : "text-cream/40",
                                )}
                              >
                                {daysAway === 0 ? "ENTER_RING" : "VIEW_CATALOG"}
                              </Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

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
  if (horse.gender === "mare") return `Broodmare (${Math.floor(horse.age)})`;
  return `${Math.floor(horse.age)}YO`;
}
