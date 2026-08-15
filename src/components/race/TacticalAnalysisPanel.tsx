import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crosshair } from "lucide-react";
import type { RaceRunner } from "@/core/race/types";
import { JockeyStrategyBreakdown } from "./JockeyStrategyBreakdown";

interface TacticalAnalysisPanelProps {
  runners: RaceRunner[];
}

export function TacticalAnalysisPanel({ runners }: TacticalAnalysisPanelProps) {
  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-cyan-400">
      <CardHeader className="bg-black/20 border-b border-white/5">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40 flex items-center gap-2">
          <Crosshair className="h-3 w-3 text-cyan-400" /> Tactical Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {runners.length === 0 ? (
          <div className="p-8 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
            No tactical data available for this race.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {runners.map((runner) => (
              <JockeyStrategyBreakdown key={runner.horseId} runner={runner} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
