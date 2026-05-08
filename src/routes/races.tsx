import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { shallow } from "zustand/shallow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  Filter,
  Search,
  Trophy,
  MapPin,
  Globe,
  History,
  LayoutGrid,
  List,
  AlertTriangle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { cn } from "@/lib/utils";
import { RaceEntry } from "@/components/RaceEntry";
import { Race, Claim } from "@/game/types";
import { getCountry } from "@/game/gradedRaces";
import { getGradeColorClass } from "@/core/race/grading";
import { GradeBreakdown } from "@/components/races/GradeBreakdown";
import { RaceCard } from "@/components/races/RaceCard";
import { RaceRow } from "@/components/races/RaceRow";
import { NumericValue, formatCurrency } from "@/components/HorseBits";
import { toast } from "sonner";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const races = (useGame as any)((s: any) => s.races, shallow);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const horses = (useGame as any)((s: any) => s.horses, shallow);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const claims: Claim[] = (useGame as any)((s: any) => s.claims ?? [], shallow);
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const fileClaim = useGame((s) => s.fileClaim);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [enteringRace, setEnteringRace] = useState<Race | null>(null);
  const [claimingRace, setClaimingRace] = useState<Race | null>(null);
  const [pendingClaimHorseId, setPendingClaimHorseId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return races
      .filter((r: Race) => !r.resolved && r.day >= day)
      .filter((r: Race) => {
        if (grade !== "all") {
          if (grade === "Graded") return !!r.graded;
          if (grade === "Ungraded") return !r.graded;
          return r.graded?.grade === grade;
        }
        return true;
      })
      .filter((r: Race) => (country === "all" ? true : getCountry(r.graded?.trackId ?? "") === country))
      .filter((r: Race) => (surface === "all" ? true : r.surface === surface))
      .filter((r: Race) => (track === "all" ? true : r.graded?.track === track))
      .filter((r: Race) => {
        if (owned === "all") return true;
        const hasOwned = r.entries.some((e) => e.owned);
        return owned === "owned" ? hasOwned : !hasOwned;
      })
      .filter((r: Race) => (q ? r.name.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a: Race, b: Race) => a.day - b.day);
  }, [races, day, grade, country, surface, track, owned, q]);

  const updateFilter = (key: keyof RaceFilters, value: string) => {
    navigate({
      search: (prev) => ({ ...prev, [key]: value }),
    });
  };

  // ⚡ Bolt: Memoize filter options derived from large race lists
  // Prevents re-iterating over the entire races array on every render
  // (e.g., when the user types in the search input).
  const filterOptions = useMemo(() => {
    const gradedRaces = races.filter((r: Race) => r.graded);
    const uniqueCountries = Array.from(
      new Set(gradedRaces.map((r: Race) => getCountry(r.graded!.trackId))),
    )
      .filter(Boolean)
      .sort() as string[];

    const uniqueTracks = Array.from(new Set(gradedRaces.map((r: Race) => r.graded!.track))).sort();

    return { countries: uniqueCountries, tracks: uniqueTracks };
  }, [races]);

  const { countries, tracks } = filterOptions;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
            Race Calendar
          </h1>
          <p className="text-cream-muted font-[family-name:var(--font-body)]">
            View and enter upcoming races across all regions.
          </p>
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
                <label className="text-xs font-medium text-cream-muted uppercase tracking-wider font-[family-name:var(--font-body)]">
                  Search
                </label>
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
                <label className="text-xs font-medium text-cream-muted uppercase tracking-wider font-[family-name:var(--font-body)]">
                  Grade
                </label>
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
                <label className="text-xs font-medium text-cream-muted uppercase tracking-wider font-[family-name:var(--font-body)]">
                  Country
                </label>
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
                <label className="text-xs font-medium text-cream-muted uppercase tracking-wider font-[family-name:var(--font-body)]">
                  Track
                </label>
                <Select value={track} onValueChange={(v) => updateFilter("track", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Tracks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tracks</SelectItem>
                    {(tracks as string[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-cream-muted uppercase tracking-wider font-[family-name:var(--font-body)]">
                  Surface
                </label>
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
                <label className="text-xs font-medium text-cream-muted uppercase tracking-wider font-[family-name:var(--font-body)]">
                  Ownership
                </label>
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
              {filtered.map((r: Race) => (
                <RaceCard key={r.id} race={r} onEnter={() => setEnteringRace(r as Race)} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r: Race) => {
                const isClaiming = !!r.claiming;
                return (
                  <div key={r.id}>
                    <RaceRow race={r} onEnter={() => setEnteringRace(r as Race)} />
                    {/* D3 — Claiming race entries panel */}
                    {isClaiming && r.entries.length > 0 && (
                      <div className="ml-4 mt-1 mb-1 p-3 rounded-b-lg border border-t-0 border-gold-muted/50 bg-t900 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-warning flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Claiming Race Entries — {formatCurrency(r.claiming!.price)}
                        </p>
                        <div className="space-y-1">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {r.entries.map((entry: any) => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const entryHorse = horses.find((h: any) => h.id === entry.horseId);
                            const isOwned = !!entry.owned;
                            const playerClaimFiled = claims.some(
                              (c: Claim) =>
                                c.raceId === r.id &&
                                c.horseId === entry.horseId &&
                                c.claimantStableId === undefined,
                            );
                            const canAfford = cash >= r.claiming!.price;
                            return (
                              <div
                                key={entry.horseId}
                                className="flex items-center justify-between py-1 border-b border-gold-muted/20 last:border-0"
                              >
                                <Link
                                  to="/stable/$horseId"
                                  params={{ horseId: entry.horseId }}
                                  className="text-sm text-cream font-medium hover:underline hover:text-gold"
                                >
                                  {entryHorse?.name ?? entry.horseId}
                                  {isOwned && (
                                    <span className="ml-2 text-xs text-success">(your horse)</span>
                                  )}
                                </Link>
                                <div>
                                  {!isOwned &&
                                    (playerClaimFiled ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled
                                        className="text-xs"
                                      >
                                        Claim filed
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!canAfford}
                                        title={
                                          canAfford
                                            ? undefined
                                            : `You need ${formatCurrency(r.claiming!.price - cash)} to file this claim.`
                                        }
                                        className="text-xs"
                                        onClick={() => {
                                          setClaimingRace(r as Race);
                                          setPendingClaimHorseId(entry.horseId);
                                        }}
                                      >
                                        Claim {formatCurrency(r.claiming!.price)}
                                      </Button>
                                    ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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

      {/* D3 — Claim filing dialog */}
      {claimingRace &&
        pendingClaimHorseId &&
        (() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const horse = horses.find((h: any) => h.id === pendingClaimHorseId);
          const cp = claimingRace.claiming!.price;
          return (
            <AlertDialog
              open
              onOpenChange={(open) => {
                if (!open) {
                  setClaimingRace(null);
                  setPendingClaimHorseId(null);
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Claim {horse?.name} for {formatCurrency(cp)}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    If your claim is drawn, {formatCurrency(cp)} will be deducted from your account
                    and {horse?.name ?? "the horse"} will transfer to your stable after the race
                    completes. Multiple claims on the same horse are resolved randomly.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setClaimingRace(null);
                      setPendingClaimHorseId(null);
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      const result = fileClaim(claimingRace.id, pendingClaimHorseId);
                      setClaimingRace(null);
                      setPendingClaimHorseId(null);
                      if (result.ok) {
                        toast.success(`Claim filed on ${horse?.name} for ${formatCurrency(cp)}.`);
                      } else {
                        toast.error(`Claim failed: ${result.reason}`);
                      }
                    }}
                  >
                    File Claim
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          );
        })()}
    </div>
  );
}
