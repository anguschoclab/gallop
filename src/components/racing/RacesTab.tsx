import { useGame, useGameWithShallow } from "@/game/store";
import { shallow } from "zustand/shallow";
import type { GameState } from "@/game/types";
import { useRaces, useHorses } from "@/hooks/game/useCoreState";
import { Button } from "@/components/ui/button";
import { RaceEntry } from "@/components/race/RaceEntry";
import { RaceFilterPanel } from "@/components/race/RaceFilterPanel";
import { RaceFeed } from "@/components/race/RaceFeed";
import { RaceQuickFilters } from "@/components/race/RaceQuickFilters";
import { NumericValue } from "@/components/horse/HorseBits";
import { useRaceFilters, type RaceFilters } from "@/hooks/race/useRaceFilters";
import { useState } from "react";
import { Race } from "@/game/types";
import { Globe } from "lucide-react";

export function RacesTab() {
  const filters: RaceFilters = {
    grade: "all",
    country: "all",
    surface: "all",
    track: "all",
    owned: "all",
    q: "",
    stableId: undefined,
    window: "all",
    trip: "all",
    eligibleOnly: undefined,
    openOnly: undefined,
  };
  const { grade, country, owned, q } = filters;
  const races = useRaces();
  const horses = useHorses();
  const claims = useGameWithShallow((s: GameState) => s.claims ?? []);
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s) => s.cash);
  const fileClaim = useGame((s) => s.fileClaim);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [enteringRace, setEnteringRace] = useState<Race | null>(null);

  const { filteredRaces, countries, tracks } = useRaceFilters(races, day, filters, horses);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-success/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-success uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-xs font-bold mb-1 opacity-60">
            <Globe className="h-3.5 w-3.5" />
            Global Racing Circuit
          </div>
          <h2 className="text-3xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
            Race Schedule
          </h2>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>
              Races Listed: <NumericValue value={filteredRaces.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Regions: <NumericValue value={countries.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Season Day: <NumericValue value={day} />
            </span>
          </div>
        </div>
      </div>

      <RaceQuickFilters
        filters={filters}
        onPatch={() => {}}
        onReset={() => {}}
        matchCount={filteredRaces.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start">
        <RaceFilterPanel
          q={q}
          onSearchChange={() => {}}
          grade={grade}
          onGradeChange={() => {}}
          country={country}
          onCountryChange={() => {}}
          owned={owned}
          onOwnedChange={() => {}}
          countries={countries}
          onReset={() => {}}
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
