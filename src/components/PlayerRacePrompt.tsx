import { useGame, useGameWithShallow } from "@/game/store";
import { shallow } from "zustand/shallow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "@tanstack/react-router";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { buildRaceField, rngForRace } from "@/services/raceSimulationService";
import { runRaceToCompletion } from "@/game/raceSim";
import { getCourseForRace } from "@/game/tracks";
import { formatCurrency } from "@/lib/formatting";
import { useState } from "react";

const TACTIC_OPTIONS = [
  { id: "default", name: "Default", desc: "Jockey's best judgment" },
  { id: "lead", name: "Lead", desc: "Aggressive front-running" },
  { id: "rail", name: "Rail", desc: "Hug the inside" },
  { id: "outside", name: "Outside", desc: "Stay wide to avoid traffic" },
  { id: "save", name: "Save", desc: "Draft behind others" },
  { id: "late_kick", name: "Late Kick", desc: "Conserve for final stretch" },
] as const;

export function PlayerRacePrompt() {
  const pendingRaceId = useGame((s) => s.pendingPlayerRaceId);
  const races = useGameWithShallow((s) => s.races ?? []);
  const horses = useGameWithShallow((s) => s.horses ?? []);
  const jockeys = useGameWithShallow((s) => s.jockeys ?? []);
  const day = useGame((s) => s.day);
  const resolveRaceWithImpacts = useGame((s) => s.resolveRaceWithImpacts);
  const setRaceTactics = useGame((s) => s.setRaceTactics);
  const navigate = useNavigate();
  const [selectedTactics, setSelectedTactics] = useState<"default" | "lead" | "rail" | "outside" | "save" | "late_kick">("default");

  const race = races.find((r) => r.id === pendingRaceId);
  if (!race) return null;

  const enteredHorse = horses.find(
    (h) => h.owned && race.entries.some((e) => e.horseId === h.id && e.owned),
  );

  function clearPending() {
    useGame.setState({ pendingPlayerRaceId: undefined });
  }

  function goToRace() {
    clearPending();
    navigate({ to: "/race/$raceId", params: { raceId: race!.id } });
  }

  function autoResolve() {
    // Set tactics before resolving
    if (enteredHorse) {
      setRaceTactics(race!.id, enteredHorse.id, selectedTactics);
    }
    
    const { runners } = buildRaceField({ race: race!, horses, jockeys });
    const course = getCourseForRace(race!);
    const result = runRaceToCompletion(
      runners,
      race!.distance,
      rngForRace(race!),
      0.1,
      600,
      course,
    );
    resolveRaceWithImpacts(race!.id, result);
    clearPending();
  }

  return (
    <Dialog
      open={!!pendingRaceId}
      onOpenChange={(open) => {
        if (!open) clearPending();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Race Day — {gameCalendarDate(day + 1)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-base font-semibold">{race.name}</p>
          <p className="text-sm text-muted-foreground">
            {race.distance}m · {race.raceClass} · Purse {formatCurrency(race.purse)}
          </p>
          {enteredHorse && (
            <p className="text-sm">
              <span className="font-medium">{enteredHorse.name}</span> is entered in this race.
            </p>
          )}
          {enteredHorse && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Tactics</label>
              <Select value={selectedTactics} onValueChange={(v: any) => setSelectedTactics(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TACTIC_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name} - {opt.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button onClick={goToRace} className="flex-1">
            Go to Race ↗
          </Button>
          <Button onClick={autoResolve} variant="secondary" className="flex-1">
            Auto-Resolve & Continue
          </Button>
          <Button onClick={clearPending} variant="ghost" className="flex-1">
            Stop Here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
