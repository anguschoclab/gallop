import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { KIND_LABELS } from "@/game/auction/data";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

interface UpcomingSale {
  id: string;
  name: string;
  kind: string;
  day: number;
  lots: Array<{ consignorStableId?: string; withdrawn?: boolean }>;
  resolved: false;
  isScheduled?: true;
}

interface UpcomingLedgerTableProps {
  sales: UpcomingSale[];
  currentDay: number;
}

export function UpcomingLedgerTable({ sales, currentDay }: UpcomingLedgerTableProps) {
  return (
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
            {sales.map((sale) => {
              const daysAway = sale.day - currentDay;
              const isScheduled = sale.isScheduled;
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
                        Live Now
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase text-gold/40 tracking-widest text-center">
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
