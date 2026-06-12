import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { JARGON_DEFINITIONS } from "@/constants/jargon";

interface JargonTooltipProps {
  term: keyof typeof JARGON_DEFINITIONS | string;
  children?: React.ReactNode;
  className?: string;
}

export function JargonTooltip({ term, children, className }: JargonTooltipProps) {
  const definition = JARGON_DEFINITIONS[term];

  if (!definition) {
    return <span className={className}>{children || term}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "underline decoration-dotted decoration-muted-foreground/40 cursor-help",
              className,
            )}
          >
            {children || term}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-center">
          {definition}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { JargonTooltip as Jargon };
