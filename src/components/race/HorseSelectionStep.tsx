import { isHorseEligibleForRace } from "@/core/race/eligibility";
import type { Horse, Race } from "@/game/types";
import { EligibleHorseRow } from "./EligibleHorseRow";

interface Props {
  horses: Horse[];
  race: Race;
  selectedHorseId: string | null;
  onSelectHorse: (id: string) => void;
  isHorseQualifiedForRace: (horse: Horse, race: Race) => boolean;
  isNewClaimingRace: boolean;
  day: number;
  onWithdrawFromClaimingRace: (raceId: string, horseId: string) => void;
  onWithdrawRace: (raceId: string, horseId: string) => { ok: boolean; reason?: string };
  onClose: () => void;
}

export function HorseSelectionStep({
  horses,
  race,
  selectedHorseId,
  onSelectHorse,
  isHorseQualifiedForRace,
  isNewClaimingRace,
  day,
  onWithdrawFromClaimingRace,
  onWithdrawRace,
  onClose,
}: Props) {
  const eligibleHorses = horses.map((h) => ({
    horse: h,
    eligible: isHorseEligibleForRace(h, race, new Set(), day),
    isEntered: race.entries.some((e) => e.horseId === h.id),
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
        Select Horse
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {eligibleHorses.map(({ horse, eligible, isEntered }) => (
          <EligibleHorseRow
            key={horse.id}
            horse={horse}
            race={race}
            selectedHorseId={selectedHorseId}
            onSelectHorse={onSelectHorse}
            isHorseQualifiedForRace={isHorseQualifiedForRace}
            isNewClaimingRace={isNewClaimingRace}
            day={day}
            onWithdrawFromClaimingRace={onWithdrawFromClaimingRace}
            onWithdrawRace={onWithdrawRace}
            onClose={onClose}
            eligible={eligible}
            isEntered={isEntered}
          />
        ))}
      </div>
    </div>
  );
}
