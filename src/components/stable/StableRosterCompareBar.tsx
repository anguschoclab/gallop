/**
 * StableRosterCompareBar.tsx - Floating compare action bar for stable roster
 *
 * Extracted from StableRosterView.tsx for modularity.
 */

import { TOOLTIP_DELAY_MS, MAX_COMPARE_HORSES } from "@/constants";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Horse } from "@/game/types";
import { GitCompare, X, ChevronLeft, ChevronRight } from "lucide-react";

interface StableRosterCompareBarProps {
  selectedIds: string[];
  horseMap: Map<string, Horse>;
  toggleSelect: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  onCompare: () => void;
}

export function StableRosterCompareBar({
  selectedIds,
  horseMap,
  toggleSelect,
  setSelectedIds,
  onCompare,
}: StableRosterCompareBarProps) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-slate-900 border border-gold/30 shadow-2xl rounded-lg px-4 py-3 animate-in slide-in-from-bottom-4 duration-200 max-w-[95vw] flex-wrap">
      <span className="font-mono text-[10px] uppercase tracking-wide text-cream/60 whitespace-nowrap">
        {selectedIds.length}/{MAX_COMPARE_HORSES} selected
      </span>
      <div className="flex items-center gap-1.5">
        {selectedIds.map((id, idx) => {
          const h = horseMap.get(id);
          if (!h) return null;
          return (
            <div key={id} className="flex items-center gap-0.5 bg-white/5 rounded px-1.5 py-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-cream/40 hover:text-cream"
                disabled={idx === 0}
                onClick={() => {
                  const next = [...selectedIds];
                  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                  setSelectedIds(next);
                }}
                aria-label={`Move ${h.name} left`}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-[10px] font-mono font-bold text-cream/80 max-w-[80px] truncate">
                {h.name}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-cream/40 hover:text-cream"
                disabled={idx === selectedIds.length - 1}
                onClick={() => {
                  const next = [...selectedIds];
                  [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                  setSelectedIds(next);
                }}
                aria-label={`Move ${h.name} right`}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-cream/40 hover:text-destructive"
                onClick={() => toggleSelect(id)}
                aria-label={`Remove ${h.name} from compare`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
      {selectedIds.length < 2 ? (
        <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className="inline-block cursor-not-allowed"
                aria-label="Select at least 2 horses to compare"
              >
                <Button
                  size="sm"
                  className="gap-2 bg-gold text-slate-950 hover:bg-gold/90 font-bold uppercase text-[10px] tracking-wide pointer-events-none"
                  disabled
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  Compare
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Select at least 2 horses to compare</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Button
          size="sm"
          className="gap-2 bg-gold text-slate-950 hover:bg-gold/90 font-bold uppercase text-[10px] tracking-wide"
          onClick={onCompare}
        >
          <GitCompare className="h-3.5 w-3.5" />
          Compare
        </Button>
      )}

      <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-cream/60 hover:text-cream"
              onClick={() => setSelectedIds([])}
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear selection</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
