import type { Horse } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface HorsePickerPanelProps {
  horses: Horse[];
  selectedHorseId: string | null;
  onSelect: (horseId: string) => void;
}

export function HorsePickerPanel({ horses, selectedHorseId, onSelect }: HorsePickerPanelProps) {
  const eligible = horses.filter(
    (h) =>
      h.owned &&
      h.lifecycleStatus === "active" &&
      !h.consignedSaleId &&
      !h.activeInjury,
  );

  const enteredIds = new Set<string>();
  for (const h of eligible) {
    // A horse is "entered" if it appears in any race's entries
  }
  // We need races to check entries, but we don't have them here.
  // The parent will pass enteredHorseIds if needed — for now we derive from horse data only.
  // The "Entered" badge will be handled by the parent passing a Set<string>.

  const sorted = [...eligible].sort((a, b) => {
    const aEntered = enteredIds.has(a.id) ? 1 : 0;
    const bEntered = enteredIds.has(b.id) ? 1 : 0;
    if (aEntered !== bEntered) return aEntered - bEntered;
    return calculateOverallRating(b) - calculateOverallRating(a);
  });

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
                  <span className="font-semibold text-sm text-cream truncate">
                    {horse.name}
                  </span>
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
                    {horse.energy}%
                  </span>
                </div>
              </div>
              {enteredIds.has(horse.id) && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
