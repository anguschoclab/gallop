import { useState, useMemo } from "react";
import { useGame } from "@/game/store";
import { useHorses, useRaces, useCash, useDay } from "@/hooks/game/useCoreState";
import { useJockeys } from "@/hooks/game/useSystemsState";
import { useHorseEligibleRaces, findFirstEligibleRace } from "@/hooks/race/useHorseEligibleRaces";
import { HorsePickerPanel } from "./HorsePickerPanel";
import { EligibleRaceList } from "./EligibleRaceList";
import { Flag } from "lucide-react";

export function RaceCenterTab() {
  const horses = useHorses();
  const races = useRaces();
  const jockeys = useJockeys();
  const cash = useCash();
  const day = useDay();
  const enterRace = useGame((s) => s.enterRace);
  const advanceMultipleDays = useGame((s) => s.advanceMultipleDays);

  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);

  const horseList = useMemo(() => Object.values(horses), [horses]);

  const enteredHorseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const race of Object.values(races)) {
      for (const entry of race.entries) {
        if (entry.owned) ids.add(entry.horseId);
      }
    }
    return ids;
  }, [races]);

  const selectedHorse = useMemo(
    () => (selectedHorseId ? horses[selectedHorseId] : undefined),
    [horses, selectedHorseId],
  );

  const eligibleRows = useHorseEligibleRaces(
    selectedHorse,
    races,
    jockeys,
    cash,
    day,
    30,
  );

  const racesArray = useMemo(() => Object.values(races), [races]);
  const firstEligibleRace = useMemo(
    () => (eligibleRows.length === 0 ? findFirstEligibleRace(selectedHorse, racesArray, day) : undefined),
    [eligibleRows.length, selectedHorse, racesArray, day],
  );

  const onAdvanceToDay = useMemo(
    () => (targetDay: number) => {
      advanceMultipleDays(targetDay - day);
    },
    [advanceMultipleDays, day],
  );

  const autoSelectFirst = useMemo(() => {
    if (selectedHorseId) return null;
    const firstEligible = horseList.find(
      (h) =>
        h.owned &&
        h.lifecycleStatus === "active" &&
        !h.consignedSaleId &&
        !h.activeInjury,
    );
    return firstEligible?.id ?? null;
  }, [horseList, selectedHorseId]);

  const effectiveHorseId = selectedHorseId ?? autoSelectFirst;

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="border-b border-success/20 pb-4">
        <div className="flex items-center gap-2 text-success uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-xs font-bold mb-1 opacity-60">
          <Flag className="h-3.5 w-3.5" />
          Race Center
        </div>
        <h2 className="text-3xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
          Entry Desk
        </h2>
        <p className="text-sm text-cream/50 mt-1">
          Pick a horse, see their eligible races, enter with one click.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        <HorsePickerPanel
          horses={horseList}
          selectedHorseId={effectiveHorseId}
          onSelect={setSelectedHorseId}
          enteredHorseIds={enteredHorseIds}
        />

        <div>
          {effectiveHorseId && horses[effectiveHorseId] ? (
            <EligibleRaceList
              rows={eligibleRows}
              horseName={horses[effectiveHorseId].name}
              onEnterRace={(raceId) => enterRace(raceId, effectiveHorseId)}
              firstEligibleRace={firstEligibleRace}
              onAdvanceToDay={onAdvanceToDay}
            />
          ) : (
            <div className="rounded-lg border border-muted/40 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Select a horse to view eligible races.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
