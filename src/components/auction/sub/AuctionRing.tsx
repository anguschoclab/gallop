/**
 * AuctionRing.tsx - Visual component for the auction lot
 *
 * Displays the horse portrait, lot metadata, and the phase strip.
 */

import { HorsePortrait } from "@/components/HorsePortrait";
import { Badge } from "@/components/ui/badge";
import { genderSymbol } from "@/core/horse/gender";
import { formatCurrency } from "@/lib/formatting";
import { PHASES, chantToPhaseIndex } from "./auctionPhaseStrip";
import { cn } from "@/lib/utils";
import type { Horse, AuctionLot } from "@/game/types";
import type { ChantPhase } from "@/game/auctionRunner";

interface AuctionRingProps {
  horse: Horse | undefined;
  lot: AuctionLot | undefined;
  chant: ChantPhase | undefined;
  lotIndex: number;
  totalLots: number;
  scoutOverall?: string;
}

export function AuctionRing({
  horse,
  lot,
  chant,
  lotIndex,
  totalLots,
  scoutOverall,
}: AuctionRingProps) {
  if (!horse || !lot) return null;

  const currentPhaseIndex = chantToPhaseIndex(chant ?? "open");

  return (
    <div className="flex flex-col gap-6">
      {/* Lot Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Lot {lotIndex + 1} of {totalLots}
          </span>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
            {horse.name}
            <span className="text-muted-foreground font-medium text-xl">
              {genderSymbol(horse.gender)}
            </span>
          </h2>
        </div>
        {scoutOverall && (
          <Badge variant="outline" className="h-fit px-3 py-1 font-mono text-lg border-primary/30">
            {scoutOverall}
          </Badge>
        )}
      </div>

      {/* Main Ring Display */}
      <div className="relative group overflow-hidden rounded-3xl border-4 border-primary/20 bg-muted/30 aspect-[4/3] flex items-center justify-center shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />
        <HorsePortrait
          appearance={horse.appearance}
          className="w-[85%] h-[85%] drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-700 group-hover:scale-105"
        />

        {/* Phase Strip Overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-xl">
          {PHASES.map((p, idx) => (
            <div
              key={p.id}
              className={cn(
                "h-2 w-10 rounded-full transition-all duration-500",
                idx < currentPhaseIndex
                  ? "bg-primary/40"
                  : idx === currentPhaseIndex
                    ? "bg-primary w-16 shadow-[0_0_15px_rgba(var(--primary),0.6)]"
                    : "bg-white/10",
              )}
            />
          ))}
        </div>
      </div>

      {/* Breeding / Info Footer */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/50">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Pedigree</div>
          <div className="text-sm font-semibold truncate">
            {horse.sireName || "Unknown"} × {horse.damName || "Unknown"}
          </div>
        </div>
        {lot.breezeSeconds && (
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
            <div className="text-[10px] uppercase font-bold text-primary/70 mb-1">Breeze Time</div>
            <div className="text-lg font-black tracking-tight text-primary">
              {lot.breezeSeconds.toFixed(2)}s
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
