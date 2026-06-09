import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { shallow } from "zustand/shallow";
import type { GameState } from "@/game/types";
import { useRaces, useHorses } from "@/hooks/game/useCoreState";
import { Button } from "@/components/ui/button";
import { GradeBreakdown } from "@/components/race/GradeBreakdown";
import { RaceEntry } from "@/components/race/RaceEntry";
import { RaceFilterPanel } from "@/components/race/RaceFilterPanel";
import { RaceFeed } from "@/components/race/RaceFeed";
import { NumericValue } from "@/components/horse/HorseBits";
import { useRaceFilters, type RaceFilters } from "@/hooks/useRaceFilters";
import { useState } from "react";
import { Race } from "@/game/types";
import { Calendar, History, Globe } from "lucide-react";

export const Route = createFileRoute("/races")({
  validateSearch: (search: Record<string, unknown>): RaceFilters => ({
    grade: (search.grade as string) || "all",
    country: (search.country as string) || "all",
    surface: (search.surface as string) || "all",
    track: (search.track as string) || "all",
    owned: (search.owned as string) || "all",
    q: (search.q as string) || "",
    stableId: (search.stableId as string) || undefined,
  }),
  component: RacesPage,
});

function RacesPage() {
  const filters = Route.useSearch();
  const { grade, country, owned, q } = filters;
  const navigate = Route.useNavigate();
  const races = useRaces();
  const horses = useHorses();
  const claims = (useGame as any)((s: GameState) => s.claims ?? [], shallow);
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s) => s.cash);
  const fileClaim = useGame((s) => s.fileClaim);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [enteringRace, setEnteringRace] = useState<Race | null>(null);

  const { filteredRaces, countries, tracks } = useRaceFilters(races, day, filters);

  const updateFilter = (key: keyof RaceFilters, value: string) => {
    navigate({
      search: (prev: RaceFilters) => ({ ...prev, [key]: value }),
    });
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Circuit Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-success/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-success uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-xs font-bold mb-1 opacity-60">
            <Globe className="h-3.5 w-3.5" />
            Global Racing Circuit
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
            Race Schedule
          </h1>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>Races Listed: <NumericValue value={filteredRaces.length} /></span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Regions: <NumericValue value={countries.length} /></span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Season Day: <NumericValue value={day} /></span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link to="/calendar">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-white/5 hover:bg-white/5 text-cream/40 font-bold uppercase text-[10px] tracking-widest"
            >
              <Calendar className="h-3.5 w-3.5" />
              Regional View
            </Button>
          </Link>
          <Link to="/recap">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-white/5 hover:bg-white/5 text-cream/40 font-bold uppercase text-[10px] tracking-widest"
            >
              <History className="h-3.5 w-3.5" />
              Past Results
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start">
        <RaceFilterPanel
          q={q}
          onSearchChange={(v) => updateFilter("q", v)}
          grade={grade}
          onGradeChange={(v) => updateFilter("grade", v)}
          country={country}
          onCountryChange={(v) => updateFilter("country", v)}
          owned={owned}
          onOwnedChange={(v) => updateFilter("owned", v)}
          countries={countries}
          onReset={() =>
            navigate({
              search: {
                grade: "all",
                country: "all",
                surface: "all",
                track: "all",
                owned: "all",
                q: "",
                stableId: undefined,
              },
            })
          }
        />

        <RaceFeed
          races={filteredRaces}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onEnterRace={setEnteringRace}
          horses={horses}
          claims={claims}
          cash={cash}
          fileClaim={fileClaim}
        />
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
