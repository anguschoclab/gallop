/**
 * AuctionSummary.tsx - Post-sale summary component
 *
 * Displays a detailed breakdown of acquisitions, sales, and top performers
 * after an auction concludes.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import { commissionAmount } from "@/game/auction/engine";
import type { useScoreboard } from "@/hooks/auction/useScoreboard";
import type { AuctionSale } from "@/game/types";

interface AuctionSummaryProps {
  sale: AuctionSale;
  scoreboard: ReturnType<typeof useScoreboard>;
  onClose: () => void;
}

export function AuctionSummary({ sale, scoreboard, onClose }: AuctionSummaryProps) {
  const sb = scoreboard;
  if (!sb) return null;

  return (
    <Card className="max-w-2xl mx-auto shadow-2xl border-2 border-primary/10 overflow-hidden animate-in zoom-in-95 duration-300">
      <CardHeader className="text-center pb-6 bg-primary/5 border-b border-primary/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="relative z-10">
          <Trophy className="h-12 w-12 mx-auto text-warning drop-shadow-[0_0_15px_rgba(255,193,7,0.3)] mb-2" />
          <CardTitle className="text-3xl font-black tracking-tight">{sale.name}</CardTitle>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">
            Sale Concluded
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-8">
        <div className="grid grid-cols-2 gap-4">
          <SummaryStat label="Lots acquired" value={String(sb.won)} />
          <SummaryStat label="Total spent" value={formatCurrency(sb.spent)} />
          <SummaryStat label="Lots sold" value={String(sb.sold)} />
          <SummaryStat
            label="Net received"
            value={formatCurrency(sb.netReceived)}
            hint={sb.sold > 0 ? `after commission` : undefined}
          />
        </div>

        <div className="space-y-3">
          {sb.topAcquisition && (
            <div className="rounded-2xl border border-success/20 bg-success/5 p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] uppercase font-bold text-success/70 tracking-widest mb-1">
                  Top acquisition
                </p>
                <p className="font-bold text-lg">{sb.topAcquisition.name}</p>
              </div>
              <p className="text-xl font-black tabular-nums text-success">
                {formatCurrency(sb.topAcquisition.price)}
              </p>
            </div>
          )}

          {sb.topSale && (
            <div className="rounded-2xl border border-warning/20 bg-warning/5 p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] uppercase font-bold text-warning/70 tracking-widest mb-1">
                  Best sale
                </p>
                <p className="font-bold text-lg">{sb.topSale.name}</p>
              </div>
              <p className="text-xl font-black tabular-nums text-warning">
                {formatCurrency(sb.topSale.price)}
              </p>
            </div>
          )}
        </div>

        <Button
          size="lg"
          className="w-full h-16 text-lg font-black rounded-2xl shadow-xl"
          onClick={onClose}
        >
          Return to Sales
        </Button>
      </CardContent>
    </Card>
  );
}

function SummaryStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 shadow-sm transition-all hover:bg-muted/30">
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">
        {label}
      </p>
      <p className="text-2xl font-black tabular-nums text-foreground">{value}</p>
      {hint && (
        <p className="text-[10px] text-muted-foreground/70 font-medium mt-1 italic">{hint}</p>
      )}
    </div>
  );
}
