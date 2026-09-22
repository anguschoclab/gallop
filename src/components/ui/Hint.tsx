import { TOOLTIP_DELAY_MS } from "@/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import React from "react";

/**
 * Replaces the native `title` attribute with an accessible Tooltip.
 * The child element is the trigger (via asChild, so no extra DOM node);
 * it gains keyboard-focus + touch support that `title` lacks.
 */
export function Hint({
  content,
  children,
}: {
  content?: React.ReactNode;
  children: React.ReactElement;
}) {
  if (content == null || content === "") return children;

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
