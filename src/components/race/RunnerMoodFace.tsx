/**
 * RunnerMoodFace — Three-state face showing how happy a runner is with its
 * current position in the run. Green smile / amber flat / red frown.
 */
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import type { RunnerMood } from "@/core/race/runnerConditions";
import {
  MOOD_TOOLTIP_DELAY_MS,
  MOOD_FACE_DEFAULT_SIZE,
  MOOD_TOOLTIP_MAX_SIGNALS,
  MOOD_SVG_VIEWBOX,
  MOOD_SVG_FACE_RADIUS,
  MOOD_SVG_LEFT_EYE_X,
  MOOD_SVG_RIGHT_EYE_X,
  MOOD_SVG_EYE_Y,
  MOOD_SVG_EYE_RADIUS,
  MOOD_SVG_STROKE_WIDTH,
  MOOD_SVG_INK_COLOR,
} from "@/constants/runnerConditionThresholds";

interface RunnerMoodFaceProps {
  mood: RunnerMood;
  horseName?: string;
  size?: number;
  className?: string;
  tooltipClassName?: string;
}

const FACE_STYLES = {
  happy: { fill: "var(--color-success, #34d399)", ring: "ring-success/40" },
  neutral: { fill: "var(--color-warning, #facc15)", ring: "ring-warning/40" },
  unhappy: { fill: "var(--color-destructive, #ef4444)", ring: "ring-destructive/40" },
} as const;

export function RunnerMoodFace({
  mood,
  horseName,
  size = MOOD_FACE_DEFAULT_SIZE,
  className,
  tooltipClassName,
}: RunnerMoodFaceProps) {
  const style = FACE_STYLES[mood.face];

  return (
    <TooltipProvider delayDuration={MOOD_TOOLTIP_DELAY_MS}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn("inline-flex shrink-0 rounded-full ring-1", style.ring, className)}
            aria-label={`${horseName ? horseName + ": " : ""}mood ${mood.label} (${mood.score}/100)`}
          >
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${MOOD_SVG_VIEWBOX} ${MOOD_SVG_VIEWBOX}`}
              role="img"
              aria-hidden="true"
            >
              <circle
                cx={MOOD_SVG_VIEWBOX / 2}
                cy={MOOD_SVG_VIEWBOX / 2}
                r={MOOD_SVG_FACE_RADIUS}
                fill={style.fill}
              />
              <circle
                cx={MOOD_SVG_LEFT_EYE_X}
                cy={MOOD_SVG_EYE_Y}
                r={MOOD_SVG_EYE_RADIUS}
                fill={MOOD_SVG_INK_COLOR}
              />
              <circle
                cx={MOOD_SVG_RIGHT_EYE_X}
                cy={MOOD_SVG_EYE_Y}
                r={MOOD_SVG_EYE_RADIUS}
                fill={MOOD_SVG_INK_COLOR}
              />
              {mood.face === "happy" && (
                <path
                  d="M7 14.4c1.2 2.2 3 3.3 5 3.3s3.8-1.1 5-3.3"
                  stroke={MOOD_SVG_INK_COLOR}
                  strokeWidth={MOOD_SVG_STROKE_WIDTH}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
              {mood.face === "neutral" && (
                <path
                  d="M7.4 16h9.2"
                  stroke={MOOD_SVG_INK_COLOR}
                  strokeWidth={MOOD_SVG_STROKE_WIDTH}
                  strokeLinecap="round"
                />
              )}
              {mood.face === "unhappy" && (
                <path
                  d="M7 17.6c1.2-2.2 3-3.3 5-3.3s3.8 1.1 5 3.3"
                  stroke={MOOD_SVG_INK_COLOR}
                  strokeWidth={MOOD_SVG_STROKE_WIDTH}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </svg>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className={cn("max-w-56", tooltipClassName)}>
          <p className="text-xs font-bold uppercase tracking-wide">
            {mood.label} · {mood.score}/100
          </p>
          <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
            {mood.signals.slice(0, MOOD_TOOLTIP_MAX_SIGNALS).map((signal) => (
              <li
                key={signal.label}
                data-testid="mood-signal"
                className="flex justify-between gap-2"
              >
                <span data-testid="mood-signal-label">{signal.label}</span>
                <span data-testid="mood-signal-contribution" className="tabular-nums">
                  {signal.contribution > 0 ? "+" : ""}
                  {signal.contribution}
                </span>
              </li>
            ))}
          </ul>
          <p
            data-testid="mood-total"
            className="mt-1 border-t border-white/10 pt-0.5 text-[11px] font-bold tabular-nums"
          >
            Total: {mood.score}/100
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
