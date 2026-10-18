import { AlertTriangle } from "lucide-react";
import type { Horse, Race } from "@/game/types";
import { formatCurrency } from "@/services/race/raceFacade";

interface Props {
  race: Race;
  selectedHorse: Horse;
}

export function ClaimingStep({ race, selectedHorse }: Props) {
  const claimingPrice = race.claimingPrice;
  if (!claimingPrice) return null;

  const optionalClaiming =
    race.raceClass === "OptionalClaiming" || race.raceClass === "MaidenOptionalClaiming";

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-300">
      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground text-center">
        Claiming Risk
      </h3>

      <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex gap-3 text-warning">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <div className="space-y-2 text-xs font-bold">
          <p>
            {selectedHorse.name} may be claimed by another stable for{" "}
            {formatCurrency(claimingPrice)} after this race. The transfer is automatic and your
            stable receives the claiming price.
          </p>
          {optionalClaiming && (
            <p>
              This is an optional claiming race. Once entered, you may withdraw {selectedHorse.name}{" "}
              from claiming while keeping the race entry.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
