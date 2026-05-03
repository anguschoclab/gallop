import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { overall } from "@/components/HorseBits";

export const Route = createFileRoute("/races")({
  component: RacesPage,
});

function RacesPage() {
  const navigate = useNavigate();
  const races = useGame((s) => s.races);
  const day = useGame((s) => s.day);
  const horses = useGame((s) => s.horses);
  const cash = useGame((s) => s.cash);
  const enterRace = useGame((s) => s.enterRace);
  const withdrawRace = useGame((s) => s.withdrawRace);

  const upcoming = races
    .filter((r) => !r.resolved && r.day >= day)
    .sort((a, b) => a.day - b.day);

  const past = races
    .filter((r) => r.resolved && r.result && r.result.length > 0)
    .sort((a, b) => b.day - a.day)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Race Calendar</h1>
        <p className="text-muted-foreground">Enter your horses to compete</p>
      </div>

      <div className="space-y-3">
        {upcoming.map((race) => {
          const ownedEntry = race.entries.find((e) => e.owned);
          const eligible = horses.filter((h) =>
            (!race.minStat || overall(h) >= race.minStat) &&
            !race.entries.some((e) => e.horseId === h.id)
          );
          const canRun = race.day === day && ownedEntry;

          return (
            <Card key={race.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold">{race.name}</h3>
                      <Badge variant="outline">{race.raceClass}</Badge>
                      {race.day === day && <Badge variant="default">Today</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Day {race.day}</span>
                      <span>{race.distance}m</span>
                      <span>Purse <span className="font-medium text-foreground">${race.purse.toLocaleString()}</span></span>
                      <span>Entry ${race.entryFee}</span>
                      <span>{race.entries.length}/{race.fieldSize} entered</span>
                      {race.minStat && <span>Min OVR {race.minStat}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end min-w-[200px]">
                    {ownedEntry ? (
                      <>
                        <Badge variant="secondary">
                          {horses.find((h) => h.id === ownedEntry.horseId)?.name} entered
                        </Badge>
                        <div className="flex gap-2">
                          {canRun && (
                            <Button size="sm" onClick={() => navigate({ to: "/race/$raceId", params: { raceId: race.id } })}>
                              Run race
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => withdrawRace(race.id, ownedEntry.horseId)}>
                            Withdraw
                          </Button>
                        </div>
                      </>
                    ) : (
                      <EntryPicker
                        eligible={eligible}
                        disabled={cash < race.entryFee || race.entries.length >= race.fieldSize}
                        onEnter={(hid) => enterRace(race.id, hid)}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {past.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent results</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {past.map((r) => (
              <div key={r.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span><span className="text-muted-foreground">D{r.day}</span> · {r.name}</span>
                <span className="text-muted-foreground">
                  Winner: {horses.find((h) => h.id === r.result?.[0]?.horseId)?.name ?? "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EntryPicker({ eligible, disabled, onEnter }: { eligible: { id: string; name: string; energy: number }[]; disabled: boolean; onEnter: (id: string) => void }) {
  const [selected, setSelected] = useState<string | undefined>();
  if (eligible.length === 0) {
    return <p className="text-xs text-muted-foreground">No eligible horses</p>;
  }
  return (
    <div className="flex gap-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Pick horse" /></SelectTrigger>
        <SelectContent>
          {eligible.map((h) => (
            <SelectItem key={h.id} value={h.id}>{h.name} (⚡{h.energy})</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" disabled={!selected || disabled} onClick={() => selected && onEnter(selected)}>
        Enter
      </Button>
    </div>
  );
}
