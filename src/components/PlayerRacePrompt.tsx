import { useGame } from "@/game/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { buildRaceField, rngForRace } from "@/services/raceSimulationService";
import { runRaceToCompletion } from "@/game/raceSim";
import { getCourseForRace } from "@/game/tracks";

export function PlayerRacePrompt() {
  const pendingRaceId = useGame((s) => s.pendingPlayerRaceId);
  const races = useGame((s) => s.races);
  const horses = useGame((s) => s.horses);
  const jockeys = useGame((s) => s.jockeys ?? []);
  const day = useGame((s) => s.day);
  const resolveRaceWithImpacts = useGame((s) => s.resolveRaceWithImpacts);
  const set = useGame.setState;
  const navigate = useNavigate();

  const race = races.find((r) => r.id === pendingRaceId);
  if (!race) return null;

  const enteredHorse = horses.find((h) => h.owned && race.entries.some((e) => e.horseId === h.id && e.owned));

  function clearPending() {
    set({ pendingPlayerRaceId: undefined });
  }

  function goToRace() {
    clearPending();
    navigate({ to: "/race/$raceId", params: { raceId: race!.id } });
  }

  function autoResolve() {
    const { runners } = buildRaceField({ race: race!, horses, jockeys });
    const course = getCourseForRace(race!);
    const result = runRaceToCompletion(runners, race!.distance, rngForRace(race!), 0.1, 600, course);
    resolveRaceWithImpacts(race!.id, result);
    clearPending();
  }

  return (
    <Dialog open={!!pendingRaceId} onOpenChange={(open) => { if (!open) clearPending(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Race Day — {gameCalendarDate(day + 1)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-base font-semibold">{race.name}</p>
          <p className="text-sm text-muted-foreground">
            {race.distance}m · {race.raceClass} · Purse ${race.purse.toLocaleString()}
          </p>
          {enteredHorse && (
            <p className="text-sm">
              <span className="font-medium">{enteredHorse.name}</span> is entered in this race.
            </p>
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
