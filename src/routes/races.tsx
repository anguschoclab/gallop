import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter, Search, Trophy, MapPin, Globe, History, LayoutGrid, List } from "lucide-react";
import { useState, useMemo } from "react";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { cn } from "@/lib/utils";

type RaceFilters = {
  grade: string;
  country: string;
  surface: string;
  track: string;
  owned: string;
  q: string;
};

export const Route = createFileRoute("/races")({
  validateSearch: (search: Record<string, unknown>): RaceFilters => ({
    grade: (search.grade as string) || "all",
    country: (search.country as string) || "all",
    surface: (search.surface as string) || "all",
    track: (search.track as string) || "all",
    owned: (search.owned as string) || "all",
    q: (search.q as string) || "",
  }),
  component: RacesPage,
});

function RacesPage() {
  const { grade, country, surface, track, owned, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const races = useGame((s) => s.races);
  const horses = useGame((s) => s.horses);
  const day = useGame((s) => s.day);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const filtered = useMemo(() => {
    return races
      .filter((r) => !r.resolved && r.day >= day)
      .filter((r) => {
        if (grade !== "all") {
          if (grade === "Graded") return !!r.graded;
          if (grade === "Ungraded") return !r.graded;
          return r.graded?.grade === grade;
        }
        return true;
      })
      .filter((r) => (country === "all" ? true : r.country === country))
      .filter((r) => (surface === "all" ? true : r.surface === surface))
      .filter((r) => (track === "all" ? true : r.graded?.track === track))
      .filter((r) => {
        if (owned === "all") return true;
        const hasOwned = r.entries.some((e) => e.owned);
        return owned === "owned" ? hasOwned : !hasOwned;
      })
      .filter((r) => (q ? r.name.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => a.day - b.day);
  }, [races, day, grade, country, surface, track, owned, q]);

  const updateFilter = (key: keyof RaceFilters, value: string) => {
    navigate({
      search: (prev) => ({ ...prev, [key]: value }),
    });
  };

  const countries = Array.from(new Set(races.map((r) => r.country))).sort();
  const tracks = Array.from(new Set(races.filter((r) => r.graded).map((r) => r.graded!.track))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Race Calendar</h1>
          <p className="text-muted-foreground">View and enter upcoming races across all regions.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/recap">
            <Button variant="outline" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              Past Results
            </Button>
          </Link>
          <div className="border rounded-md flex p-0.5 bg-muted/50">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Race name..."
                    className="pl-8 h-9 text-sm"
                    value={q}
                    onChange={(e) => updateFilter("q", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Grade</label>
                <Select value={grade} onValueChange={(v) => updateFilter("grade", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    <SelectItem value="G1">Grade 1</SelectItem>
                    <SelectItem value="G2">Grade 2</SelectItem>
                    <SelectItem value="G3">Grade 3</SelectItem>
                    <SelectItem value="Graded">All Graded</SelectItem>
                    <SelectItem value="Ungraded">Ungraded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Country</label>
                <Select value={country} onValueChange={(v) => updateFilter("country", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Track</label>
                <Select value={track} onValueChange={(v) => updateFilter("track", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Tracks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tracks</SelectItem>
                    {tracks.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Surface</label>
                <div className="flex flex-wrap gap-2">
                  {["all", "Dirt", "Turf", "Synthetic"].map((s) => (
                    <Button
                      key={s}
                      variant={surface === s ? "secondary" : "outline"}
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => updateFilter("surface", s)}
                    >
                      {s === "all" ? "Any" : s}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ownership</label>
                <Select value={owned} onValueChange={(v) => updateFilter("owned", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Races" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Races</SelectItem>
                    <SelectItem value="owned">My Entries</SelectItem>
                    <SelectItem value="others">No My Entries</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs text-muted-foreground"
                onClick={() =>
                  navigate({
                    search: {
                      grade: "all",
                      country: "all",
                      surface: "all",
                      track: "all",
                      owned: "all",
                      q: "",
                    },
                  })
                }
              >
                Clear all filters
              </Button>
            </CardContent>
          </Card>

          <GradeBreakdown races={races} horses={horses} day={day} />
        </aside>

        <main className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {filtered.length} Races found
            </h2>
          </div>

          {filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No races match your current filters.</p>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((r) => (
                <RaceCard key={r.id} race={r} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <RaceRow key={r.id} race={r} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function RaceCard({ race }: { race: any }) {
  const ownedCount = race.entries.filter((e: any) => e.owned).length;
  const gradeLabel = race.graded?.grade;
  const gradeColor = gradeLabel ? getGradeColor(gradeLabel) : "bg-muted text-muted-foreground";

  return (
    <Card className={cn("overflow-hidden hover:border-primary/50 transition-colors", ownedCount > 0 && "border-success/30 bg-success/5")}>
      <CardContent className="p-0">
        <Link to="/race-browser" search={{ raceId: race.id }} className="block p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {gradeLabel && (
                  <Badge variant="outline" className={cn("h-5 px-1 text-[10px] font-bold", gradeColor)}>
                    {gradeLabel}
                  </Badge>
                )}
                <h3 className="font-bold text-base leading-tight truncate max-w-[180px]">{race.name}</h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {race.graded?.track || "Local Track"}</span>
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {race.country}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold tabular-nums">${race.purse.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Purse</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t text-[11px]">
            <div className="flex gap-3 text-muted-foreground tabular-nums">
              <span>{race.distance}m</span>
              <span>{race.surface}</span>
              <span>{race.raceClass}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground tabular-nums">Day {race.day}</span>
              {ownedCount > 0 && (
                <Badge variant="default" className="h-4 px-1 text-[9px] bg-success">
                  {ownedCount} Entered
                </Badge>
              )}
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

function RaceRow({ race }: { race: any }) {
  const ownedCount = race.entries.filter((e: any) => e.owned).length;
  const gradeLabel = race.graded?.grade;
  const gradeColor = gradeLabel ? getGradeColor(gradeLabel) : "";

  return (
    <Link
      to="/race-browser"
      search={{ raceId: race.id }}
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group",
        ownedCount > 0 && "border-success/30 bg-success/5"
      )}
    >
      <div className="w-12 text-center shrink-0">
        <div className="text-xs text-muted-foreground uppercase tracking-tighter">Day</div>
        <div className="text-lg font-bold tabular-nums leading-none">{race.day}</div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {gradeLabel && (
            <Badge variant="outline" className={cn("h-4 px-1 text-[9px] font-bold", gradeColor)}>
              {gradeLabel}
            </Badge>
          )}
          <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{race.name}</h3>
          {ownedCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
          <span className="truncate">{race.graded?.track || "Local Track"}</span>
          <span>{race.distance}m</span>
          <span>{race.surface}</span>
          <span>{race.raceClass}</span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-sm font-bold tabular-nums">${race.purse.toLocaleString()}</div>
        <div className="text-[10px] text-muted-foreground tabular-nums">{race.entries.length}/{race.fieldSize} full</div>
      </div>
    </Link>
  );
}

function GradeBreakdown({ races, horses, day }: { races: any[]; horses: any[]; day: number }) {
  const upcoming = races.filter((r) => !r.resolved && r.day >= day);
  const grades = ["G1", "G2", "G3"] as const;

  const gradeData = grades.map((grade) => {
    const gradeRaces = upcoming.filter((r) => r.graded?.grade === grade);
    const ownedEntries = gradeRaces.filter((r) => r.entries.some((e: any) => e.owned));
    
    let topProj = null;
    const allOwnedProjs: number[] = [];

    for (const r of ownedEntries) {
      const ownedIds = r.entries.filter((e: any) => e.owned).map((e: any) => e.horseId);
      for (const id of ownedIds) {
        const horse = horses.find((h) => h.id === id);
        if (horse) {
          const proj = horse.stats.speed + horse.stats.acceleration; // Simple proj Beyer
          allOwnedProjs.push(proj);
          if (!topProj || proj > topProj.proj) {
            topProj = { name: horse.name, proj };
          }
        }
      }
    }

    return {
      grade,
      total: gradeRaces.length,
      ownedCount: ownedEntries.length,
      topOwned: topProj,
      allOwnedProjs,
    };
  });

  const allOwnedProjs = gradeData.flatMap((d) => d.allOwnedProjs);
  let avgBeyer = null;
  if (allOwnedProjs.length > 0) {
    avgBeyer = Math.round(allOwnedProjs.reduce((s, v) => s + v, 0) / allOwnedProjs.length);
  }

  const gradeLabelColor: Record<"G1" | "G2" | "G3", string> = {
    G1: "text-fame border-fame/40 bg-fame/10",
    G2: "text-muted-foreground border-muted-foreground/40 bg-muted-foreground/10",
    G3: "text-info border-info/40 bg-info/10",
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {gradeData.map(({ grade, total, ownedCount, topOwned }) => (
            <div key={grade} className="space-y-2">
              <div className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${gradeLabelColor[grade]}`}>
                {grade}
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{total}</div>
                <div className="text-xs text-muted-foreground">races upcoming</div>
              </div>
              <div>
                <div className={`text-sm font-semibold tabular-nums ${ownedCount > 0 ? "text-success" : "text-muted-foreground"}`}>
                  {ownedCount} entered
                </div>
                <div className="text-xs text-muted-foreground">owned entries</div>
              </div>
              <div>
                {topOwned ? (
                  <>
                    <div className="text-sm font-semibold truncate">{topOwned.name}</div>
                    <div className="text-xs text-muted-foreground">top proj. ~{topOwned.proj} Beyer</div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Avg Beyer (owned entries):</span>
          <span className="text-sm font-bold tabular-nums">{avgBeyer ?? "—"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function getGradeColor(grade: string) {
  switch (grade) {
    case "G1":
      return "text-fame border-fame/40 bg-fame/10";
    case "G2":
      return "text-muted-foreground border-muted-foreground/40 bg-muted-foreground/10";
    case "G3":
      return "text-info border-info/40 bg-info/10";
    default:
      return "";
  }
}
