/**
 * NpcCareerTrackerPanel.tsx - Career progression for a rival stable's roster.
 * Shows each horse's career stage, record, earnings and days since its last run,
 * including starts simulated off-screen by the career tracker.
 */
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartCard, MiniBar, chartColors, formatCurrencyCompact } from "@/components/charts";
import { summarizeNpcCareer, careerStageLabel } from "@/services/npc/npcFacade";
import type { NpcCareerStage } from "@/game/types";
import type { Horse } from "@/game/types";
import { cn } from "@/lib/cn";

interface NpcCareerTrackerPanelProps {
  horses: Horse[];
  day: number;
}

const STAGE_ORDER: NpcCareerStage[] = [
  "unraced",
  "juvenile",
  "rising",
  "prime",
  "declining",
  "veteran",
  "retired",
];

function stageColor(stage: NpcCareerStage): string {
  switch (stage) {
    case "prime":
      return "bg-success/20 text-success border-success/30";
    case "rising":
      return "bg-blue-500/20 text-blue-300 border-blue-400/30";
    case "juvenile":
      return "bg-gold/20 text-gold border-gold/30";
    case "declining":
      return "bg-orange-500/20 text-orange-300 border-orange-400/30";
    case "veteran":
      return "bg-destructive/20 text-destructive border-destructive/30";
    case "retired":
      return "bg-slate-700/40 text-cream/50 border-white/10";
    default:
      return "bg-white/5 text-cream/50 border-white/10";
  }
}

export function NpcCareerTrackerPanel({ horses, day }: NpcCareerTrackerPanelProps) {
  const rows = useMemo(
    () =>
      horses
        .map((h) => ({ horse: h, career: summarizeNpcCareer(h, day) }))
        .sort((a, b) => b.career.earnings - a.career.earnings || b.career.starts - a.career.starts),
    [horses, day],
  );

  const stageRows = useMemo(() => {
    const counts = new Map<NpcCareerStage, number>();
    for (const r of rows) counts.set(r.career.stage, (counts.get(r.career.stage) ?? 0) + 1);
    return STAGE_ORDER.filter((s) => counts.has(s)).map((s) => ({
      label: careerStageLabel(s),
      value: counts.get(s) ?? 0,
      color: chartColors.secondary,
    }));
  }, [rows]);

  const totals = useMemo(() => {
    const starts = rows.reduce((n, r) => n + r.career.starts, 0);
    const wins = rows.reduce((n, r) => n + r.career.wins, 0);
    const earnings = rows.reduce((n, r) => n + r.career.earnings, 0);
    const offscreen = rows.reduce((n, r) => n + r.career.offscreenStarts, 0);
    return { starts, wins, earnings, offscreen };
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <ChartCard
          title="Career Stages"
          subtitle={`${rows.length} head`}
          footnote="Where each horse sits in its racing life"
          info="Stage is derived from the horse's age against its peak age: juvenile, rising, prime, declining, then veteran."
        >
          <div className="px-2 pt-2">
            <MiniBar rows={stageRows} />
          </div>
        </ChartCard>

        <ChartCard
          title="Stable Career Totals"
          subtitle={`${totals.starts} starts · ${totals.wins} wins`}
          footnote={`${totals.offscreen} starts run away from the main calendar`}
        >
          <div className="grid grid-cols-2 gap-2 px-3 py-4">
            <div className="bg-black/20 border border-white/5 p-3 text-center">
              <div className="text-[9px] font-black uppercase text-cream/30 tracking-wide mb-1">
                Prize Money
              </div>
              <div className="text-lg font-bold font-mono text-gold">
                {formatCurrencyCompact(totals.earnings)}
              </div>
            </div>
            <div className="bg-black/20 border border-white/5 p-3 text-center">
              <div className="text-[9px] font-black uppercase text-cream/30 tracking-wide mb-1">
                Strike Rate
              </div>
              <div className="text-lg font-bold font-mono text-cream">
                {totals.starts ? Math.round((totals.wins / totals.starts) * 100) : 0}%
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-wide text-cream/30">
                  <th className="px-4 py-2 text-left">Horse</th>
                  <th className="px-3 py-2 text-left">Stage</th>
                  <th className="px-3 py-2 text-right">Age</th>
                  <th className="px-3 py-2 text-right">Starts</th>
                  <th className="px-3 py-2 text-right">Wins</th>
                  <th className="px-3 py-2 text-right">Earnings</th>
                  <th className="px-4 py-2 text-right">Last Run</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ horse, career }) => (
                  <tr key={horse.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2 font-semibold text-cream">{horse.name}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-none font-mono text-[9px] uppercase",
                          stageColor(career.stage),
                        )}
                      >
                        {careerStageLabel(career.stage)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-cream/70">
                      {Math.floor(horse.age)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-cream/70">
                      {career.starts}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-cream/70">{career.wins}</td>
                    <td className="px-3 py-2 text-right font-mono text-gold">
                      {formatCurrencyCompact(career.earnings)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-cream/50">
                      {career.daysSinceStart === null ? "—" : `${career.daysSinceStart}d ago`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
