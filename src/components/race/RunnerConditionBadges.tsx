/**
 * RunnerConditionBadges — In-running condition markers (Flying, Battling,
 * Boxed In, Flagging, In Trouble, ...) shown above a runner on the track.
 */
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import type { ConditionTone, RunnerCondition } from "@/core/race/runnerConditions";

const TONE_CLASSES: Record<ConditionTone, string> = {
  positive: "bg-success/85 text-success-foreground",
  caution: "bg-warning/85 text-warning-foreground",
  negative: "bg-destructive/85 text-destructive-foreground",
  neutral: "bg-muted text-foreground",
};

interface RunnerConditionBadgesProps {
  conditions: RunnerCondition[];
  /** Cap on how many badges to render so the lane never gets cluttered. */
  max?: number;
}

export function RunnerConditionBadges({ conditions, max = 2 }: RunnerConditionBadgesProps) {
  if (conditions.length === 0) return null;

  return (
    <TooltipProvider delayDuration={150}>
      {conditions.slice(0, max).map((condition) => (
        <Tooltip key={condition.id}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[8px] font-bold flex items-center gap-1",
                TONE_CLASSES[condition.tone],
                condition.emphatic && "animate-pulse",
              )}
            >
              <span className="h-1 w-1 rounded-full bg-current" />
              {condition.label}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-56">
            <p className="text-xs font-bold uppercase tracking-wide">{condition.label}</p>
            <p className="text-[11px] text-muted-foreground">{condition.detail}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </TooltipProvider>
  );
}
