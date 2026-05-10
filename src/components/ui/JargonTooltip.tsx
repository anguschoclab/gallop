import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const JARGON_DEFINITIONS: Record<string, string> = {
  Beyer: "A speed figure (0–~120) standardising performance across distances and tracks.",
  Dosage: "Pedigree-derived genetic profile across speed and stamina aptitudes.",
  "Graded race": "Top-tier race classification (G1 > G2 > G3 > Listed).",
  Stakes: "High-quality race with an entry fee that contributes to the purse.",
  Handicap: "Race where horses carry different weights to equalise winning chances.",
  Claiming: "Race where any horse may be purchased (claimed) for a set price.",
  Maiden: "Race restricted to horses that have never won a race.",
  Furlong: "A unit of distance equal to 1/8 mile (approx. 201 metres).",
  Surface: "The track material (Turf, Dirt, or Synthetic), which affects pace.",
  "Track condition": "The moisture level and firmness of the racing surface.",
  Broodmare: "A female horse used specifically for breeding foals.",
  Dam: "The mother of a horse.",
  Sire: "The father of a horse.",
  Foal: "A horse under one year old.",
  "Blue hen": "An exceptional broodmare proven to throw multiple stakes winners.",
  Silk: "The owner's unique racing colours worn by the jockey.",
  OVR: "Overall rating: a weighted average of a horse's primary physical stats.",
  Pot: "Potential: the theoretical maximum stats a horse can reach through training.",
  Nicking: "The specific compatibility score between a sire's and dam's bloodlines.",
  Bloodline:
    "The sire-line pedigree traced to 6 generations to identify founder ancestors (e.g., Northern Dancer, Mr. Prospector).",
  Inbreeding:
    "The measure of shared ancestors in a horse's pedigree, calculated to 8 generations with weighted contribution (near generations have stronger impact).",
  Stud: "A retired male horse (stallion) available for breeding.",
};

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
