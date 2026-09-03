import { Link } from "@tanstack/react-router";
import { formatCurrency } from "@/core/common/formatting";
import { HardDrive } from "lucide-react";
import type { AuctionSale } from "@/game/types";

interface TransactionArchiveProps {
  pastSales: AuctionSale[];
}

export function TransactionArchive({ pastSales }: TransactionArchiveProps) {
  if (pastSales.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <HardDrive className="h-3.5 w-3.5 text-cream/30" />
        <h2 className="text-[10px] font-black uppercase tracking-wide text-cream/40">
          Transaction Archive
        </h2>
      </div>
      <div className="space-y-2">
        {pastSales.slice(0, 5).map((sale) => {
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
                  <span className="text-[9px] font-mono text-cream/20 uppercase">Completed</span>
                </div>
                {topLot && (
                  <div className="flex justify-between items-center text-[9px] font-mono text-cream/40">
                    <span>Top Lot</span>
                    <span className="text-success">{formatCurrency(topLot.hammerPrice!)}</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
