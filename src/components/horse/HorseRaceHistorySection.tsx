import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GradedHistoryPanel } from "@/components/horse/GradedHistoryPanel";
import { cn } from "@/lib/cn";
import type { Horse } from "@/game/types";

interface HorseRaceHistorySectionProps {
  horse: Horse;
  raceHistoryLimit: number;
  onLimitChange: (val: number) => void;
}

export function HorseRaceHistorySection({
  horse,
  raceHistoryLimit,
  onLimitChange,
}: HorseRaceHistorySectionProps) {
  const history = [...(horse.raceHistory ?? [])].sort((a, b) => b.day - a.day);
  const displayed = history.slice(0, raceHistoryLimit);

  return (
    <section id="history" className="space-y-4 pt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-gold" />
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
            Service History
          </h2>
        </div>
        <Select value={String(raceHistoryLimit)} onValueChange={(v) => onLimitChange(Number(v))}>
          <SelectTrigger className="h-7 w-20 text-[10px] font-mono border-white/10 bg-black/40 rounded-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">Last 10</SelectItem>
            <SelectItem value="20">Last 20</SelectItem>
            <SelectItem value="50">Last 50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <GradedHistoryPanel history={horse.raceHistory ?? []} />

      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-gold">
        <CardContent className="p-0">
          {displayed.length === 0 ? (
            <div className="p-12 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
              No race records on file.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {displayed.map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <span
                    className={cn(
                      "text-[10px] font-black font-mono w-5 text-center",
                      r.position === 1
                        ? "text-gold"
                        : r.position <= 3
                          ? "text-cream/60"
                          : "text-cream/20",
                    )}
                  >
                    {r.position}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-cream truncate">{r.raceName}</div>
                    <div className="text-[10px] font-mono text-cream/30">Day {r.day}</div>
                  </div>
                  {r.grade && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] rounded-none",
                        r.grade === "G1"
                          ? "border-gold text-gold"
                          : r.grade === "G2"
                            ? "border-silver text-silver"
                            : "border-white/20 text-cream/60",
                      )}
                    >
                      {r.grade}
                    </Badge>
                  )}
                  {typeof r.beyer === "number" && (
                    <span className="font-mono text-[10px] text-gold-bright">{r.beyer}</span>
                  )}
                  {typeof r.gate === "number" && (
                    <span className="text-[10px] font-mono text-cream/30">G{r.gate}</span>
                  )}
                  <span className="text-[10px] font-mono text-cream/30">{r.surface ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
