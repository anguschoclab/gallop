import { useGame } from "@/platform/game/store";
import { EmptyState } from "@/shared/ui/common/EmptyState";
import { Flag } from "lucide-react";
import { useRaceBrowserFilters } from "@/domains/race/application/hooks/useRaceBrowserFilters";
import { RaceBrowserFilterBar } from "@/domains/race/ui/RaceBrowserFilterBar";
import { RaceBrowserCard } from "@/domains/race/ui/RaceBrowserCard";

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
  } = useRaceBrowserFilters(Object.values(races));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-display)]">
          Race Browser
        </h2>
        <p className="text-muted-foreground font-[family-name:var(--font-body)]">
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

      <div className="text-sm text-muted-foreground">
        Showing {filteredRaces.length} of {Object.values(races).filter((r) => r.graded).length}{" "}
        graded stakes races
      </div>

      <div className="space-y-3">
        {filteredRaces.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="No races found"
            description="No races match your filters."
            action={{ label: "Reset filters", onClick: reset }}
          />
        ) : (
          filteredRaces.map((race) => <RaceBrowserCard key={race.id} race={race} />)
        )}
      </div>
    </div>
  );
}
