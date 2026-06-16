import { Card, CardContent } from "@/components/ui/card";
import { useGame } from "@/game/store";
import { useRaceBrowserFilters } from "@/hooks/race/useRaceBrowserFilters";
import { RaceBrowserFilterBar } from "@/components/race/RaceBrowserFilterBar";
import { RaceBrowserCard } from "@/components/race/RaceBrowserCard";

export function BrowserTab() {
  const races = useGame((s) => s.races);
  const {
    gradeFilter,
    setGradeFilter,
    countryFilter,
    setCountryFilter,
    trackFilter,
    setTrackFilter,
    distanceFilter,
    setDistanceFilter,
    allCountries,
    allTracks,
    filteredRaces,
    reset,
    gradeLabel,
  } = useRaceBrowserFilters(races);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Race Browser
        </h2>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Browse all graded stakes races worldwide
        </p>
      </div>

      <RaceBrowserFilterBar
        gradeFilter={gradeFilter}
        setGradeFilter={setGradeFilter}
        countryFilter={countryFilter}
        setCountryFilter={setCountryFilter}
        trackFilter={trackFilter}
        setTrackFilter={setTrackFilter}
        distanceFilter={distanceFilter}
        setDistanceFilter={setDistanceFilter}
        allCountries={allCountries}
        allTracks={allTracks}
        gradeLabel={gradeLabel}
        onReset={reset}
      />

      <div className="text-sm text-cream-muted">
        Showing {filteredRaces.length} of {races.filter((r) => r.graded).length} graded stakes races
      </div>

      <div className="space-y-3">
        {filteredRaces.length === 0 ? (
          <Card className="border-gold-muted">
            <CardContent className="p-8 text-center text-cream-muted">
              No races match your filters
            </CardContent>
          </Card>
        ) : (
          filteredRaces.map((race) => <RaceBrowserCard key={race.id} race={race} />)
        )}
      </div>
    </div>
  );
}
