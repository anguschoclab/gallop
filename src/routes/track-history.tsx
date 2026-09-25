import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FilterX, Landmark, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGameWithShallow } from "@/game/store";
import { TrackLedgerRaces } from "@/components/history/TrackLedgerRaces";
import { TrackLedgerPrestigeTable } from "@/components/history/TrackLedgerPrestigeTable";
import { formatCurrency } from "@/lib/formatting";
import {
  filterTrackLedger,
  racesAtTrack,
  stablePrestigeAtTrack,
  summarizeTrackLedger,
  trackLedgerStableOptions,
  type TrackLedgerEntry,
} from "@/services/history/historyFacade";

const EMPTY_LEDGER: TrackLedgerEntry[] = [];

export const Route = createFileRoute("/track-history")({
  head: () => ({
    meta: [
      { title: "Course Histories — Racecourse Records & Prestige" },
      {
        name: "description",
        content:
          "Browse every race held at each racecourse: winners, winning times and how each stable's prestige moved.",
      },
      { property: "og:title", content: "Course Histories — Racecourse Records & Prestige" },
      {
        property: "og:description",
        content:
          "Browse every race held at each racecourse: winners, winning times and how each stable's prestige moved.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackHistoryPage,
});

function TrackHistoryPage() {
  const ledger = useGameWithShallow((s) => s.trackLedger ?? EMPTY_LEDGER) as TrackLedgerEntry[];
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [raceType, setRaceType] = useState("all");
  const [stableId, setStableId] = useState("all");

  const summaries = useMemo(() => summarizeTrackLedger(ledger), [ledger]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter(
      (s) => s.trackName.toLowerCase().includes(q) || s.country.toLowerCase().includes(q),
    );
  }, [summaries, query]);

  const activeId = selected ?? filtered[0]?.trackId ?? null;
  const active = summaries.find((s) => s.trackId === activeId);
  const courseLedger = useMemo(
    () => (activeId ? racesAtTrack(ledger, activeId) : []),
    [ledger, activeId],
  );
  const raceTypes = useMemo(
    () =>
      Array.from(
        new Set(
          courseLedger
            .map((entry) => entry.raceClass)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [courseLedger],
  );
  const stableOptions = useMemo(() => trackLedgerStableOptions(courseLedger), [courseLedger]);
  const filteredLedger = useMemo(
    () =>
      filterTrackLedger(courseLedger, {
        fromDay: fromDay === "" ? undefined : Number(fromDay),
        toDay: toDay === "" ? undefined : Number(toDay),
        raceType: raceType === "all" ? undefined : raceType,
        stableId: stableId === "all" ? undefined : stableId,
      }),
    [courseLedger, fromDay, toDay, raceType, stableId],
  );
  const races = filteredLedger;
  const prestigeRows = useMemo(
    () =>
      stablePrestigeAtTrack(filteredLedger).filter(
        (row) => stableId === "all" || row.stableId === stableId,
      ),
    [filteredLedger, stableId],
  );
  const filtersActive = fromDay !== "" || toDay !== "" || raceType !== "all" || stableId !== "all";

  const resetFilters = () => {
    setFromDay("");
    setToDay("");
    setRaceType("all");
    setStableId("all");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Course Histories
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Every race held at each racecourse — winners, times and prestige movement
        </p>
      </div>

      {ledger.length === 0 ? (
        <Card className="border-white/5 bg-slate-900/40">
          <CardContent className="p-6 text-sm text-cream-muted flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            No races have been run yet. Advance a few days and results will start filling in here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search course or country"
              aria-label="Search courses"
            />
            <div className="space-y-1 max-h-[32rem] overflow-y-auto pr-1">
              {filtered.map((s) => (
                <button
                  key={s.trackId}
                  type="button"
                  onClick={() => setSelected(s.trackId)}
                  aria-pressed={s.trackId === activeId}
                  className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                    s.trackId === activeId
                      ? "bg-primary/20 text-cream"
                      : "bg-muted/30 text-cream-muted hover:text-cream"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{s.trackName}</span>
                    <span className="tabular-nums text-[11px]">{s.raceCount}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-cream-muted">
                    <MapPin className="h-3 w-3" />
                    {s.country}
                    {s.gradedCount > 0 && <span>· {s.gradedCount} graded</span>}
                    {s.playerWins > 0 && <span>· {s.playerWins} yours</span>}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-xs text-cream-muted">No courses match that search.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {active && (
              <Card className="border-white/5 bg-slate-900/40">
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-cream truncate">{active.trackName}</h2>
                    <p className="text-xs text-cream-muted">
                      {active.country} · Day {active.firstDay}–{active.lastDay}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <Badge variant="outline">{active.raceCount} races</Badge>
                    <Badge variant="outline">{active.gradedCount} graded</Badge>
                    <Badge variant="outline">{formatCurrency(active.totalPurse)} in purses</Badge>
                    <Badge variant={active.playerWins > 0 ? "default" : "outline"}>
                      {active.playerWins} won by you
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-white/5 bg-slate-900/40">
              <CardContent className="p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[8rem_8rem_minmax(10rem,1fr)_minmax(12rem,1fr)_auto] xl:items-end">
                  <label className="space-y-1 text-[11px] font-semibold uppercase text-cream-muted">
                    From day
                    <Input
                      type="number"
                      min={1}
                      value={fromDay}
                      onChange={(event) => setFromDay(event.target.value)}
                      placeholder="First"
                      aria-label="From game day"
                    />
                  </label>
                  <label className="space-y-1 text-[11px] font-semibold uppercase text-cream-muted">
                    To day
                    <Input
                      type="number"
                      min={1}
                      value={toDay}
                      onChange={(event) => setToDay(event.target.value)}
                      placeholder="Latest"
                      aria-label="To game day"
                    />
                  </label>
                  <label className="space-y-1 text-[11px] font-semibold uppercase text-cream-muted">
                    Race type
                    <Select value={raceType} onValueChange={setRaceType}>
                      <SelectTrigger aria-label="Race type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All race types</SelectItem>
                        {raceTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-1 text-[11px] font-semibold uppercase text-cream-muted">
                    Stable
                    <Select value={stableId} onValueChange={setStableId}>
                      <SelectTrigger aria-label="Stable">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All stables</SelectItem>
                        {stableOptions.map((stable) => (
                          <SelectItem key={stable.stableId} value={stable.stableId}>
                            {stable.isPlayer ? `${stable.stableName} (You)` : stable.stableName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!filtersActive}
                    onClick={resetFilters}
                    className="sm:col-span-2 xl:col-span-1"
                  >
                    <FilterX />
                    Clear filters
                  </Button>
                </div>
                <p className="mt-3 text-xs text-cream-muted" aria-live="polite">
                  Showing {races.length} of {courseLedger.length} races
                </p>
              </CardContent>
            </Card>

            <TrackLedgerPrestigeTable rows={prestigeRows} />
            <TrackLedgerRaces
              races={races}
              emptyMessage={filtersActive ? "No races match these filters." : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}
