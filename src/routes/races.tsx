import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { overall } from "@/components/HorseBits";
import { expectedBeyer } from "@/game/beyer";

type GradeFilter = "all" | "G1" | "G2" | "G3";
const GRADE_FILTERS: GradeFilter[] = ["all", "G1", "G2", "G3"];

export const Route = createFileRoute("/races")({
  component: RacesPage,
  validateSearch: (search: Record<string, unknown>): { grade: GradeFilter } => {
    const g = search.grade;
    return { grade: GRADE_FILTERS.includes(g as GradeFilter) ? (g as GradeFilter) : "all" };
  },
});

function RacesPage() {
  const navigate = useNavigate();
  const { grade } = Route.useSearch();
  const races = useGame((s) => s.races);
  const day = useGame((s) => s.day);
  const horses = useGame((s) => s.horses);
  const cash = useGame((s) => s.cash);
  const enterRace = useGame((s) => s.enterRace);
  const withdrawRace = useGame((s) => s.withdrawRace);
  const pregnancies = useGame((s) => s.pregnancies);
  const pregnantIds = new Set(pregnancies.filter((p) => !p.resolved).map((p) => p.damId));

  const matchesFilter = (r: { graded?: { grade: "G1" | "G2" | "G3" } }) =>
    grade === "all" ? true : r.graded?.grade === grade;

  const upcoming = races
    .filter((r) => !r.resolved && r.day >= day && matchesFilter(r))
    .sort((a, b) => a.day - b.day);

  const past = races
    .filter((r) => r.resolved && r.result && r.result.length > 0 && matchesFilter(r))
    .sort((a, b) => b.day - a.day)
    .slice(0, 8);

  const filterLabel: Record<GradeFilter, string> = { all: "All races", G1: "G1 only", G2: "G2 only", G3: "G3 only" };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Race Calendar</h1>
          <p className="text-muted-foreground">Enter your horses to compete</p>
        </div>
        <div className="inline-flex rounded-md border bg-card p-1">
          {GRADE_FILTERS.map((g) => (
            <Link
              key={g}
              to="/races"
              search={{ grade: g }}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                grade === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filterLabel[g]}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">No upcoming races match this filter.</p>
        )}
        {upcoming.map((race) => {
          const ownedEntry = race.entries.find((e) => e.owned);
          const r = race.restrictions;
          const eligible = horses.filter((h) =>
            (!race.minStat || overall(h) >= race.minStat) &&
            !race.entries.some((e) => e.horseId === h.id) &&
            !pregnantIds.has(h.id) &&
            (!r?.minAge || h.age >= r.minAge) &&
            (!r?.maxAge || h.age <= r.maxAge)
          );
          const canRun = race.day === day && ownedEntry;
          const gradeColor = race.graded?.grade === "G1"
            ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/40"
            : race.graded?.grade === "G2"
            ? "bg-slate-400/20 text-slate-600 border-slate-400/40"
            : "bg-amber-700/20 text-amber-800 border-amber-700/40";

          return (
            <Card key={race.id} className={race.graded ? "border-l-4 border-l-primary" : undefined}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-bold">{race.name}</h3>
                      {race.graded ? (
                        <Badge variant="outline" className={gradeColor}>{race.graded.grade}</Badge>
                      ) : (
                        <Badge variant="outline">{race.raceClass}</Badge>
                      )}
                      {race.day === day && <Badge variant="default">Today</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Day {race.day}</span>
                      <span>{race.distance}m</span>
                      {race.graded && <span>{race.graded.track} · {race.graded.surface}</span>}
                      <span>Purse <span className="font-medium text-foreground">${race.purse.toLocaleString()}</span></span>
                      <span>Entry ${race.entryFee}</span>
                      <span>{race.entries.length}/{race.fieldSize} entered</span>
                      {race.minStat && <span>Min OVR {race.minStat}</span>}
                      {r?.minAge === r?.maxAge && r?.minAge !== undefined && <span>{r.minAge}YO only</span>}
                      {r?.minAge !== undefined && r?.maxAge === undefined && <span>{r.minAge}+ YO</span>}
                    </div>
                    <BeyerExpectations race={race} horses={horses} />
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

function BeyerExpectations({ race, horses }: { race: { distance: number; entries: { horseId: string }[]; graded?: { grade: "G1" | "G2" | "G3" }; raceClass: string }; horses: { id: string; name: string; owned: boolean; stats: { speed: number; stamina: number; acceleration: number; consistency: number }; energy: number; form: number; raceHistory: { beyer?: number }[] }[] }) {
  const entered = race.entries
    .map((e) => horses.find((h) => h.id === e.horseId))
    .filter((h): h is NonNullable<typeof h> => !!h);
  if (entered.length === 0) return null;

  const classBonus =
    race.graded?.grade === "G1" ? 8 :
    race.graded?.grade === "G2" ? 5 :
    race.graded?.grade === "G3" ? 3 :
    race.raceClass === "Group" ? 4 :
    race.raceClass === "Stakes" ? 2 : 0;

  const projections = entered.map((h) => {
    // Blend model expectation with recent Beyer average for stability.
    const model = expectedBeyer(h as never, race.distance, classBonus);
    const recent = h.raceHistory.slice(0, 3).map((r) => r.beyer).filter((b): b is number => typeof b === "number");
    const avgRecent = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : null;
    const proj = avgRecent !== null ? Math.round(model * 0.6 + avgRecent * 0.4) : model;
    return { h, proj };
  }).sort((a, b) => b.proj - a.proj);

  const top = projections[0];
  const owned = projections.find((p) => p.h.owned);
  const fav = top.h.owned
    ? `Your ${top.h.name} projects best at ~${top.proj} Beyer.`
    : owned
    ? `${top.h.name} is favored (~${top.proj}); your ${owned.h.name} projects ~${owned.proj}.`
    : `${top.h.name} projects best at ~${top.proj} Beyer.`;

  return (
    <div className="mt-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-yellow-700 dark:text-yellow-400">Beyer expectations</span>
        <span className="text-muted-foreground">{race.distance}m projection</span>
      </div>
      <p className="text-foreground/80 mb-1">{fav}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
        {projections.slice(0, 5).map(({ h, proj }) => (
          <span key={h.id} className={h.owned ? "font-medium text-foreground" : ""}>
            {h.name} <span className="tabular-nums">{proj}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
