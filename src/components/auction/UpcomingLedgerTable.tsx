import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { KIND_LABELS } from "@/core/auction/data";
import { cn } from "@/lib/cn";
import { CalendarIcon } from "lucide-react";
import { resolveSaleHouse } from "@/core/prestige";
import type { AuctionSaleKind } from "@/core/market/types";
import { PrestigeBadge } from "@/components/shared/PrestigeBadge";

interface UpcomingSale {
  id: string;
  name: string;
  kind: string;
  day: number;
  lots: Array<{ consignorStableId?: string; withdrawn?: boolean }>;
  resolved: boolean;
  isScheduled?: true;
  houseId?: string;
}

interface UpcomingLedgerTableProps {
  sales: UpcomingSale[];
  currentDay: number;
  saleAccessMap?: Map<string, { allowed: boolean; requiredTier: string }>;
}

export function UpcomingLedgerTable({
  sales,
  currentDay,
  saleAccessMap,
}: UpcomingLedgerTableProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <CalendarIcon className="h-3.5 w-3.5 text-cream/40" />
        <h2 className="text-[10px] font-black uppercase tracking-wide text-cream/40">
          Upcoming Exchange Windows
        </h2>
      </div>
      <div className="border border-white/5 bg-slate-900/20 shadow-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-black/40 border-b border-white/10">
            <tr className="font-mono text-[9px] uppercase tracking-wide text-gold-muted/60">
              <th className="px-6 py-4 font-black">Window Designation</th>
              <th className="px-4 py-4 font-black">Category</th>
              <th className="px-4 py-4 font-black text-center">Status</th>
              <th className="px-4 py-4 font-black text-right">Enter</th>
              <th className="px-6 py-4 font-black text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sales.map((sale) => {
              const daysAway = sale.day - currentDay;
              const isScheduled = sale.isScheduled;
              const playerLots = sale.lots
                ? sale.lots.filter((l) => !l.consignorStableId && !l.withdrawn)
                : [];
              const access = saleAccessMap?.get(sale.kind);
              const isLocked = access && !access.allowed;
              const house = resolveSaleHouse({
                houseId: sale.houseId,
                kind: sale.kind as AuctionSaleKind,
              });

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
                        {house && <> · {house.shortName}</>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[8px] h-4 font-black uppercase tracking-tighter border-white/10 text-cream/40 rounded-none"
                      >
                        {KIND_LABELS[sale.kind as keyof typeof KIND_LABELS] ?? sale.kind}
                      </Badge>
                      {house && <PrestigeBadge score={house.prestige} showScore={false} />}
                    </div>
                  </td>
                  <td className="px-4 py-5 text-center">
                    {isLocked ? (
                      <span className="text-[9px] font-black uppercase text-amber-400/60 tracking-wide">
                        Locked
                      </span>
                    ) : isScheduled ? (
                      <span className="text-[9px] font-black uppercase text-cream/20 tracking-wide">
                        SCHEDULED
                      </span>
                    ) : daysAway === 0 ? (
                      <span className="text-[9px] font-black uppercase text-success tracking-wide animate-pulse">
                        Live Now
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase text-gold/40 tracking-wide text-center">
                        Accepting lots
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-5 text-right font-mono text-xs tabular-nums">
                    {isScheduled ? (
                      <span className="text-cream/20 italic uppercase text-[9px]">TBD</span>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-cream/60">
                          {sale.lots.reduce((n, l) => (l.withdrawn ? n : n + 1), 0)} LOTS
                        </span>
                        {playerLots.length > 0 && (
                          <span className="text-[8px] text-success font-black uppercase">
                            +{playerLots.length} of yours
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    {isLocked ? (
                      <div className="flex flex-col items-end gap-1">
                        <Button
                          disabled
                          size="sm"
                          variant="ghost"
                          className="h-8 px-4 text-[9px] font-black uppercase border border-amber-400/20 text-amber-400/40 rounded-none"
                        >
                          RESTRICTED
                        </Button>
                        <span className="text-[8px] font-mono text-amber-400/40 uppercase">
                          Requires {access?.requiredTier}
                        </span>
                      </div>
                    ) : isScheduled ? (
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
                          {daysAway === 0 ? "Enter Sale" : "View Lots"}
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
  );
}
