import { memo } from "react";
import { Brain } from "lucide-react";
import { cn } from "@/lib/cn";

interface JockeyLearningInsightsProps {
  insights: {
    totalRaces: number;
    avgPosition: number;
    styleUsage: Record<string, number>;
    avgAggressiveness: number;
  } | null;
  jockeyName: string;
}

export const JockeyLearningInsights = memo(function JockeyLearningInsights({
  insights,
  jockeyName,
}: JockeyLearningInsightsProps) {
  if (!insights) return null;

  if (insights.totalRaces === 0) {
    return (
      <div
        className="bg-black/20 border border-white/5 p-2 space-y-1"
        data-testid="learning-insights"
      >
        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-cyan-400/40">
          <Brain className="h-3 w-3" /> Learning Insights · {jockeyName}
        </div>
        <div className="text-[9px] font-mono text-cream/20 italic">
          No race history yet. {insights.totalRaces} recorded races.
        </div>
      </div>
    );
  }

  const styles = ["E", "EP", "P", "S"] as const;
  const maxStyleCount = Math.max(...styles.map((s) => insights.styleUsage[s] ?? 0), 1);

  return (
    <div
      className="bg-black/20 border border-white/5 p-2 space-y-2"
      data-testid="learning-insights"
    >
      <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-cyan-400/40">
        <Brain className="h-3 w-3" /> Learning Insights · {jockeyName}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[8px] font-black uppercase tracking-wide text-cream/30">Races</div>
          <div className="font-mono text-xs text-cream/60">{insights.totalRaces}</div>
        </div>
        <div>
          <div className="text-[8px] font-black uppercase tracking-wide text-cream/30">Avg Pos</div>
          <div className="font-mono text-xs text-cream/60">{insights.avgPosition.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-[8px] font-black uppercase tracking-wide text-cream/30">
            Aggression
          </div>
          <div className="font-mono text-xs text-cream/60">
            {Math.round(insights.avgAggressiveness * 100)}%
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-[8px] font-black uppercase tracking-wide text-cream/30">
          Style Usage
        </div>
        <div className="flex items-end gap-1 h-6">
          {styles.map((s) => {
            const count = insights.styleUsage[s] ?? 0;
            const height = (count / maxStyleCount) * 100;
            return (
              <div key={s} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={cn("w-full min-h-[2px] bg-cyan-400/40", count === 0 && "bg-white/5")}
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
                <span className="text-[7px] font-mono text-cream/30">{s}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
