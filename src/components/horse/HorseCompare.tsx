import type { Horse } from "@/game/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HeadToHeadSection } from "@/components/horse/HeadToHeadSection";
import { useHorseCompareRows } from "@/hooks/horse/useHorseCompareRows";
import { CompareHeaderRow } from "@/components/horse/CompareHeaderRow";
import { CompareMetricTable } from "@/components/horse/CompareMetricTable";
import { SurfaceAptitudeSection } from "@/components/horse/SurfaceAptitudeSection";
import { CompareStatBars } from "@/components/horse/CompareStatBars";
import { MIN_COMPARE_HORSES } from "@/constants/uiConstants";

interface HorseCompareProps {
  horses: Horse[];
  allHorses?: Horse[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HorseCompare({ horses, allHorses = [], open, onOpenChange }: HorseCompareProps) {
  const { rows } = useHorseCompareRows(horses, allHorses);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] uppercase tracking-widest text-sm text-gold">
            Compare Horses · {horses.length}
          </DialogTitle>
        </DialogHeader>

        {horses.length < MIN_COMPARE_HORSES ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Select 2 or 3 horses from the roster to compare.
          </p>
        ) : (
          <div className="space-y-6">
            <CompareHeaderRow horses={horses} />
            <CompareMetricTable horses={horses} rows={rows} />
            <SurfaceAptitudeSection horses={horses} />
            <CompareStatBars horses={horses} />
          </div>
        )}

        {horses.length >= MIN_COMPARE_HORSES && <HeadToHeadSection horses={horses} />}
      </DialogContent>
    </Dialog>
  );
}
