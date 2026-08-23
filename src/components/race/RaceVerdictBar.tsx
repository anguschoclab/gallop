import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RaceVerdict } from "@/core/race/raceVerdict";

interface RaceVerdictBarProps {
  verdict: RaceVerdict;
}

export function RaceVerdictBar({ verdict }: RaceVerdictBarProps) {
  const topFactors = verdict.factors.slice(0, 2);
  const remainingFactors = verdict.factors.slice(2);

  return (
    <div className="mt-3 ml-10 p-3 bg-gold/5 border border-gold/10 space-y-2">
      <div className="text-[11px] font-black uppercase text-gold/80 tracking-tight">
        {verdict.headline}
      </div>

      {topFactors.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {topFactors.map((f) => (
            <span
              key={f.key}
              className={cn(
                "text-[9px] font-mono uppercase tracking-tight",
                f.impact === "positive"
                  ? "text-success/70"
                  : f.impact === "negative"
                    ? "text-red-400/70"
                    : "text-cream/40",
              )}
            >
              {f.label} {f.impact === "positive" ? "▲" : f.impact === "negative" ? "▼" : "◆"}
            </span>
          ))}
        </div>
      )}

      {remainingFactors.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-gold/40 hover:text-gold transition-colors">
            <ChevronDown className="h-2.5 w-2.5" />
            Full Analysis
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              {remainingFactors.map((f) => (
                <span
                  key={f.key}
                  className={cn(
                    "text-[9px] font-mono uppercase tracking-tight",
                    f.impact === "positive"
                      ? "text-success/70"
                      : f.impact === "negative"
                        ? "text-red-400/70"
                        : "text-cream/40",
                  )}
                >
                  {f.label} {f.impact === "positive" ? "▲" : f.impact === "negative" ? "▼" : "◆"}
                </span>
              ))}
            </div>
            {verdict.factors.some((f) => f.note) && (
              <div className="mt-2 space-y-1">
                {verdict.factors.map(
                  (f) =>
                    f.note && (
                      <div
                        key={f.key}
                        className={cn(
                          "text-[9px] font-mono leading-relaxed",
                          f.impact === "positive"
                            ? "text-success/50"
                            : f.impact === "negative"
                              ? "text-red-400/50"
                              : "text-cream/30",
                        )}
                      >
                        {f.note}
                      </div>
                    ),
                )}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {verdict.conditionsNote && (
        <div className="text-[9px] font-mono text-cream/30 italic">{verdict.conditionsNote}</div>
      )}
      {verdict.fieldComparison && (
        <div className="text-[9px] font-mono text-cream/30 italic">{verdict.fieldComparison}</div>
      )}
    </div>
  );
}
