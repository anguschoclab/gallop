import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { HorseStats } from "@/components/horse/HorseBits";
import { HorseStatsRadar } from "@/components/horse/HorseStatsRadar";
import { cn } from "@/lib/cn";

interface HorseIdentitySectionProps {
  horse: any;
  peakingStatus: string;
}

export function HorseIdentitySection({ horse, peakingStatus }: HorseIdentitySectionProps) {
  return (
    <section id="stats" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-gold" />
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">Equipment</h2>
      </div>
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-gold">
        <CardContent className="p-6 space-y-6">
          <div className="bg-black/40 p-2 rounded-lg border border-white/5">
            <HorseStatsRadar horse={horse} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Aptitude Metrics</span>
              <span>Level</span>
            </div>
            <HorseStats horse={horse} />
          </div>

          <div className="pt-4 border-t border-white/5 space-y-3">
            <div className="text-[10px] font-black uppercase text-gold/40 tracking-widest px-1">
              Training Bias
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase border-white/10 text-cream/60"
                >
                  STYLE: {horse.runningStyle?.toUpperCase() || "NA"}
                </Badge>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase border-white/10 text-cream/60"
                >
                  DIST: {Math.round(horse.distanceAptitude)}m
                </Badge>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase border-white/10 text-cream/60"
                >
                  SURF:{" "}
                  {(() => {
                    const entries: [string, number][] = Object.entries(
                      horse.surfaceAptitude || {},
                    );
                    const best = entries.sort((a, b) => b[1] - a[1])[0];
                    return best ? `${best[0]} (${Math.round(best[1])})` : "—";
                  })()}
                </Badge>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase border-white/10 text-cream/60"
                >
                  FORM: {horse.form > 0 ? "+" : ""}
                  {horse.form}
                </Badge>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase border-white/10 text-cream/60"
                >
                  WEATHER: {(horse.weatherPreference ?? "all").toUpperCase()}
                </Badge>
                <Badge
                  className={cn(
                    "font-mono text-[10px] uppercase",
                    peakingStatus === "Peak"
                      ? "bg-fame text-slate-950"
                      : "bg-black/40 text-cream/60 border border-white/5",
                  )}
                >
                  PHASE: {peakingStatus.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
