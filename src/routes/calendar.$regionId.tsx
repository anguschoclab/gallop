import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Grade } from "@/data/gradedRaces";
import { getRegion, isValidRegion } from "@/core/calendar/regions";
import { MonthView } from "@/components/calendar/MonthView";
import { TrackView } from "@/components/calendar/TrackView";
import { RegionSwitcher } from "@/components/RegionSwitcher";
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";
import { useCalendarFilters } from "@/hooks/calendar/useCalendarFilters";
import { ChevronLeft, Globe } from "lucide-react";

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
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { region, currentDay, regionRaces, filteredRaces } = useCalendarFilters(regionId, search);

  const updateFilter = (key: keyof CalendarSearch, value: string) => {
    navigate({
      search: (prev: CalendarSearch) => ({ ...prev, [key]: value }),
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
        <RegionSwitcher currentRegion={region} />
      </div>

      {/* Filters */}
      <Card className="border-gold-muted">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-cream">Grade:</span>
                <div className="flex gap-1">
                  {(["all", "G1", "G2", "G3"] as const).map((g) => (
                    <Button
                      key={g}
                      size="sm"
                      variant={search.grade === g ? "default" : "outline"}
                      onClick={() => updateFilter("grade", g)}
                    >
                      {g === "all" ? "All" : g}
                    </Button>
                  ))}
                </div>
              </div>

              {region.specialRaceKeys && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{region.specialFilterName}:</span>
                  <div className="flex gap-1">
                    {(["all", "only", "exclude"] as const).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={search.special === s ? "default" : "outline"}
                        onClick={() => updateFilter("special", s)}
                      >
                        {s === "all" ? "All" : s === "only" ? "Only" : "Exclude"}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">View:</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={search.view === "month" ? "default" : "outline"}
                    onClick={() => updateFilter("view", "month")}
                  >
                    By Month
                  </Button>
                  <Button
                    size="sm"
                    variant={search.view === "track" ? "default" : "outline"}
                    onClick={() => updateFilter("view", "track")}
                  >
                    By Track
                  </Button>
                </div>
              </div>
            </div>

            {/* Weather Forecast for first track in region */}
            {filteredRaces.length > 0 && (
              <WeatherForecastStrip trackId={filteredRaces[0].trackId} />
            )}
          </div>

          <div className="mt-3 text-sm text-cream-muted">
            Showing {filteredRaces.length} of {regionRaces.length} races
          </div>
        </CardContent>
      </Card>

      {search.view === "month" ? (
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
