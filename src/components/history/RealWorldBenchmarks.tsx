import { useMemo, useState } from "react";
import { Globe2, Search, Trophy, Compass, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RaceTimeDisplay } from "@/components/race/RaceTimeDisplay";
import { HorseBenchmarkDialog } from "@/components/history/HorseBenchmarkDialog";
import { compareToRealWorld, type BenchmarkComparison } from "@/services/history/historyFacade";
import {
  type RealWorldRecordSource,
  type TripCategory,
  getTripCategory,
} from "@/data/realWorldRecords";
import type { TrackRecord } from "@/services/history/historyFacade";
import { cn } from "@/lib/cn";

type MatchFilter = "all" | "outpaced" | "matched" | "uncontested";

export function RealWorldBenchmarks({ records }: { records: TrackRecord[] }) {
  const comparisons = useMemo(() => compareToRealWorld(records), [records]);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  // Filter states
  const [sourceFilter, setSourceFilter] = useState<"all" | RealWorldRecordSource>("all");
  const [surfaceFilter, setSurfaceFilter] = useState<"all" | "Turf" | "Dirt" | "Synthetic">("all");
  const [tripFilter, setTripFilter] = useState<"all" | TripCategory>("all");
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Source counts
  const counts = useMemo(() => {
    let curated = 0;
    let trackRecord = 0;
    for (const c of comparisons) {
      if (c.benchmark.source === "curated") curated += 1;
      else if (c.benchmark.source === "track_record") trackRecord += 1;
    }
    return {
      all: comparisons.length,
      curated,
      track_record: trackRecord,
    };
  }, [comparisons]);

  // Overall KPI statistics
  const kpis = useMemo(() => {
    const tracksSet = new Set<string>();
    let exactMatches = 0;
    let outpaced = 0;
    for (const c of comparisons) {
      tracksSet.add(c.benchmark.track);
      if (c.isExactTrackMatch) exactMatches += 1;
      if (c.speedDeltaPct !== undefined && c.speedDeltaPct > 0) outpaced += 1;
    }
    return {
      totalRecords: comparisons.length,
      distinctTracks: tracksSet.size,
      exactMatches,
      outpaced,
    };
  }, [comparisons]);

  // Filtered dataset
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return comparisons.filter((c) => {
      // Source filter
      if (sourceFilter !== "all" && c.benchmark.source !== sourceFilter) return false;

      // Surface filter
      if (surfaceFilter !== "all" && c.benchmark.surface !== surfaceFilter) return false;

      // Trip category filter
      if (tripFilter !== "all" && getTripCategory(c.benchmark.distanceMeters) !== tripFilter)
        return false;

      // Match status filter
      if (matchFilter === "outpaced" && !(c.speedDeltaPct !== undefined && c.speedDeltaPct > 0))
        return false;
      if (matchFilter === "matched" && !c.gameRecord) return false;
      if (matchFilter === "uncontested" && c.gameRecord) return false;

      // Search query filter
      if (q) {
        const matchesHorse = c.benchmark.horse.toLowerCase().includes(q);
        const matchesTrack = c.benchmark.track.toLowerCase().includes(q);
        const matchesRace = c.benchmark.race.toLowerCase().includes(q);
        const matchesCountry = c.benchmark.country.toLowerCase().includes(q);
        if (!matchesHorse && !matchesTrack && !matchesRace && !matchesCountry) return false;
      }

      return true;
    });
  }, [comparisons, sourceFilter, surfaceFilter, tripFilter, matchFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Information Header */}
      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-4 flex items-start gap-2 text-xs text-cream-muted">
          <Globe2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <p>
            Explore authentic historical track records by course and distance alongside curated
            legend milestones. Matched against in-game records set in your world to see where your
            horses stand against real-world racing history. Reference only — these never alter your
            game state.
          </p>
        </CardContent>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="border border-white/5 bg-slate-900/60 p-2.5 rounded-lg flex flex-col justify-between">
          <div className="text-[10px] font-mono uppercase tracking-wide text-cream/50">
            Reference Records
          </div>
          <div className="font-mono text-xl font-bold text-cream my-0.5">{kpis.totalRecords}</div>
          <div className="text-[10px] font-mono text-cream/40">Across world venues</div>
        </div>

        <div className="border border-white/5 bg-slate-900/60 p-2.5 rounded-lg flex flex-col justify-between">
          <div className="text-[10px] font-mono uppercase tracking-wide text-cream/50">Tracks</div>
          <div className="font-mono text-xl font-bold text-cream my-0.5">{kpis.distinctTracks}</div>
          <div className="text-[10px] font-mono text-cream/40">Official racecourses</div>
        </div>

        <div className="border border-white/5 bg-slate-900/60 p-2.5 rounded-lg flex flex-col justify-between">
          <div className="text-[10px] font-mono uppercase tracking-wide text-cream/50">
            Exact Track Matches
          </div>
          <div className="font-mono text-xl font-bold text-cream my-0.5">{kpis.exactMatches}</div>
          <div className="text-[10px] font-mono text-cream/40">Same course & distance</div>
        </div>

        <div className="border border-white/5 bg-slate-900/60 p-2.5 rounded-lg flex flex-col justify-between">
          <div className="text-[10px] font-mono uppercase tracking-wide text-cream/50">
            Records Outpaced
          </div>
          <div className="font-mono text-xl font-bold text-emerald-400 my-0.5">{kpis.outpaced}</div>
          <div className="text-[10px] font-mono text-cream/40">Beaten by your world</div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-4 space-y-3">
          {/* Source Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSourceFilter("all")}
              aria-pressed={sourceFilter === "all"}
              className={cn(
                "rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
                sourceFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-cream-muted hover:text-cream",
              )}
            >
              All Sources
              <span className="ml-2 opacity-60 tabular-nums">{counts.all}</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter("curated")}
              aria-pressed={sourceFilter === "curated"}
              className={cn(
                "rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
                sourceFilter === "curated"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-cream-muted hover:text-cream",
              )}
            >
              Curated
              <span className="ml-2 opacity-60 tabular-nums">{counts.curated}</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter("track_record")}
              aria-pressed={sourceFilter === "track_record"}
              className={cn(
                "rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
                sourceFilter === "track_record"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-cream-muted hover:text-cream",
              )}
            >
              Track Records
              <span className="ml-2 opacity-60 tabular-nums">{counts.track_record}</span>
            </button>
          </div>

          {/* Search bar & Category filters */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-cream-muted" />
              <Input
                placeholder="Search by horse, track, or race..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-950/40 border-white/10 text-cream"
              />
            </div>

            {/* Surface filters */}
            <div className="flex items-center gap-1">
              {(["all", "Turf", "Dirt", "Synthetic"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSurfaceFilter(s)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] rounded transition-colors",
                    surfaceFilter === s
                      ? "bg-primary/20 text-primary font-semibold border border-primary/30"
                      : "text-cream-muted hover:text-cream border border-transparent",
                  )}
                >
                  {s === "all" ? "All Surfaces" : s}
                </button>
              ))}
            </div>

            {/* Trip category filters */}
            <div className="flex items-center gap-1 flex-wrap">
              {(
                [
                  { id: "all", label: "All Trips" },
                  { id: "sprint", label: "Sprint" },
                  { id: "mile", label: "Mile" },
                  { id: "route", label: "Route" },
                  { id: "staying", label: "Staying" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTripFilter(t.id)}
                  className={cn(
                    "px-2 py-1 text-[11px] rounded transition-colors",
                    tripFilter === t.id
                      ? "bg-primary/20 text-primary font-semibold border border-primary/30"
                      : "text-cream-muted hover:text-cream border border-transparent",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmark Cards Grid */}
      {filtered.length === 0 ? (
        <Card className="border-white/5 bg-slate-900/40">
          <CardContent className="p-8 text-center text-sm text-cream-muted">
            No historical records match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(({ benchmark, gameRecord, isExactTrackMatch, speedDeltaPct }) => (
            <Card key={benchmark.id} className="border-white/5 bg-slate-900/40">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-cream truncate">{benchmark.horse}</h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1.5 py-0",
                          benchmark.source === "curated"
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                            : "bg-blue-500/10 text-blue-300 border-blue-500/30",
                        )}
                      >
                        {benchmark.source === "curated" ? "Curated" : "Track Record"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-cream-muted truncate">
                      {benchmark.race} · {benchmark.track} ({benchmark.country}) · {benchmark.year}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                    {benchmark.distanceMeters}m {benchmark.surface}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-cream-muted">Real-world mark</span>
                  <RaceTimeDisplay
                    seconds={benchmark.seconds}
                    distance={benchmark.distanceMeters}
                    className="text-xs"
                  />
                </div>

                {gameRecord ? (
                  <div className="space-y-1 border-t border-white/5 pt-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <span className="text-cream-muted truncate">
                          Your world:{" "}
                          <button
                            type="button"
                            onClick={() =>
                              setSelected({ id: gameRecord.horseId, name: gameRecord.horseName })
                            }
                            className="text-cream underline decoration-dotted underline-offset-2 hover:text-gold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded-sm"
                            aria-label={`Compare ${gameRecord.horseName} against reference times`}
                          >
                            {gameRecord.horseName}
                          </button>{" "}
                          · {gameRecord.trackName} {gameRecord.distance}m
                        </span>
                        {isExactTrackMatch && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shrink-0"
                          >
                            Exact Track
                          </Badge>
                        )}
                      </div>

                      <RaceTimeDisplay
                        seconds={gameRecord.time}
                        distance={gameRecord.distance}
                        className="text-xs shrink-0"
                      />
                    </div>
                    {speedDeltaPct !== undefined && (
                      <Badge
                        variant={speedDeltaPct >= 0 ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {speedDeltaPct >= 0 ? "+" : ""}
                        {speedDeltaPct.toFixed(2)}% pace vs benchmark
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="border-t border-white/5 pt-2 text-[11px] text-cream-muted">
                    No comparable record set in your world yet.
                  </p>
                )}

                <p className="text-[11px] italic text-cream-muted">{benchmark.note}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <HorseBenchmarkDialog
          horseId={selected.id}
          horseName={selected.name}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      )}
    </div>
  );
}
