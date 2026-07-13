import { Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { Badge } from "@/components/ui/badge";
import { HorseStats, overall, NumericValue } from "@/components/horse/HorseBits";
import { formatCurrency } from "@/core/common/formatting";
import { horseMarketValue } from "@/core/horse/pricing";
import { useGameWithShallow } from "@/game/store";
import { SilkDot } from "@/components/SilkDot";
import { cn } from "@/lib/cn";
import type { Horse, GameState } from "@/game/types";
import { HardDrive } from "lucide-react";

interface BloodstockGridProps {
  market: Horse[];
  cash: number;
  buyHorse: (horseId: string) => void;
}

export function BloodstockGrid({ market, cash, buyHorse }: BloodstockGridProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {market.map((h: Horse) => {
        const price = horsePrice(h);
        const ovr = overall(h);
        const canAfford = cash >= price;

        return (
          <Card
            key={h.id}
            className="bg-slate-900/40 border-white/5 rounded-none relative overflow-hidden group hover:border-white/20 transition-all duration-300 shadow-xl cursor-pointer"
            onClick={() => navigate({ to: "/stable/$horseId", params: { horseId: h.id } })}
          >
            <div className="absolute top-0 left-0 w-full h-0.5 bg-white/5 group-hover:bg-success/40 transition-colors" />

            <div className="absolute top-2 right-2 z-10">
              <BookmarkButton
                type="horse"
                id={h.id}
                label={h.name}
                subtitle={`Age ${Math.floor(h.age)} · ${h.gender}`}
              />
            </div>

            <CardContent className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <SilkDot color={h.silk} size="md" />
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-xl font-black text-cream font-[family-name:var(--font-display)] uppercase tracking-tight group-hover:text-success transition-colors truncate">
                      {h.name}
                    </h3>
                    <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-widest text-cream/30">
                      <span>Age: {Math.floor(h.age)}</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span>OVR: {ovr}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-black uppercase text-success/40 tracking-widest leading-none mb-1">
                    Price
                  </div>
                  <div
                    className={cn(
                      "text-xl font-black font-mono tracking-tighter tabular-nums",
                      canAfford ? "text-success" : "text-destructive/60",
                    )}
                  >
                    {formatCurrency(price)}
                  </div>
                </div>
              </div>

              <div className="bg-black/40 p-3 rounded border border-white/5">
                <HorseStats horse={h} />
              </div>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  buyHorse(h.id);
                }}
                disabled={!canAfford}
                className={cn(
                  "w-full h-10 uppercase text-[10px] font-black tracking-[0.2em] rounded-none transition-all",
                  canAfford
                    ? "bg-success hover:bg-success-dark text-slate-950 shadow-lg"
                    : "border-white/5 text-cream/20 bg-transparent",
                )}
              >
                {canAfford ? "Buy" : "Can't afford"}
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {market.length === 0 && (
        <div className="col-span-full p-32 text-center border-2 border-dashed border-white/5 bg-black/10">
          <HardDrive className="h-16 w-16 mx-auto mb-6 text-cream/5" />
          <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
            Market Transmission Offline
          </p>
          <p className="text-[10px] font-mono text-cream/10 uppercase mt-2">
            Zero units detected in bloodstock exchange. Check next cycle.
          </p>
        </div>
      )}
    </div>
  );
}
