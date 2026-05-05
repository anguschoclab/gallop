import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGame } from "@/game/store";
import { type Grade } from "@/game/gradedRaces";
import { getCountry } from "@/game/gradedRaces";
import { getGradeColorClass } from "@/core/race/grading";
import { useState, useMemo } from "react";

type GradeFilter = "all" | Grade;
type CountryFilter = "all" | string;
type TrackFilter = "all" | string;
type DistanceFilter = "all" | "sprint" | "mile" | "classic" | "stayer";

const GRADE_OPTIONS: GradeFilter[] = ["all", "G1", "G2", "G3"];
const DISTANCE_OPTIONS: { value: DistanceFilter; label: string; min?: number; max?: number }[] = [
  { value: "all", label: "All distances" },
  { value: "sprint", label: "Sprint (< 1400m)", max: 1399 },
  { value: "mile", label: "Mile (1400-1800m)", min: 1400, max: 1800 },
  { value: "classic", label: "Classic (1801-2400m)", min: 1801, max: 2400 },
  { value: "stayer", label: "Stayer (> 2400m)", min: 2401 },
];

export const Route = createFileRoute("/race-browser")({
  component: RaceBrowser,
});

function RaceBrowser() {
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [trackFilter, setTrackFilter] = useState<TrackFilter>("all");
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("all");
  const races = useGame((s) => s.races);

  // Extract unique countries and tracks from live race data
  const allCountries = useMemo(() => {
    return Array.from(new Set(races.filter(r => r.graded).map((r) => getCountry(r.graded!.track)))).sort();
  }, [races]);
  const allTracks = useMemo(() => {
    return Array.from(new Set(races.filter(r => r.graded).map((r) => r.graded?.track))).filter((t): t is string => Boolean(t)).sort();
  }, [races]);

  const filteredRaces = useMemo(() => {
    return races.filter((race) => {
      if (!race.graded) return false;
      
      // Grade filter
      if (gradeFilter !== "all" && race.graded.grade !== gradeFilter) return false;

      // Country filter
      if (countryFilter !== "all" && getCountry(race.graded.track) !== countryFilter) return false;

      // Track filter
      if (trackFilter !== "all" && race.graded.track !== trackFilter) return false;

      // Distance filter
      const distanceOption = DISTANCE_OPTIONS.find((opt) => opt.value === distanceFilter);
      if (distanceOption && distanceFilter !== "all") {
        if (distanceOption.min !== undefined && race.distance < distanceOption.min) return false;
        if (distanceOption.max !== undefined && race.distance > distanceOption.max) return false;
      }

      return true;
    });
  }, [gradeFilter, countryFilter, trackFilter, distanceFilter, races]);

  const gradeLabel: Record<GradeFilter, string> = {
    all: "All grades",
    G1: "G1 only",
    G2: "G2 only",
    G3: "G3 only",
  };
  const distanceLabel =
    DISTANCE_OPTIONS.find((opt) => opt.value === distanceFilter)?.label || "All distances";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Race Browser</h1>
        <p className="text-muted-foreground">Browse all graded stakes races worldwide</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Grade</label>
              <Select value={gradeFilter} onValueChange={(v) => setGradeFilter(v as GradeFilter)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {gradeLabel[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  {allCountries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Track</label>
              <Select value={trackFilter} onValueChange={setTrackFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All tracks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tracks</SelectItem>
                  {allTracks.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Distance</label>
              <Select
                value={distanceFilter}
                onValueChange={(v) => setDistanceFilter(v as DistanceFilter)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISTANCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              onClick={() => {
                setGradeFilter("all");
                setCountryFilter("all");
                setTrackFilter("all");
                setDistanceFilter("all");
              }}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset filters
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredRaces.length} of {races.filter(r => r.graded).length} graded stakes races
      </div>

      {/* Race list */}
      <div className="space-y-3">
        {filteredRaces.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No races match your filters
            </CardContent>
          </Card>
        ) : (
          filteredRaces.map((race) => {
            const hasOwnedEntry = race.entries.some((e) => e.owned);
            return (
              <Card key={race.id} className={`border-l-4 ${hasOwnedEntry ? "border-l-success bg-success/10" : "border-l-primary"}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold">{race.name}</h3>
                        {race.graded?.grade && (
                          <Badge variant="outline" className={getGradeColorClass(race.graded.grade)}>
                            {race.graded.grade}
                          </Badge>
                        )}
                        {hasOwnedEntry && (
                          <Badge className="bg-success text-success-foreground">Entered</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{race.graded?.track}</span>
                        <span>· {race.graded && getCountry(race.graded.track)}</span>
                        <span>· {race.distance}m</span>
                        <span>· {race.graded?.surface}</span>
                        <span>· Day {race.day}</span>
                        <span>
                          · Purse{" "}
                          <span className="font-medium text-foreground">
                            ${race.purse.toLocaleString()}
                          </span>
                        </span>
                      </div>
                      {race.restrictions && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {race.restrictions.minAge !== undefined &&
                            race.restrictions.maxAge !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                {race.restrictions.minAge}-{race.restrictions.maxAge}YO
                              </Badge>
                            )}
                          {race.restrictions.minAge !== undefined &&
                            race.restrictions.maxAge === undefined && (
                              <Badge variant="outline" className="text-xs">
                                {race.restrictions.minAge}+ YO
                              </Badge>
                            )}
                          {race.restrictions.gender && (
                            <Badge variant="outline" className="text-xs">
                              {race.restrictions.gender}
                            </Badge>
                          )}
                          {race.restrictions.minAgeNorthern !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              {race.restrictions.minAgeNorthern}+ YO (Northern)
                            </Badge>
                          )}
                          {race.restrictions.minAgeSouthern !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              {race.restrictions.minAgeSouthern}+ YO (Southern)
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
