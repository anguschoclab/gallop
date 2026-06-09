import { Link } from "@tanstack/react-router";
import { ChevronRight, Truck, AlertTriangle } from "lucide-react";
import { HorsePortrait } from "@/components/HorsePortrait";
import { JockeyAvatar } from "@/components/JockeyAvatar";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { getTransportCostForRace } from "@/core/race/transportCost";
import type { Horse, Jockey, Race } from "@/game/types";
import { formatCurrency } from "@/lib/formatting";
import { TACTIC_OPTIONS, type TacticId } from "./TacticOptions";

interface Props {
  race: Race;
  selectedHorse: Horse;
  selectedJockey: Jockey;
  selectedTactics: TacticId;
  isHorseQualifiedForRace: (horse: Horse, race: Race) => boolean;
  isNewClaimingRace: boolean;
  claimingPrice: number | undefined;
  wantToClaim: boolean;
  cash: number;
}

export function ReviewStep({
  race,
  selectedHorse,
  selectedJockey,
  selectedTactics,
  isHorseQualifiedForRace,
  isNewClaimingRace,
  claimingPrice,
  wantToClaim,
  cash,
}: Props) {
  const transportCost = getTransportCostForRace(race);
  const qualified = isHorseQualifiedForRace(selectedHorse, race);

  const entryFee = qualified ? 0 : race.entryFee;
  const totalDue =
    entryFee + selectedJockey.ridingFee + transportCost + (wantToClaim && claimingPrice ? claimingPrice : 0);

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-300">
      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground text-center">
        Final Review
      </h3>

      {isNewClaimingRace && claimingPrice && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex gap-3 text-warning">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p className="text-xs font-bold">
            <JargonTooltip term="Claiming">Claiming Race</JargonTooltip>: Any stable may purchase{" "}
            {selectedHorse.name} for {formatCurrency(claimingPrice)} after the race. The transfer
            is automatic. You may withdraw up to 1 day before the race.
          </p>
        </div>
      )}

      <div className="flex justify-around items-center gap-4 bg-muted p-6 rounded-2xl border border-border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

        <div className="flex flex-col items-center gap-2">
          <HorsePortrait
            id={selectedHorse.id}
            coatColor={selectedHorse.coatColor}
            markings={selectedHorse.markings}
            gender={selectedHorse.gender}
            appearance={selectedHorse.appearance}
            size="md"
          />
          <Link
            to="/stable/$horseId"
            params={{ horseId: selectedHorse.id }}
            target="_blank"
            rel="noopener noreferrer"
            className="font-black uppercase tracking-tighter text-center leading-none hover:underline hover:text-gold"
          >
            {selectedHorse.name}
          </Link>
        </div>

        <ChevronRight className="text-muted-foreground/30" />

        <div className="flex flex-col items-center gap-2">
          <JockeyAvatar jockey={selectedJockey} size="md" className="border-2 border-primary/20" />
          <Link
            to="/jockey/$jockeyId"
            params={{ jockeyId: selectedJockey.id }}
            target="_blank"
            rel="noopener noreferrer"
            className="font-black uppercase tracking-tighter text-center leading-none hover:underline hover:text-gold"
          >
            {selectedJockey.name}
          </Link>
        </div>
      </div>

      <div className="space-y-2 px-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tactics</span>
          <span className="font-bold uppercase text-primary">
            {TACTIC_OPTIONS.find((t) => t.id === selectedTactics)?.name}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Entry Fee</span>
          <span className={`font-bold tabular-nums ${qualified ? "text-primary" : ""}`}>
            {qualified ? "WAIVED" : formatCurrency(race.entryFee)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Jockey Riding Fee</span>
          <span className="font-bold tabular-nums">{formatCurrency(selectedJockey.ridingFee)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Truck size={14} />
            Transport Cost
          </span>
          <span className="font-bold tabular-nums">${transportCost}</span>
        </div>
        <div className="h-px bg-border my-2" />
        <div className="flex justify-between text-lg font-black uppercase">
          <span>Total Due</span>
          <span className="text-primary tabular-nums">${formatCurrency(totalDue)}</span>
        </div>
      </div>

      {cash < totalDue && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-3 text-destructive">
          <AlertTriangle size={18} className="shrink-0" />
          <p className="text-xs font-bold">Insufficient cash to cover the total entry cost.</p>
        </div>
      )}
    </div>
  );
}
