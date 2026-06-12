/**
 * SaleHeader.tsx - Auction sale header display
 *
 * Displays sale name, status badge, market class, lot count, season day
 * and available capital. Extracted from auction.$saleId.tsx.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";
import { KIND_LABELS } from "@/core/auction/data";
import { NumericValue } from "@/components/horse/HorseBits";
import { cn } from "@/lib/cn";
import type { AuctionSale } from "@/game/types";

interface SaleHeaderProps {
  sale: AuctionSale;
  isResolved: boolean;
  isSaleDay: boolean;
  activeLotCount: number;
  cash: number;
  onBack: () => void;
}

export function SaleHeader({
  sale,
  isResolved,
  isSaleDay,
  activeLotCount,
  cash,
  onBack,
}: SaleHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gold/20 pb-6">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cream/30 hover:text-gold transition-colors mb-4"
        >
          <ArrowLeft className="h-3 w-3" /> Exchange Overview
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)] uppercase">
            {sale.name}
          </h1>
          <Badge
            className={cn(
              "rounded-none font-black text-[10px] tracking-widest px-3 h-6",
              isResolved
                ? "bg-slate-800 text-cream/40"
                : "bg-gold text-slate-950 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
            )}
          >
            {isResolved ? "Resolved" : "Active"}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
          <span>
            Market Class:{" "}
            <span className="text-gold-muted">{KIND_LABELS[sale.kind] ?? sale.kind}</span>
          </span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>
            Lot Count: <NumericValue value={activeLotCount} />
          </span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>
            Season Day: <NumericValue value={sale.day} />
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="text-[10px] font-mono text-cream/20 uppercase tracking-widest">
          Available_Capital
        </div>
        <div className="text-2xl font-black font-mono text-success tabular-nums tracking-tighter">
          {formatCurrency(cash)}
        </div>
      </div>
    </div>
  );
}
