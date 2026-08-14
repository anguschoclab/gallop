/**
 * RunnerMoodFace — Three-state face showing how happy a runner is with its
 * current position in the run. Green smile / amber flat / red frown.
 */
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import type { RunnerMood } from "@/core/race/runnerConditions";

interface RunnerMoodFaceProps {
  mood: RunnerMood;
  horseName?: string;
  size?: number;
  className?: string;
}

const FACE_STYLES = {
  happy: { fill: "var(--color-success, #34d399)", ring: "ring-success/40" },
  neutral: { fill: "var(--color-warning, #facc15)", ring: "ring-warning/40" },
  unhappy: { fill: "var(--color-destructive, #ef4444)", ring: "ring-destructive/40" },
} as const;

export function RunnerMoodFace({ mood, horseName, size = 16, className }: RunnerMoodFaceProps) {
  const style = FACE_STYLES[mood.face];

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn("inline-flex shrink-0 rounded-full ring-1", style.ring, className)}
            aria-label={`${horseName ? horseName + ": " : ""}mood ${mood.label} (${mood.score}/100)`}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="12" cy="12" r="12" fill={style.fill} />
              <circle cx="8.4" cy="9.4" r="1.7" fill="#111827" />
              <circle cx="15.6" cy="9.4" r="1.7" fill="#111827" />
              {mood.face === "happy" && (
                <path
                  d="M7 14.4c1.2 2.2 3 3.3 5 3.3s3.8-1.1 5-3.3"
                  stroke="#111827"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
              {mood.face === "neutral" && (
                <path d="M7.4 16h9.2" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" />
              )}
              {mood.face === "unhappy" && (
                <path
                  d="M7 17.6c1.2-2.2 3-3.3 5-3.3s3.8 1.1 5 3.3"
                  stroke="#111827"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </svg>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64">
          <p className="text-xs font-bold uppercase tracking-wide">
            {mood.label} · {mood.score}/100
          </p>
          <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
            {mood.reasons.slice(0, 3).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {mood.breakdown && mood.breakdown.length > 0 && (
            <div className="mt-2 border-t border-white/10 pt-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-cream/40 mb-1.5">
                Mood breakdown
              </p>
              <div className="space-y-1">
                {mood.breakdown.map((item) => (
                  <div
                    key={item.signal}
                    className="flex items-start justify-between gap-3 text-[11px]"
                  >
                    <span className="text-cream/70 leading-tight">{item.signal}</span>
                    <span
                      className={cn(
                        "tabular-nums font-black shrink-0",
                        item.contribution > 0
                          ? "text-success"
                          : item.contribution < 0
                            ? "text-destructive"
                            : "text-cream/30",
                      )}
                    >
                      {item.contribution > 0 ? "+" : ""}
                      {item.contribution}
                    </span>
                  </div>
                ))}
                <div className="flex items-start justify-between gap-3 text-[11px] border-t border-white/5 pt-1 mt-1">
                  <span className="text-cream/40 font-bold">Total score</span>
                  <span className="tabular-nums font-black text-cream">{mood.score}/100</span>
                </div>
              </div>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
