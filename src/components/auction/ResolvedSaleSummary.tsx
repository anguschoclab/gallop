/**
 * ResolvedSaleSummary.tsx - Post-auction sale statistics
 *
 * Shows summary statistics for resolved auctions.
 * Extracted from auction.$saleId.tsx.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/core/common/formatting";
import type { AuctionLot, Horse } from "@/game/types";

interface ResolvedSaleSummaryProps {
  activeLots: AuctionLot[];
  horseMap: Map<string, Horse>;
}

export function ResolvedSaleSummary({ activeLots, horseMap }: ResolvedSaleSummaryProps) {
  const soldCount = activeLots.filter((l) => !l.passed && l.hammerPrice).length;
  const passedCount = activeLots.filter((l) => l.passed).length;
  const topLot = activeLots
    .filter((l) => l.hammerPrice && !l.passed)
    .sort((a, b) => (b.hammerPrice ?? 0) - (a.hammerPrice ?? 0))[0];
  const topHorse = topLot ? horseMap.get(topLot.horseId) : undefined;

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-t-2 border-t-gold/40">
      <CardHeader className="bg-black/20 border-b border-white/5">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.4em] text-gold-muted/60">
          Sale Exchange Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-1">
            <div className="text-[9px] font-black uppercase text-cream/20 tracking-widest">
              Total Lots
            </div>
            <div className="text-xl font-black font-mono text-cream tabular-nums">
              {activeLots.length}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[9px] font-black uppercase text-cream/20 tracking-widest">
              Lots Sold
            </div>
            <div className="text-xl font-black font-mono text-success tabular-nums">
              {soldCount}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[9px] font-black uppercase text-cream/20 tracking-widest">
              Reserve Passed
            </div>
            <div className="text-xl font-black font-mono text-destructive/60 tabular-nums">
              {passedCount}
            </div>
          </div>
          {topLot && (
            <div className="space-y-1">
              <div className="text-[9px] font-black uppercase text-gold/40 tracking-widest">
                Top Valuation
              </div>
              <div className="text-xl font-black font-mono text-gold-bright tabular-nums">
                {formatCurrency(topLot.hammerPrice!)}
              </div>
              <div className="text-[8px] font-mono text-gold-muted/40 uppercase tracking-tighter truncate">
                {topHorse?.name}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
