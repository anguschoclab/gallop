import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { shallow } from "zustand/shallow";
import { useRaces, useHorses } from "@/game/hooks/useCoreState";
import { formatCurrency } from "@/core/financial";
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
  Calendar,
  Filter,
  Search,
  History,
  LayoutGrid,
  List,
  Globe,
  Trophy,
  ChevronRight,
  MapPin,
  Clock,
  ExternalLink,
  Target,
} from "lucide-react";
import { useState } from "react";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { RaceEntry } from "@/components/RaceEntry";
import { Race, Claim } from "@/game/types";
import { GradeBreakdown } from "@/components/races/GradeBreakdown";
import { RaceCard } from "@/components/races/RaceCard";
import { RaceRow } from "@/components/races/RaceRow";
import { NumericValue } from "@/components/HorseBits";
import { useRaceFilters, type RaceFilters } from "@/hooks/useRaceFilters";
import { ClaimingRacePanel } from "@/components/races/ClaimingRacePanel";
import { cn } from "@/lib/utils";

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
  const { grade, country, surface, track, owned, q } = filters;
  const navigate = Route.useNavigate();
  const races = useRaces();
  const horses = useHorses();
  const claims: Claim[] = (useGame as any)((s) => s.claims ?? [], shallow);
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const fileClaim = useGame((s) => s.fileClaim);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [enteringRace, setEnteringRace] = useState<Race | null>(null);

  const { filteredRaces, countries, tracks } = useRaceFilters(races, day, filters);

  const updateFilter = (key: keyof RaceFilters, value: string) => {
    navigate({
      search: (prev) => ({ ...prev, [key]: value }),
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
        {/* Left Pillar: Filters & Intel */}
        <aside className="space-y-8 sticky top-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Filter className="h-3.5 w-3.5 text-success/60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
                Race Filters
              </h2>
            </div>
            <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-2 border-l-success/40">
              <CardContent className="p-5 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-success/40 tracking-widest px-1">
                    Race Name
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream/20" />
                    <Input
                      placeholder="Search races..."
                      className="h-9 bg-slate-950/60 border-white/5 text-xs font-mono pl-8 uppercase tracking-tighter focus-visible:ring-success/30"
                      value={q}
                      onChange={(e) => updateFilter("q", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-success/40 tracking-widest px-1">
                    Grade
                  </label>
                  <Select value={grade} onValueChange={(v) => updateFilter("grade", v)}>
                    <SelectTrigger className="h-9 bg-slate-950/60 border-white/5 text-[10px] font-bold uppercase rounded-none tracking-widest">
                      <SelectValue placeholder="All Grades" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10">
                      <SelectItem value="all">All Grades</SelectItem>
                      <SelectItem value="G1">Grade 1</SelectItem>
                      <SelectItem value="G2">Grade 2</SelectItem>
                      <SelectItem value="G3">Grade 3</SelectItem>
                      <SelectItem value="Graded">All Graded</SelectItem>
                      <SelectItem value="Ungraded">Ungraded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-success/40 tracking-widest px-1">
                    Region
                  </label>
                  <Select value={country} onValueChange={(v) => updateFilter("country", v)}>
                    <SelectTrigger className="h-9 bg-slate-950/60 border-white/5 text-[10px] font-bold uppercase rounded-none tracking-widest">
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10">
                      <SelectItem value="all">All Regions</SelectItem>
                      {countries.map((c) => (
                        <SelectItem key={c} value={c} className="uppercase">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-success/40 tracking-widest px-1">
                    My Entries
                  </label>
                  <div className="grid grid-cols-1 gap-1">
                    {(["all", "owned", "others"] as const).map((o) => (
                      <button
                        key={o}
                        onClick={() => updateFilter("owned", o)}
                        className={cn(
                          "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-left transition-all border-l-2",
                          owned === o
                            ? "bg-white/5 border-success text-success"
                            : "border-transparent text-cream/20 hover:text-cream/40",
                        )}
                      >
                        {o === "all" ? "All Races" : o === "owned" ? "My Entries" : "Other Races"}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 text-[9px] font-black uppercase tracking-[0.2em] text-cream/10 hover:text-cream/30 border border-dashed border-white/5 mt-2"
                  onClick={() =>
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
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          </section>

          <GradeBreakdown races={races} horses={horses} day={day} />
        </aside>

        {/* Right Pillar: Main Feed */}
        <main className="space-y-6">
          <div className="flex items-center justify-between bg-slate-900/40 p-2 border border-white/5 rounded-lg">
            <div className="flex items-center gap-4 px-4 font-mono text-[10px] uppercase font-black tracking-widest text-cream/40">
              <Target className="h-3.5 w-3.5 text-success/40" />
              <span>
                <NumericValue value={filteredRaces.length} /> Races Found
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 gap-2 uppercase text-[10px] font-black tracking-widest rounded",
                  viewMode === "list" ? "bg-white/10 text-success" : "text-cream/40",
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5" />
                List
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 gap-2 uppercase text-[10px] font-black tracking-widest rounded",
                  viewMode === "grid" ? "bg-white/10 text-success" : "text-cream/40",
                )}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </Button>
            </div>
          </div>

          {filteredRaces.length === 0 ? (
            <div className="p-32 text-center border-2 border-dashed border-white/5 bg-black/10">
              <Globe className="h-16 w-16 mx-auto mb-6 text-cream/5" />
              <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
                No Races Found
              </p>
              <p className="text-[10px] font-mono text-cream/10 uppercase mt-2">
                Try adjusting your filters.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredRaces.map((r: Race) => (
                <div key={r.id} className="relative group">
                  <div
                    className={cn(
                      "absolute top-0 left-0 w-1 h-full transition-colors z-10",
                      r.entries.some((e) => e.owned)
                        ? "bg-success"
                        : "bg-white/5 group-hover:bg-success/20",
                    )}
                  />
                  <RaceCard race={r} onEnter={() => setEnteringRace(r as Race)} />
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-white/5 bg-slate-900/20 shadow-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/40 border-b border-white/10">
                  <tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-success/60">
                    <th className="px-6 py-3 font-black w-1">Day</th>
                    <th className="px-4 py-3 font-black">Race</th>
                    <th className="px-4 py-3 font-black">Track</th>
                    <th className="px-4 py-3 font-black text-right">Distance</th>
                    <th className="px-4 py-3 font-black text-right">Purse</th>
                    <th className="px-6 py-3 font-black text-right">Enter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRaces.map((r: Race) => {
                    const isEntered = r.entries.some((e) => e.owned);
                    const isClaiming = !!r.claiming;

                    return (
                      <React.Fragment key={r.id}>
                        <tr
                          className={cn(
                            "group hover:bg-white/[0.02] transition-colors relative",
                            isEntered && "bg-success/[0.03]",
                          )}
                        >
                          <td className="px-6 py-4 font-mono text-[10px] text-cream/20 tabular-nums">
                            {String(r.day).padStart(3, "0")}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-cream uppercase tracking-tight group-hover:text-success transition-colors">
                                  {r.name}
                                </span>
                                {r.graded && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[8px] h-3.5 px-1 font-black rounded-none",
                                      r.graded.grade === "G1"
                                        ? "border-fame text-fame"
                                        : "border-success/30 text-success/60",
                                    )}
                                  >
                                    {r.graded.grade}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[9px] font-mono text-cream/20 uppercase tracking-tighter">
                                {r.raceClass}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-xs text-cream/60">
                              <MapPin className="h-3 w-3 opacity-40" />
                              <span>{r.track}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-xs text-cream/60">
                            {r.distance}M
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="font-mono font-bold text-success text-sm tracking-tighter tabular-nums">
                              {formatCurrency(r.purse)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isEntered ? (
                              <Badge className="bg-success text-slate-950 text-[9px] font-black tracking-widest h-6 rounded-none animate-pulse px-3 shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                                ENTERED
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-3 font-black text-[9px] uppercase tracking-widest text-cream/40 border border-white/5 hover:border-success/40 hover:text-success hover:bg-success/5 rounded-none"
                                onClick={() => setEnteringRace(r as Race)}
                              >
                                ENTER RACE
                              </Button>
                            )}
                          </td>
                        </tr>
                        {isClaiming && isEntered && (
                          <tr>
                            <td colSpan={6} className="bg-success/[0.01] p-0 border-none">
                              <ClaimingRacePanel
                                race={r as Race}
                                horses={horses}
                                claims={claims}
                                cash={cash}
                                fileClaim={fileClaim}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
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

// React needed for Fragment in map
import React from "react";
