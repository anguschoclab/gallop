/**
 * RunnerMoodFace — Three-state face showing how happy a runner is with its
 * current position in the run. Green smile / amber flat / red frown.
 */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      <TooltipContent side="top" className="max-w-56">
        <p className="text-xs font-bold uppercase tracking-wide">
          {mood.label} · {mood.score}/100
        </p>
        <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
          {mood.reasons.slice(0, 3).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
