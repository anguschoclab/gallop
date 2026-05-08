import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useGame } from "@/game/store";
import { type Grade } from "@/game/gradedRaces";
import type { Race } from "@/game/types";
import { getGradeColorClass } from "@/core/race/grading";
import { getMonthName, formatDate } from "@/core/calendar/dateFormatting";
import { getRegion, isValidRegion, REGION_LIST, type RegionConfig } from "@/core/calendar/regions";
import { ChevronLeft, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegionSwitcher } from "@/components/RegionSwitcher";

interface CalendarSearch {
  grade?: Grade | "all";
  special?: "all" | "only" | "exclude";
  view?: "month" | "track";
}

export const Route = createFileRoute("/calendar/$regionId")({
  component: RegionalCalendarPage,
  validateSearch: (search: Record<string, unknown>): CalendarSearch => ({
    grade: (search.grade as Grade | "all") || "all",
    special: (search.special as "all" | "only" | "exclude") || "all",
    view: (search.view as "month" | "track") || "month",
  }),
  beforeLoad: ({ params }) => {
    if (!isValidRegion(params.regionId)) {
      throw notFound();
    }
  },
});

function RegionalCalendarPage() {
  const { regionId } = Route.useParams();
  const { grade, special, view } = Route.useSearch();
  const navigate = Route.useNavigate();
  const region = getRegion(regionId)!;

  const races = useGame((s) => s.races);
  const currentDay = useGame((s) => s.day);

  // Filter races by region tracks
  const regionRaces = races.filter(
    (race) => race.graded && region.tracks.includes(race.graded.track),
  );

  // Apply filters
  const filteredRaces = regionRaces.filter((race) => {
    if (grade !== "all" && race.graded?.grade !== grade) return false;
    if (special !== "all" && region.specialRaceKeys) {
      const isSpecial = region.specialRaceKeys.has(race.graded?.key ?? "");
      if (special === "only" && !isSpecial) return false;
      if (special === "exclude" && isSpecial) return false;
    }
    return true;
  });

  // Update URL when filters change
  const updateFilter = (key: keyof CalendarSearch, value: string) => {
    navigate({
      search: (prev) => ({ ...prev, [key]: value }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cream-muted mb-1">
            <Link
              to="/races"
              className="hover:text-cream flex items-center gap-1"
              search={{
                grade: "all",
                country: "all",
                surface: "all",
                track: "all",
                owned: "all",
                q: "",
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              All Races
            </Link>
            <span>/</span>
            <span className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              Calendars
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
            {region.title}
          </h1>
          <p className="text-cream-muted font-[family-name:var(--font-body)]">{region.subtitle}</p>
        </div>

        {/* Region Switcher */}
        <RegionSwitcher currentRegion={region} />
      </div>

      {/* Filters */}
      <Card className="border-gold-muted">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Grade Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-cream">Grade:</span>
              <div className="flex gap-1">
                {(["all", "G1", "G2", "G3"] as const).map((g) => (
                  <Button
                    key={g}
                    size="sm"
                    variant={grade === g ? "default" : "outline"}
                    onClick={() => updateFilter("grade", g)}
                  >
                    {g === "all" ? "All" : g}
                  </Button>
                ))}
              </div>
            </div>

            {/* Special Filter (Triple Crown/Classics) */}
            {region.specialRaceKeys && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{region.specialFilterName}:</span>
                <div className="flex gap-1">
                  {(["all", "only", "exclude"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={special === s ? "default" : "outline"}
                      onClick={() => updateFilter("special", s)}
                    >
                      {s === "all" ? "All" : s === "only" ? "Only" : "Exclude"}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* View Toggle */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium">View:</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={view === "month" ? "default" : "outline"}
                  onClick={() => updateFilter("view", "month")}
                >
                  By Month
                </Button>
                <Button
                  size="sm"
                  variant={view === "track" ? "default" : "outline"}
                  onClick={() => updateFilter("view", "track")}
                >
                  By Track
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-3 text-sm text-cream-muted">
            Showing {filteredRaces.length} of {regionRaces.length} races
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      {view === "month" ? (
        <MonthView races={filteredRaces} region={region} currentDay={currentDay} />
      ) : (
        <TrackView races={filteredRaces} region={region} currentDay={currentDay} />
      )}

      {filteredRaces.length === 0 && (
        <Card className="border-gold-muted">
          <CardContent className="p-8 text-center text-cream-muted">
            No races match your filters.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Month-based calendar view */
function MonthView({
  races,
  region,
  currentDay,
}: {
  races: Race[];
  region: RegionConfig;
  currentDay: number;
}) {
  // Group races by month
  const racesByMonth = races.reduce(
    (acc, race) => {
      const dayOfYear = ((race.day - 1) % 365) + 1;
      const monthName = getMonthName(dayOfYear);
      if (!acc[monthName]) acc[monthName] = [];
      acc[monthName].push(race);
      return acc;
    },
    {} as Record<string, Race[]>,
  );

  return (
    <>
      {Object.entries(racesByMonth).map(([month, monthRaces]) => (
        <Card key={month}>
          <CardHeader>
            <CardTitle className="text-xl">{month}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {monthRaces
              .sort((a: Race, b: Race) => a.day - b.day)
              .map((race: Race) => {
                const isSpecial = region.specialRaceKeys?.has(race.graded?.key ?? "");
                const hasOwnedEntry = race.entries.some((e) => e.owned);
                return (
                  <div
                    key={race.id}
                    className={`flex items-start justify-between gap-4 p-3 rounded-lg border ${
                      isSpecial
                        ? "border-l-4 border-l-fame bg-fame/10"
                        : hasOwnedEntry
                          ? "border-l-4 border-l-success bg-success/10"
                          : ""
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold">{race.name}</h3>
                        {race.graded?.grade && (
                          <Badge
                            variant="outline"
                            className={getGradeColorClass(race.graded.grade)}
                          >
                            {race.graded.grade}
                          </Badge>
                        )}
                        {isSpecial && region.specialFilterName && (
                          <Badge className="bg-fame/20 text-fame border-fame/40">
                            {region.specialFilterName}
                          </Badge>
                        )}
                        {hasOwnedEntry && (
                          <Badge className="bg-success text-success-foreground">Entered</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-cream-muted">
                        <span>{race.graded?.track}</span>
                        <span>{race.distance}m</span>
                        <span>{race.graded?.surface}</span>
                        <span>
                          Purse{" "}
                          <span className="font-medium text-cream">
                            ${race.purse.toLocaleString()}
                          </span>
                        </span>
                        {race.restrictions?.minAge !== undefined && (
                          <span>
                            {race.restrictions.minAge === race.restrictions.maxAge
                              ? `${race.restrictions.minAge}YO only`
                              : race.restrictions.maxAge
                                ? `${race.restrictions.minAge}-${race.restrictions.maxAge}YO`
                                : `${race.restrictions.minAge}+ YO`}
                          </span>
                        )}
                        {race.restrictions?.gender && (
                          <span>
                            {race.restrictions.gender === "filly" ? "Fillies" : "Colts"} only
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">Day {race.day}</div>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ))}
    </>
  );
}

/** Track-based calendar view */
function TrackView({
  races,
  region,
  currentDay,
}: {
  races: Race[];
  region: RegionConfig;
  currentDay: number;
}) {
  // Group races by track
  const racesByTrack = region.tracks.reduce(
    (acc, track) => {
      const trackRaces = races.filter((r) => r.graded?.track === track);
      if (trackRaces.length > 0) {
        acc[track] = trackRaces.sort((a: Race, b: Race) => a.day - b.day);
      }
      return acc;
    },
    {} as Record<string, Race[]>,
  );

  return (
    <>
      {Object.entries(racesByTrack).map(([track, trackRaces]) => (
        <Card key={track}>
          <CardHeader>
            <CardTitle className="text-xl">{track}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trackRaces.map((race: Race) => {
              const isSpecial = region.specialRaceKeys?.has(race.graded?.key ?? "");
              const hasOwnedEntry = race.entries.some((e) => e.owned);
              return (
                <div
                  key={race.id}
                  className={`flex items-start justify-between gap-4 p-3 rounded-lg border ${
                    isSpecial
                      ? "border-l-4 border-l-fame bg-fame/10"
                      : hasOwnedEntry
                        ? "border-l-4 border-l-success bg-success/10"
                        : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold">{race.name}</h3>
                      {race.graded?.grade && (
                        <Badge variant="outline" className={getGradeColorClass(race.graded.grade)}>
                          {race.graded.grade}
                        </Badge>
                      )}
                      {isSpecial && region.specialFilterName && (
                        <Badge className="bg-fame/20 text-fame border-fame/40">
                          {region.specialFilterName}
                        </Badge>
                      )}
                      {hasOwnedEntry && (
                        <Badge className="bg-success text-success-foreground">Entered</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{race.distance}m</span>
                      <span>{race.graded?.surface}</span>
                      <span>
                        Purse{" "}
                        <span className="font-medium text-cream">
                          ${race.purse.toLocaleString()}
                        </span>
                      </span>
                      {race.restrictions?.minAge !== undefined && (
                        <span>
                          {race.restrictions.minAge === race.restrictions.maxAge
                            ? `${race.restrictions.minAge}YO only`
                            : race.restrictions.maxAge
                              ? `${race.restrictions.minAge}-${race.restrictions.maxAge}YO`
                              : `${race.restrictions.minAge}+ YO`}
                        </span>
                      )}
                      {race.restrictions?.gender && (
                        <span>
                          {race.restrictions.gender === "filly" ? "Fillies" : "Colts"} only
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">Day {race.day}</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
