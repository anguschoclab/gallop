import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { BeyerChart } from "@/components/race/BeyerChart";
import { PaceProfileSummary } from "@/components/race/PaceProfileSummary";
import { DistanceAptitudeDrift } from "@/components/horse/DistanceAptitudeDrift";

interface HorseAnalyticsSectionProps {
  horse: any;
  peakingMultiplier: number;
}

export function HorseAnalyticsSection({ horse, peakingMultiplier }: HorseAnalyticsSectionProps) {
  return (
    <section id="beyer" className="space-y-4 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-4 w-4 text-fame" />
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
          Beyer Performance Analysis
        </h2>
      </div>
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-fame">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-black/40 px-3 py-1.5 border border-white/5">
              <div className="text-[9px] font-black uppercase text-cream/20 tracking-widest mb-0.5">
                Form Multiplier
              </div>
              <div className="font-mono text-sm font-bold text-gold">
                ×{peakingMultiplier.toFixed(2)}
              </div>
            </div>
          </div>
          <BeyerChart history={horse.raceHistory ?? []} />

          {(horse.raceHistory ?? []).some(
            (h: any) => h.pacePositions && h.pacePositions.length > 0,
          ) && (
            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="text-[10px] font-black uppercase text-fame/40 tracking-widest">
                Pace Profile
              </div>
              <PaceProfileSummary horse={horse} />
            </div>
          )}

          {(horse.raceHistory ?? []).length > 0 && (
            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="text-[10px] font-black uppercase text-fame/40 tracking-widest">
                Distance Aptitude Drift
              </div>
              <DistanceAptitudeDrift horse={horse} />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
