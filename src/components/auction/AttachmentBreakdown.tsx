import { Info } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { HorseAttachment } from "@/core/horse/attachment";

interface AttachmentBreakdownProps {
  attachment: HorseAttachment;
}

export function AttachmentBreakdown({ attachment }: AttachmentBreakdownProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-cream">
          {attachment.label} · score {attachment.score}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-cream-muted hover:text-cream">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Multiplier = 1.05 + (score/100)^1.5 × 4.95.
                <br />
                Tiers: available &lt;26, valued 26-51, protected 52-77, untouchable ≥78.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {attachment.signals.length > 0 && (
        <ul className="text-xs text-cream-muted space-y-0.5">
          {attachment.signals.map((s) => (
            <li key={s.label} className="flex justify-between gap-3">
              <span>{s.label}</span>
              <span className="tabular-nums">
                {s.points > 0 ? "+" : ""}
                {s.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
