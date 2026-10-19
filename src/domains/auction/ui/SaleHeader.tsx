/**
 * SaleHeader.tsx - Auction sale header display
 *
 * Displays sale name, status badge, market class, lot count, season day
 * and available capital. Extracted from auction.$saleId.tsx.
 */

import { Badge } from "@/shared/ui/badge";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/shared/common/formatting";
import { KIND_LABELS } from "@/domains/auction/application/auctionFacade";
import { NumericValue } from "@/domains/horse/ui/HorseBits";
import { cn } from "@/shared/lib/cn";
import type { AuctionSale } from "@/platform/game/types";
import { resolveSaleHouse } from "@/domains/prestige/application/prestigeFacade";
import { PrestigeBadge } from "@/domains/prestige/ui/PrestigeBadge";
import { SalePrestigeBreakdown } from "@/domains/prestige/ui/PrestigeBreakdownPanel";

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
  const house = resolveSaleHouse(sale);
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-primary/20 pb-6">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-foreground/30 hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-3 w-3" /> Exchange Overview
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tighter text-foreground font-[family-name:var(--font-display)] uppercase">
            {sale.name}
          </h1>
          <Badge
            className={cn(
              "rounded-none font-black text-[10px] tracking-wide px-3 h-6",
              isResolved
                ? "bg-slate-800 text-foreground/40"
                : "bg-primary text-slate-950 shadow-[0_0_15px_var(--border)]",
            )}
          >
            {isResolved ? "Resolved" : "Active"}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-wide text-foreground/40">
          <span>
            Market Class:{" "}
            <span className="text-primary/30">{KIND_LABELS[sale.kind] ?? sale.kind}</span>
          </span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>
            Lot Count: <NumericValue value={activeLotCount} />
          </span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>
            Season Day: <NumericValue value={sale.day} />
          </span>
          {house && (
            <>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>
                House: <span className="text-primary/30">{house.name}</span>
              </span>
              <PrestigeBadge score={house.prestige} />
            </>
          )}
        </div>
        {house && <p className="mt-2 text-xs text-foreground/40 max-w-xl italic">{house.blurb}</p>}
        {house && <SalePrestigeBreakdown house={house} variant="compact" className="mt-3" />}
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="text-[10px] font-mono text-foreground/20 uppercase tracking-wide">
          Available Capital
        </div>
        <div className="text-2xl font-black font-mono text-success tabular-nums tracking-tighter">
          {formatCurrency(cash)}
        </div>
      </div>
    </div>
  );
}
