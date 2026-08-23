import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";
import { ClaimingRacePanel } from "@/components/race/ClaimingRacePanel";
import { RaceCard } from "@/components/race/RaceCard";
import { NumericValue } from "@/components/horse/HorseBits";
import { formatCurrency } from "@/core/financial";
import { cn } from "@/lib/cn";
import type { Race, Claim, Horse } from "@/game/types";
import { List, LayoutGrid, Target, MapPin, Globe } from "lucide-react";

interface RaceFeedProps {
  races: Race[];
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
  onEnterRace: (race: Race) => void;
  horses: Horse[];
  claims: Claim[];
  cash: number;
  fileClaim: (raceId: string, horseId: string) => { ok: boolean; reason?: string };
}

export function RaceFeed({
  races,
  viewMode,
  onViewModeChange,
  onEnterRace,
  horses,
  claims,
  cash,
  fileClaim,
}: RaceFeedProps) {
  if (races.length === 0) {
    return (
      <div className="p-32 text-center border-2 border-dashed border-white/5 bg-black/10">
        <Globe className="h-16 w-16 mx-auto mb-6 text-cream/5" />
        <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
          No Races Found
        </p>
        <p className="text-[10px] font-mono text-cream/10 uppercase mt-2">
          Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      {/* View Toggle Header */}
      <div className="flex items-center justify-between bg-slate-900/40 p-2 border border-white/5 rounded-lg">
        <div className="flex items-center gap-4 px-4 font-mono text-[10px] uppercase font-black tracking-widest text-cream/40">
          <Target className="h-3.5 w-3.5 text-success/40" />
          <span>
            <NumericValue value={races.length} /> Races Found
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
            onClick={() => onViewModeChange("list")}
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
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Grid
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {races.map((r) => (
            <div key={r.id} className="relative group">
              <div
                className={cn(
                  "absolute top-0 left-0 w-1 h-full transition-colors z-10",
                  r.entries.some((e) => e.ownership?.type === "player")
                    ? "bg-success"
                    : "bg-white/5 group-hover:bg-success/20",
                )}
              />
              <RaceCard race={r} onEnter={() => onEnterRace(r)} />
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
                <th className="px-4 py-3 font-black text-right">Weather</th>
                <th className="px-4 py-3 font-black text-right">Purse</th>
                <th className="px-6 py-3 font-black text-right">Enter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {races.map((r) => {
                const isEntered = r.entries.some((e) => e.ownership?.type === "player");
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
                          <span>{r.trackId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-cream/60">
                        {r.distance}M
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end">
                          <WeatherForecastStrip
                            trackId={r.trackId ?? r.graded?.trackId ?? r.graded?.track}
                            trackCondition={r.trackCondition}
                          />
                        </div>
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
                            onClick={() => onEnterRace(r)}
                          >
                            ENTER RACE
                          </Button>
                        )}
                      </td>
                    </tr>
                    {isClaiming && isEntered && (
                      <tr>
                        <td colSpan={7} className="bg-success/[0.01] p-0 border-none">
                          <ClaimingRacePanel
                            race={r}
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
  );
}
