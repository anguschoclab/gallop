import { isHorseEligibleForRace } from "@/core/race/eligibility";
import type { Horse, Race } from "@/game/types";
import { EligibleHorseRow } from "./EligibleHorseRow";
import { PaceTendencyFilter } from "@/components/horse/PaceTendencyFilter";
import {
  classifyDistanceBucket,
  matchesTendency,
  type TendencyFilter,
} from "@/core/horse/paceTendency";
import { useMemo, useState } from "react";

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
  const [tendency, setTendency] = useState<TendencyFilter>("any");
  const raceDistance = race.distance;
  const raceSurface = race.surface;

  const eligibleHorses = useMemo(() => {
    const list = horses.map((h) => ({
      horse: h,
      eligible: isHorseEligibleForRace(h, race, new Set(), day),
      isEntered: race.entries.some((e) => e.horseId === h.id),
    }));
    if (tendency === "any") return list;
    return list.filter(({ horse }) =>
      matchesTendency(horse, tendency, {
        distance: classifyDistanceBucket(raceDistance),
        surface: raceSurface ?? "any",
      }),
    );
  }, [horses, race, day, tendency, raceDistance, raceSurface]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
          Select Horse
        </h3>
        <PaceTendencyFilter
          tendency={tendency}
          onTendency={setTendency}
          lockTrip
          className="bg-black/20"
        />
      </div>
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
        {eligibleHorses.length === 0 && (
          <div className="p-6 text-center text-xs font-mono uppercase tracking-widest text-cream/30 border border-white/5 bg-black/20">
            No horses match this pace style for the race's trip.
          </div>
        )}
      </div>
    </div>
  );
}
