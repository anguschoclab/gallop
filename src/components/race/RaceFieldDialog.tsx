import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HorseCard } from "@/components/horse/HorseCard";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Horse } from "@/game/types";

interface RaceFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  raceName: string;
  runners: Runner[];
  localHorseMap: Map<string, Horse>;
}

export function RaceFieldDialog({
  open,
  onOpenChange,
  raceName,
  runners,
  localHorseMap,
}: RaceFieldDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-cream font-black uppercase tracking-widest text-sm">
            Field — {raceName}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {runners.map((r) => {
            const horse = localHorseMap.get(r.horseId);
            if (!horse) return null;
            return <HorseCard key={r.horseId} horse={horse} variant="compact" />;
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
