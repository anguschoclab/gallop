import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RaceRunner } from "@/core/race/types";

interface JockeyStrategyBreakdownProps {
  runner: RaceRunner;
}

const STYLE_LABELS: Record<string, string> = {
  E: "Front-Runner",
  EP: "Early Presser",
  P: "Presser",
  S: "Closer",
};

function getStrategyExplanation(
  style: string | undefined,
  instructions: RaceRunner["jockeyInstructions"],
): string {
  if (!instructions) return "No tactical instructions available.";
  const styleLabel = STYLE_LABELS[style ?? ""] ?? "Balanced";
  const timing = instructions.moveTiming ?? "flexible";
  return `${styleLabel} approach with ${timing} move timing. ${instructions.earlyPosition ? `Early position: ${instructions.earlyPosition}.` : ""} Aggressiveness: ${Math.round((instructions.aggressiveness ?? 0.5) * 100)}%.`;
}

export const JockeyStrategyBreakdown = memo(function JockeyStrategyBreakdown({
  runner,
}: JockeyStrategyBreakdownProps) {
  const instructions = runner.jockeyInstructions;
  const styleLabel = STYLE_LABELS[runner.runningStyle ?? ""] ?? runner.runningStyle ?? "—";
  const aggressiveness = instructions?.aggressiveness ?? 0;

  return (
    <div
      className={cn(
        "bg-black/30 border border-white/5 p-3 space-y-2",
        runner.owned && "border-l-2 border-l-gold",
      )}
      data-testid="strategy-breakdown"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-cream">{runner.name}</span>
        <span className="text-[9px] font-mono text-cream/30">{runner.jockeyName}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-cream/30">
            Running Style
          </span>
          <Badge
            variant="outline"
            className="text-[8px] font-mono uppercase border-white/10 text-cream/60 rounded-none"
          >
            {runner.runningStyle ?? "—"}
          </Badge>
        </div>
        {instructions?.ridingStyle && (
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-cream/30">
              Riding Style
            </span>
            <span className="text-[9px] font-mono text-cream/60">{instructions.ridingStyle}</span>
          </div>
        )}
      </div>

      {instructions ? (
        <>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-cream/30">
                <Gauge className="h-3 w-3" /> Aggressiveness
              </span>
              <span className="font-mono text-[9px] text-cream/60">
                {Math.round(aggressiveness * 100)}%
              </span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  aggressiveness > 0.7
                    ? "bg-red-400/60"
                    : aggressiveness > 0.4
                      ? "bg-gold/60"
                      : "bg-blue-400/60",
                )}
                style={{ width: `${aggressiveness * 100}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-cream/40 italic leading-relaxed">
            {getStrategyExplanation(runner.runningStyle, instructions)}
          </p>
        </>
      ) : (
        <p className="text-[10px] text-cream/20 italic">No tactical instructions available.</p>
      )}
    </div>
  );
});
