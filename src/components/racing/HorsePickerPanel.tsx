import type { Horse } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import { cn } from "@/lib/cn";
import { CheckCircle2 } from "lucide-react";
import { useMemo } from "react";

interface HorsePickerPanelProps {
  horses: Horse[];
  selectedHorseId: string | null;
  onSelect: (horseId: string) => void;
  enteredHorseIds: Set<string>;
}

export function HorsePickerPanel({
  horses,
  selectedHorseId,
  onSelect,
  enteredHorseIds,
}: HorsePickerPanelProps) {
  const sorted = useMemo(() => {
    const eligible = horses.filter(
      (h) => h.owned && h.lifecycleStatus === "active" && !h.consignedSaleId && !h.activeInjury,
    );
    return [...eligible].sort((a, b) => {
      const aEntered = enteredHorseIds.has(a.id) ? 1 : 0;
      const bEntered = enteredHorseIds.has(b.id) ? 1 : 0;
      if (aEntered !== bEntered) return aEntered - bEntered;
      return calculateOverallRating(b) - calculateOverallRating(a);
    });
  }, [horses, enteredHorseIds]);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-muted/40 p-6 text-center">
        <p className="text-sm text-muted-foreground">No active horses in your stable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
      {sorted.map((horse) => {
        const ovr = calculateOverallRating(horse);
        const isSelected = horse.id === selectedHorseId;
        const isEntered = enteredHorseIds.has(horse.id);
        const energyColor =
          horse.energy >= 80
            ? "bg-success"
            : horse.energy >= 50
              ? "bg-amber-500"
              : "bg-destructive";

        return (
          <button
            key={horse.id}
            onClick={() => onSelect(horse.id)}
            className={cn(
              "w-full text-left rounded-lg border px-3 py-2.5 transition-colors",
              isSelected
                ? "border-primary bg-primary/10"
                : "border-muted/30 hover:border-muted/60 hover:bg-muted/20",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-cream truncate">{horse.name}</span>
                  <span className="shrink-0 rounded bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono font-bold text-cream/60">
                    {ovr} OVR
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/30">
                    <div
                      className={cn("h-full rounded-full transition-all", energyColor)}
                      style={{ width: `${horse.energy}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[10px] font-mono text-cream/40">
                    {Math.round(horse.energy)}%
                  </span>
                </div>
              </div>
              {isEntered && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
