/**
 * StableRosterGallery.tsx - Gallery card view for stable roster
 *
 * Extracted from StableRosterView.tsx for modularity.
 */

import { MAX_COMPARE_HORSES } from "@/constants";
import { HorseCard } from "@/components/horse/HorseCard";
import { Checkbox } from "@/components/ui/checkbox";
import { DisabledTooltipWrapper } from "@/components/ui/DisabledTooltipWrapper";
import type { Horse } from "@/game/types";

type NavigateFn = (opts: {
  to?: string;
  params?: Record<string, string>;
  search?: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>);
}) => void;

interface StableRosterGalleryProps {
  horses: Horse[];
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  navigate: NavigateFn;
}

export function StableRosterGallery({
  horses,
  selectedIds,
  toggleSelect,
  navigate,
}: StableRosterGalleryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {horses.map((h) => {
        const isSelected = selectedIds.includes(h.id);
        const disableCheck = !isSelected && selectedIds.length >= MAX_COMPARE_HORSES;
        return (
          <div key={h.id} className="relative">
            <div className="absolute top-2 left-2 z-10 bg-slate-950/80 backdrop-blur rounded p-1">
              <DisabledTooltipWrapper
                reason={disableCheck ? `Compare limit (${MAX_COMPARE_HORSES}) reached` : undefined}
              >
                <Checkbox
                  aria-label={`Select ${h.name} to compare`}
                  checked={isSelected}
                  disabled={disableCheck}
                  onCheckedChange={() => toggleSelect(h.id)}
                />
              </DisabledTooltipWrapper>
            </div>
            <HorseCard
              horse={h}
              variant="full"
              onClick={() => navigate({ to: "/stable/$horseId", params: { horseId: h.id } })}
            />
          </div>
        );
      })}
    </div>
  );
}
