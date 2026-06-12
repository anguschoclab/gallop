/**
 * LotDetailPanel.tsx - Auction lot detail display
 *
 * Shows horse portrait, pedigree, technical specs, and scouting report.
 * Extracted from auction.$saleId.tsx.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, ShieldCheck } from "lucide-react";
import { HorsePortrait } from "@/components/horse/HorsePortrait";
import { genderSymbol } from "@/core/horse/gender";
import { formatCurrency } from "@/core/common/formatting";
import { cn } from "@/lib/cn";
import type { AuctionLot, Horse, Stable } from "@/game/types";

interface LotDetailPanelProps {
  lot: AuctionLot;
  horse: Horse;
  consignor: Stable | undefined;
  displayStats: Record<string, number> | null;
  displayOverallEstimate: number | undefined;
  isResolved: boolean;
  isPlayerLeading: boolean;
  isPlayerConsigned: boolean;
  lotIndex: number;
  totalLots: number;
}

export function LotDetailPanel({
  lot,
  horse,
  consignor,
  displayStats,
  displayOverallEstimate,
  isResolved,
  isPlayerLeading,
  isPlayerConsigned,
  lotIndex,
  totalLots,
}: LotDetailPanelProps) {
  return (
    <div className="bg-slate-900/60 border border-white/5 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-gold/40" />

      <div className="bg-black/40 px-8 py-4 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-center bg-gold/10 border border-gold/20 p-2 min-w-[60px]">
            <div className="text-[8px] font-black uppercase text-gold/40 tracking-tighter leading-none mb-1">
              Lot_ID
            </div>
            <div className="text-xl font-black font-mono text-gold leading-none tabular-nums">
              #{String(lotIndex + 1).padStart(3, "0")}
            </div>
          </div>
          <div className="space-y-0.5">
            <h2 className="text-4xl font-black text-cream font-[family-name:var(--font-display)] uppercase tracking-tight group-hover:text-gold transition-colors">
              {horse.name}
            </h2>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-cream/40">
              <span>
                {genderSymbol(horse.gender)} {horse.gender}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>Age {Math.floor(horse.age)}</span>
              {horse.hemisphere === "Southern" && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-blue-400/60">S. Hemi.</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lot.passed && (
            <Badge
              variant="secondary"
              className="rounded-none font-black text-[10px] tracking-widest h-8 px-4 bg-destructive/10 text-destructive border-destructive/20 uppercase"
            >
              Reserve not met
            </Badge>
          )}
          {!lot.passed && !isResolved && isPlayerLeading && (
            <Badge className="bg-success text-slate-950 rounded-none font-black text-[10px] tracking-widest h-8 px-4 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              Leading Bidder
            </Badge>
          )}
          {!lot.passed && lot.soldToStableId && isResolved && (
            <div className="text-right">
              <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest mb-1">
                Acquired_By
              </div>
              <Badge
                variant="outline"
                className="border-gold/30 text-gold font-black text-[9px] uppercase tracking-widest h-6 rounded-none px-3 bg-gold/5"
              >
                {consignor?.name?.toUpperCase() ?? "Unknown"}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
          {/* Portrait & Pedigree */}
          <div className="md:col-span-5 space-y-6">
            <div className="aspect-square bg-slate-950 border border-white/5 p-4 flex items-center justify-center relative shadow-inner">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]]" />
              <HorsePortrait
                id={horse.id}
                coatColor={horse.coatColor}
                markings={horse.markings}
                gender={horse.gender}
                appearance={horse.appearance}
                size="lg"
              />
              <div className="absolute bottom-4 left-4 bg-black/80 border border-white/10 px-2 py-1 flex items-center gap-2 shadow-xl">
                <ShieldCheck className="h-3 w-3 text-gold/40" />
                <span className="text-[8px] font-mono text-gold-muted/60 uppercase tracking-widest">
                  Confirmed
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1 px-1">
                <TrendingUp className="h-3.5 w-3.5 text-pink-500/60" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40">
                  Pedigree Analysis
                </h3>
              </div>
              <Card className="bg-black/20 border-white/5 rounded-none border-l border-l-pink-500/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="space-y-0.5 flex-1">
                      <div className="text-[8px] font-black uppercase text-pink-500/40 tracking-widest">
                        Sire Line
                      </div>
                      <div className="text-xs font-bold text-cream uppercase">
                        {horse.sireName || "UNKNOWN"}
                      </div>
                    </div>
                    <div className="space-y-0.5 flex-1 border-l border-white/5 pl-4">
                      <div className="text-[8px] font-black uppercase text-pink-500/40 tracking-widest">
                        Dam Line
                      </div>
                      <div className="text-xs font-bold text-cream uppercase">
                        {horse.damName || "UNKNOWN"}
                      </div>
                    </div>
                  </div>
                  {horse.bruceLoweFamily && (
                    <div className="pt-2 border-t border-white/5">
                      <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest">
                        Bruce Lowe Family
                      </div>
                      <div className="text-xs font-mono font-bold text-pink-400">
                        FAMILY_0{horse.bruceLoweFamily}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Technical Specs */}
          <div className="md:col-span-7 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-1 px-1">
                <FileText className="h-3.5 w-3.5 text-gold/60" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40">
                  Technical Specifications
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(["conformation", "temperament", "coatColor", "runningStyle"] as const).map(
                  (spec) => (
                    <div key={spec} className="bg-black/20 p-3 border border-white/5">
                      <div className="text-[8px] font-black uppercase text-cream/20 tracking-tighter mb-1 leading-none">
                        {spec.replace(/([A-Z])/g, "_$1").toUpperCase()}
                      </div>
                      <div className="text-xs font-mono font-bold text-cream/80 uppercase">
                        {horse[spec]?.toString().replace("-", " ") || "—"}
                      </div>
                    </div>
                  ),
                )}
                <div className="bg-black/20 p-3 border border-white/5">
                  <div className="text-[8px] font-black uppercase text-cream/20 tracking-tighter mb-1 leading-none">
                    PREF_DISTANCE
                  </div>
                  <div className="text-xs font-mono font-bold text-cream/80 uppercase">
                    {Math.round(horse.distanceAptitude)}m
                  </div>
                </div>
                <div className="bg-black/20 p-3 border border-white/5">
                  <div className="text-[8px] font-black uppercase text-cream/20 tracking-tighter mb-1 leading-none">
                    BEST_SURFACE
                  </div>
                  <div className="text-xs font-mono font-bold text-cream/80 uppercase">
                    {(() => {
                      const best = Object.entries(
                        horse.surfaceAptitude || ({} as Record<string, number>),
                      ).sort((a, b) => b[1] - a[1])[0];
                      return best ? `${best[0]} (${Math.round(best[1])})` : "—";
                    })()}
                  </div>
                </div>
              </div>

              {/* Scouting Report */}
              {displayStats && (
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[8px] font-black uppercase text-gold/40 tracking-widest">
                      Scouting Report
                    </div>
                    {displayOverallEstimate && (
                      <Badge
                        variant="outline"
                        className="border-gold/20 text-gold font-mono text-[9px] h-5 rounded-none px-2 uppercase"
                      >
                        Est_OVR: {displayOverallEstimate}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {Object.entries(displayStats).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between border-b border-white/5 pb-1"
                      >
                        <span className="text-[9px] font-mono text-cream/20 uppercase tracking-tighter">
                          {key}
                        </span>
                        <span className="text-xs font-mono font-black text-cream/60 tabular-nums">
                          {String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
