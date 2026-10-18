import { TOOLTIP_DELAY_MS } from "@/shared/constants/uiConstants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { cn } from "@/shared/lib/cn";
import React from "react";

export function DisabledTooltipWrapper({
  reason,
  children,
  wrapperClassName,
  "aria-label": ariaLabel,
}: {
  reason?: string | false;
  children: React.ReactNode;
  wrapperClassName?: string;
  "aria-label"?: string;
}) {
  if (!reason) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={cn("inline-block cursor-not-allowed", wrapperClassName)}
            aria-label={ariaLabel}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
