import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/core/common/formatting";
import type { Stable } from "@/game/types";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { useMemo } from "react";
import { Search, X, ExternalLink, Flame, Handshake, BookOpen } from "lucide-react";

type NavigateFn = (opts: {
  search?: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>);
}) => void;

interface RivalArchivesViewProps {
  stables: Stable[];
  rivalQ: string;
  rivalTier: string;
  horseCountsByStable: Map<string, number>;
  npcAIManager: NpcAIManager;
  navigate: NavigateFn;
}

export function RivalArchivesView({
  stables,
  rivalQ,
  rivalTier,
  horseCountsByStable,
  npcAIManager,
  navigate,
}: RivalArchivesViewProps) {
  // ⚡ Bolt Optimization:
  // Pre-calculate hash map for O(1) stable lookups instead of running O(N) .find() inside the map loop.
  // Impact: Reduces rendering complexity from O(N*M) to O(N+M) avoiding UI jank.
  const stableMap = useMemo(() => new Map(stables.map((s) => [s.id, s])), [stables]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-wrap items-center gap-3 bg-black/20 p-4 border border-white/5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/20" />
          <Input
            placeholder="Identify Rival Entity..."
            className="pl-9 h-10 bg-slate-950/50 border-white/10 text-sm font-mono uppercase tracking-tight focus-visible:ring-blue-500/30"
            value={rivalQ}
            onChange={(e) => navigate({ search: (p) => ({ ...p, rivalQ: e.target.value }) })}
          />
        </div>
        <Select
          value={rivalTier}
          onValueChange={(v) => navigate({ search: (p) => ({ ...p, rivalTier: v }) })}
        >
          <SelectTrigger className="h-10 w-40 bg-slate-950/50 border-white/10 text-xs font-bold uppercase tracking-widest">
            <SelectValue placeholder="Entity Tier" />
          </SelectTrigger>
          <SelectContent className="bg-slate-950 border-white/10">
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="elite">Elite Class</SelectItem>
            <SelectItem value="mid">Mid-Tier Ops</SelectItem>
            <SelectItem value="budget">Budget Sector</SelectItem>
          </SelectContent>
        </Select>
        {(rivalQ || rivalTier !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ search: (p) => ({ ...p, rivalQ: "", rivalTier: "all" }) })}
            className="h-10 gap-2 text-cream/40 hover:text-cream uppercase text-[10px] font-black tracking-widest"
          >
            <X className="w-3.5 h-3.5" />
            Reset
          </Button>
        )}
      </div>

      {stables.length === 0 ? (
        <div className="p-20 text-center space-y-4 bg-black/10 border border-white/5 shadow-2xl">
          <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
            <Search className="h-6 w-6 text-cream/10" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-cream/60 uppercase tracking-widest font-[family-name:var(--font-display)]">
              No Rivals Found
            </p>
            <p className="text-[10px] font-mono text-cream/20 uppercase tracking-tighter">
              No stable entities match the current search parameters.
            </p>
          </div>
          {(rivalQ || rivalTier !== "all") && (
            <div className="flex items-center justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate({ search: (p) => ({ ...p, rivalQ: "", rivalTier: "all" }) })
                }
                className="font-mono text-xs uppercase font-bold tracking-tighter"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stables.map((stable) => {
            const stableHorseCount = horseCountsByStable.get(stable.id) || 0;
            const stableAI = npcAIManager?.stableStates?.[stable.id];
            const friction = stableAI?.friction ?? 0;
            const relationships = stableAI?.npcRelationships;
            const narrative = stableAI?.narrativeState;

            const alliances: Array<{ stableId: string; type: string }> = [];
            if (relationships) {
              for (const [otherId, rel] of Object.entries(relationships)) {
                if (rel.allianceType) {
                  alliances.push({ stableId: otherId, type: rel.allianceType });
                }
              }
            }
            const activeArcs = narrative?.activeArcs ?? [];
            const recentBeats = narrative?.storyBeats?.slice(-2) ?? [];

            return (
              <Card
                key={stable.id}
                className="bg-slate-900/20 border-white/5 hover:border-blue-500/40 transition-all duration-300 rounded-none group overflow-hidden"
              >
                <Link
                  to="/npc-stables/$stableId"
                  params={{ stableId: stable.id }}
                  className="block p-5"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-sm rotate-45 border border-white/20 shadow-lg shrink-0"
                        style={{ backgroundColor: stable.colors.primary }}
                      />
                      <div>
                        <h3 className="font-bold text-cream font-[family-name:var(--font-display)] group-hover:text-blue-400 transition-colors">
                          {stable.name}
                        </h3>
                        <p className="text-[10px] font-mono uppercase tracking-tighter text-cream/40">
                          {stable.personality} · {stable.tier}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 text-cream/20 group-hover:text-blue-400 transition-colors" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-cream/40 flex items-center gap-1.5">
                        <Flame
                          className={cn(
                            "h-3 w-3",
                            friction > 50 ? "text-red-500" : "text-cream/20",
                          )}
                        />
                        Relation
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase",
                          friction > 50
                            ? "text-red-400"
                            : friction < -30
                              ? "text-success"
                              : "text-cream/60",
                        )}
                      >
                        {friction > 70
                          ? "HATED"
                          : friction > 30
                            ? "TENSE"
                            : friction < -50
                              ? "ALLY"
                              : "NEUTRAL"}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-cream/40">
                        Assets: <span className="text-cream">{stableHorseCount}</span>
                      </span>
                      <span className="text-success font-bold">{formatCurrency(stable.cash)}</span>
                    </div>

                    {alliances.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-cream/40 flex items-center gap-1">
                          <Handshake className="h-3 w-3" />
                          Alliances
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {alliances.map((a) => {
                            const otherName = stableMap.get(a.stableId)?.name ?? a.stableId;
                            return (
                              <span
                                key={a.stableId}
                                className={cn(
                                  "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 border rounded-none",
                                  a.type === "economic_cartel"
                                    ? "border-amber-500/30 text-amber-400/70 bg-amber-500/5"
                                    : a.type === "racing_coalition"
                                      ? "border-blue-500/30 text-blue-400/70 bg-blue-500/5"
                                      : a.type === "breeding_partnership"
                                        ? "border-emerald-500/30 text-emerald-400/70 bg-emerald-500/5"
                                        : "border-white/10 text-cream/40 bg-white/5",
                                )}
                                title={`${a.type.replace(/_/g, " ")} with ${otherName}`}
                              >
                                {a.type.replace(/_/g, " ").split(" ")[0]} · {otherName}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeArcs.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-cream/40 flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Active Storylines
                        </div>
                        {activeArcs.map((arc, i) => (
                          <div key={`${arc.id}-${i}`} className="text-[10px] text-cream/50">
                            <span className="font-bold text-gold/60 uppercase">
                              {arc.type.replace(/_/g, " ")}
                            </span>
                            <span className="text-cream/20"> · </span>
                            <span className="text-cream/30">{arc.status.replace(/_/g, " ")}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {recentBeats.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-white/5">
                        {recentBeats.map((beat, i) => (
                          <p
                            key={`${beat.day}-${i}`}
                            className="text-[10px] text-cream/30 italic leading-tight"
                          >
                            "{beat.headline}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex divide-x divide-white/5 border-t border-white/5 bg-black/20">
                  {(["roster", "staff", "history"] as const).map((t) => (
                    <Link
                      key={t}
                      to="/npc-stables/$stableId"
                      params={{ stableId: stable.id }}
                      search={{ tab: t }}
                      className="flex-1 py-2 text-center text-[9px] font-black uppercase tracking-tighter text-cream/30 hover:bg-blue-500/10 hover:text-blue-400 transition-all"
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
