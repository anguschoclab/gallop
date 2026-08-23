import { Card, CardContent } from "@/components/ui/card";
import { Activity, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Horse } from "@/game/types";
import { formatRecoveryDays } from "@/core/health/injuryDisplay";

interface HorseConditionSectionProps {
  horse: Horse;
}

export function HorseConditionSection({ horse }: HorseConditionSectionProps) {
  return (
    <section id="health" className="space-y-4 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-4 w-4 text-blue-400" />
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
          Condition Report
        </h2>
      </div>
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
        <CardContent className="p-6 space-y-6">
          {horse.activeInjury && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 relative overflow-hidden group transition-all">
              <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-destructive tracking-widest flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" /> Injury
                </span>
                <span className="font-mono text-[10px] text-destructive/60">
                  Est.{" "}
                  {formatRecoveryDays(horse.activeInjury.recoveryDays, horse.activeInjury.severity)}
                </span>
              </div>
              <div className="text-sm font-bold text-cream uppercase tracking-tight">
                {horse.activeInjury.type}
              </div>
              <p className="text-[10px] text-cream/40 italic mt-1 uppercase">
                {horse.activeInjury.severity === "career-ending"
                  ? "Career-ending injury. Racing prohibited."
                  : "Immediate medical intervention required. Performance locked."}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 p-3 border border-white/5">
              <div className="text-[9px] font-black uppercase text-blue-400/40 tracking-tighter mb-1 leading-none">
                Fitness (Chronic)
              </div>
              <div className="flex items-end gap-2">
                <span className="text-xl font-bold font-mono text-cream tabular-nums leading-none">
                  {Math.round(horse.fitness ?? 0)}
                </span>
                <span className="text-[9px] text-cream/20 font-mono uppercase pb-0.5">/100</span>
              </div>
            </div>
            <div className="bg-black/40 p-3 border border-white/5">
              <div className="text-[9px] font-black uppercase text-blue-400/40 tracking-tighter mb-1 leading-none">
                Fatigue (Acute)
              </div>
              <div className="flex items-end gap-2">
                <span className="text-xl font-bold font-mono text-warning tabular-nums leading-none">
                  {Math.round(horse.fatigue ?? 0)}
                </span>
                <span className="text-[9px] text-cream/20 font-mono uppercase pb-0.5">/100</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-[10px] font-black uppercase text-blue-400/40 tracking-widest px-1">
              Genetic Vulnerabilities
            </div>
            <div className="space-y-1.5">
              {(["bleederRisk", "roarerRisk", "ocdRisk"] as const).map((risk) => {
                const val = horse[risk];
                return (
                  <div
                    key={risk}
                    className="flex items-center justify-between text-[11px] font-mono p-2 bg-black/20 rounded"
                  >
                    <span className="text-cream/60 uppercase tracking-tighter">
                      {risk.replace("Risk", "")}_SENSITIVITY
                    </span>
                    <span
                      className={cn(
                        "font-bold",
                        val > 70
                          ? "text-destructive"
                          : val > 30
                            ? "text-warning"
                            : "text-success/60",
                      )}
                    >
                      {val > 70 ? "HIGH" : val > 30 ? "MOD" : "LOW"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
