import { Link } from "@tanstack/react-router";
import { TrophyCase } from "@/components/awards";
import { HorseCard } from "@/components/horse/HorseCard";
import { HorseBit, overall } from "@/components/horse/HorseBits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Horse } from "@/game/types";
import type { RegionalAward } from "@/game/awards/types";
import {
  Search,
  Filter,
  List,
  LayoutGrid,
  ChevronRight,
  Zap,
  Clock,
  Activity,
  Heart,
  Tag,
  Users,
} from "lucide-react";

interface StableRosterViewProps {
  horses: Horse[];
  status: string;
  view: "ledger" | "gallery";
  counts: {
    active: number;
    retired: number;
    auctioned: number;
    all: number;
  };
  playerAwards: RegionalAward[];
  navigate: any;
}

export function StableRosterView({
  horses,
  status,
  view,
  counts,
  playerAwards,
  navigate,
}: StableRosterViewProps) {

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {playerAwards.length > 0 && <TrophyCase awards={playerAwards} variant="compact" />}

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-black/20 p-4 border border-white/5">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "active", label: "Active", count: counts.active, icon: Activity, color: "text-success" },
              { key: "retired", label: "Retired", count: counts.retired, icon: Heart, color: "text-pink-400" },
              { key: "auctioned", label: "Archived", count: counts.auctioned, icon: Tag, color: "text-warning" },
              { key: "all", label: "Global", count: counts.all, icon: Users, color: "text-cream" },
            ] as const
          ).map(({ key, label, count, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => navigate({ search: (prev: any) => ({ ...prev, status: key }) })}
              className={cn(
                "px-4 py-2 flex items-center gap-3 border font-mono text-[10px] uppercase font-bold tracking-widest transition-all",
                status === key
                  ? "bg-white/5 border-gold text-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                  : "border-white/5 text-cream/40 hover:text-cream hover:bg-white/[0.02]",
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", status === key ? color : "opacity-40")} />
              {label}
              <span className="opacity-40 ml-1">[{String(count).padStart(2, "0")}]</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream/20" />
            <Input
              placeholder="Search horses..."
              className="h-8 bg-slate-950/50 border-white/5 text-[10px] font-mono pl-8 w-48 focus-visible:ring-gold/30 uppercase"
            />
          </div>
          <Button
            aria-label="Filter roster"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 border-white/5 text-cream/20 hover:text-cream"
          >
            <Filter className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {view === "ledger" ? (
        <div className="border border-white/5 bg-slate-900/20 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-black/40 border-b border-white/10">
              <tr className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-muted/60">
                <th className="px-6 py-3 font-black w-1">#</th>
                <th className="px-4 py-3 font-black">Horse</th>
                <th className="px-4 py-3 font-black text-center">Age</th>
                <th className="px-4 py-3 font-black text-center">Rating</th>
                <th className="px-4 py-3 font-black text-center">Condition</th>
                <th className="px-4 py-3 font-black text-center">Peaking</th>
                <th className="px-6 py-3 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {horses.map((h, i) => {
                const ovrVal = overall(h);
                return (
                  <tr
                    key={h.id}
                    className="group hover:bg-white/[0.02] transition-colors relative"
                  >
                    <td className="px-6 py-4 font-mono text-[10px] text-cream/20 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to="/stable/$horseId"
                        params={{ horseId: h.id }}
                        className="flex items-center gap-3"
                      >
                        <HorseBit horse={h} />
                        {h.activeInjury && (
                          <Badge
                            variant="destructive"
                            className="text-[8px] h-3.5 px-1 font-black animate-pulse"
                          >
                            INJURED
                          </Badge>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-xs text-cream/60">
                      {Math.floor(h.age)}Y
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div
                        className={cn(
                          "inline-block font-mono font-black text-sm tabular-nums",
                          ovrVal >= 80
                            ? "text-fame"
                            : ovrVal >= 70
                              ? "text-success"
                              : "text-cream",
                        )}
                      >
                        {ovrVal}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-500",
                              h.energy > 60
                                ? "bg-success"
                                : h.energy > 30
                                  ? "bg-warning"
                                  : "bg-destructive",
                            )}
                            style={{ width: `${h.energy}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-cream/40 uppercase">
                          E:{h.energy}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-black tracking-tighter uppercase h-5",
                          (h.peakingIndex ?? 0) > 20
                            ? "border-fame text-fame bg-fame/5"
                            : "border-white/10 text-cream/40",
                        )}
                      >
                        {(h.peakingIndex ?? 0) > 20 ? "PEAK" : "STD"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to="/stable/$horseId" params={{ horseId: h.id }} hash="training">
                          <Button
                            aria-label={`Open training room for ${h.name}`}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-gold/10 hover:text-gold text-cream/20"
                            title="Training Room"
                          >
                            <Zap className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Link to="/scheduler">
                          <Button
                            aria-label={`Open mission plan for ${h.name}`}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-blue-400/10 hover:text-blue-400 text-cream/20"
                            title="Race Plan"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Link to="/stable/$horseId" params={{ horseId: h.id }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 font-mono text-[9px] uppercase font-black tracking-tighter text-cream/40 group-hover:text-gold border border-transparent group-hover:border-gold/20"
                          >
                            View Record <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {horses.length === 0 && (
            <div className="p-20 text-center space-y-4 bg-black/10">
              <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                <Search className="h-6 w-6 text-cream/10" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-cream/60 uppercase tracking-widest font-[family-name:var(--font-display)]">
                  No Records Located
                </p>
                <p className="text-[10px] font-mono text-cream/20 uppercase tracking-tighter">
                  Current filter parameters yielded zero matches in the registry.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {horses.map((h) => (
            <HorseCard
              key={h.id}
              horse={h}
              variant="full"
              onClick={() => navigate({ to: "/stable/$horseId", params: { horseId: h.id } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
