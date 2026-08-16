import { TOOLTIP_DELAY_MS } from "@/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import React from "react";

export function DisabledTooltipWrapper({
  reason,
  children,
  wrapperClassName,
}: {
  reason?: string | false;
  children: React.ReactNode;
  wrapperClassName?: string;
}) {
  if (!reason) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className={cn("inline-block cursor-not-allowed", wrapperClassName)}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
