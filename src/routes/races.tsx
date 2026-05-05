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
import { RaceEntry } from "@/components/RaceEntry";
import { Race } from "@/game/types";
import { getCountry } from "@/game/gradedRaces";
import { getGradeColorClass } from "@/core/race/grading";
import { GradeBreakdown } from "@/components/races/GradeBreakdown";
import { RaceCard } from "@/components/races/RaceCard";
import { RaceRow } from "@/components/races/RaceRow";
import { NumericValue } from "@/components/HorseBits";

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
  const [enteringRace, setEnteringRace] = useState<Race | null>(null);

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
      .filter((r) => (country === "all" ? true : getCountry(r.graded?.trackId ?? "") === country))
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

  const countries = Array.from(new Set(races.filter(r => r.graded).map((r) => getCountry(r.graded!.trackId)))).filter(Boolean).sort() as string[];
  const tracks = Array.from(new Set(races.filter((r) => r.graded).map((r) => r.graded!.track))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">Race Calendar</h1>
          <p className="text-cream-muted font-[family-name:var(--font-body)]">View and enter upcoming races across all regions.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/calendar">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              Regional Calendar
            </Button>
          </Link>
          <Link to="/race-browser">
            <Button variant="outline" size="sm" className="gap-2">
              <Search className="h-4 w-4" />
              Race Browser
            </Button>
          </Link>
          <Link to="/recap">
            <Button variant="outline" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              Past Results
            </Button>
          </Link>
          <div className="border border-gold-muted rounded-md flex p-0.5 bg-t700">
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
          <Card className="border-gold-muted">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 font-[family-name:var(--font-display)]">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-cream-muted uppercase tracking-wider font-[family-name:var(--font-body)]">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-cream-muted" />
                  <Input
                    placeholder="Race name..."
                    className="pl-8 h-9 text-sm"
                    value={q}
                    onChange={(e) => updateFilter("q", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-cream-muted uppercase tracking-wider font-[family-name:var(--font-body)]">Grade</label>
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
                <label className="text-xs font-medium text-cream-muted uppercase tracking-wider font-[family-name:var(--font-body)]">Country</label>
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
                <label className="text-xs font-medium text-cream-muted uppercase tracking-wider font-[family-name:var(--font-body)]">Track</label>
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
                <label className="text-xs font-medium text-cream-muted uppercase tracking-wider font-[family-name:var(--font-body)]">Surface</label>
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
                <label className="text-xs font-medium text-cream-muted uppercase tracking-wider font-[family-name:var(--font-body)]">Ownership</label>
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
                className="w-full h-8 text-xs text-cream-muted"
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
            <h2 className="text-sm font-semibold text-cream-muted uppercase tracking-wider font-[family-name:var(--font-mono)] tabular-nums">
              <NumericValue value={filtered.length} /> Races found
            </h2>
          </div>

          {filtered.length === 0 ? (
            <Card className="border-dashed border-gold-muted">
              <CardContent className="p-12 text-center text-cream-muted font-[family-name:var(--font-body)]">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No races match your current filters.</p>
                <p className="text-sm mt-2 italic">Clear filters to see the full calendar.</p>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((r) => (
                <RaceCard key={r.id} race={r} onEnter={() => setEnteringRace(r as Race)} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <RaceRow key={r.id} race={r} onEnter={() => setEnteringRace(r as Race)} />
              ))}
            </div>
          )}
        </main>
      </div>
      {enteringRace && (
        <RaceEntry 
          race={enteringRace} 
          isOpen={!!enteringRace} 
          onClose={() => setEnteringRace(null)} 
        />
      )}
    </div>
  );
}
