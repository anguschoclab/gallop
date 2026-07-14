import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { TrophyCase } from "@/components/awards";
import { HorseCard } from "@/components/horse/HorseCard";
import { HorseBit, overall } from "@/components/horse/HorseBits";
import { HorseCompare } from "@/components/horse/HorseCompare";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RosterFilterBar } from "./RosterFilterBar";
import { cn } from "@/lib/cn";
import type { Horse } from "@/game/types";
import type { RegionalAward } from "@/core/awards/types";
import { ChevronRight, Zap, Clock, Search, GitCompare, X, ChevronLeft } from "lucide-react";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";

const MAX_COMPARE = 3;

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
  compareIds?: string[];
  onCompareIdsChange?: (ids: string[]) => void;
}

export function StableRosterView({
  horses,
  status,
  view,
  counts,
  playerAwards,
  navigate,
  compareIds: externalCompareIds,
  onCompareIdsChange,
}: StableRosterViewProps) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const selectedIds = externalCompareIds ?? internalSelectedIds;

  const toggleSelect = (id: string) => {
    const update = (prev: string[]) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    };
    if (onCompareIdsChange) {
      onCompareIdsChange(update(selectedIds));
    } else {
      setInternalSelectedIds(update);
    }
  };

  const setSelectedIds = (ids: string[]) => {
    if (onCompareIdsChange) {
      onCompareIdsChange(ids);
    } else {
      setInternalSelectedIds(ids);
    }
  };

  const selectedHorses = useMemo(
    () => selectedIds.map((id) => horses.find((h) => h.id === id)).filter(Boolean) as Horse[],
    [selectedIds, horses],
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {playerAwards.length > 0 && <TrophyCase awards={playerAwards} variant="compact" />}

      <RosterFilterBar
        status={status}
        counts={counts}
        onStatusChange={(key) => navigate({ search: (prev: any) => ({ ...prev, status: key }) })}
      />

      {horses.length === 0 ? (
        <div className="p-20 text-center space-y-4 bg-black/10 border border-white/5 shadow-2xl">
          {counts.all === 0 ? (
            <>
              <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                <Search className="h-6 w-6 text-cream/10" />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-cream/60 uppercase tracking-widest font-[family-name:var(--font-display)]">
                    Stable is Empty
                  </p>
                  <p className="text-[10px] font-mono text-cream/20 uppercase tracking-tighter mt-1">
                    You have no horses. Visit the market or auction to acquire stock.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    to="/market"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "font-mono text-xs uppercase font-bold tracking-tighter",
                    )}
                  >
                    Go to Market
                  </Link>
                  <Link
                    to="/auction"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "font-mono text-xs uppercase font-bold tracking-tighter",
                    )}
                  >
                    View Auctions
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : view === "ledger" ? (
        <div className="border border-white/5 bg-slate-900/20 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-black/40 border-b border-white/10">
              <tr className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-muted/60">
                <th className="px-3 py-3 font-black w-1"></th>
                <th className="px-3 py-3 font-black w-1">#</th>
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
                const isSelected = selectedIds.includes(h.id);
                const disableCheck = !isSelected && selectedIds.length >= MAX_COMPARE;
                return (
                  <tr
                    key={h.id}
                    className={cn(
                      "group hover:bg-white/[0.02] transition-colors relative",
                      isSelected && "bg-gold/5",
                    )}
                  >
                    <td className="px-3 py-4">
                      <Checkbox
                        aria-label={`Select ${h.name} to compare`}
                        checked={isSelected}
                        disabled={disableCheck}
                        onCheckedChange={() => toggleSelect(h.id)}
                      />
                    </td>
                    <td className="px-3 py-4 font-mono text-[10px] text-cream/20 tabular-nums">
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
                          ovrVal >= 80 ? "text-fame" : ovrVal >= 70 ? "text-success" : "text-cream",
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
                        <BookmarkButton
                          type="horse"
                          id={h.id}
                          label={h.name}
                          subtitle={`Age ${Math.floor(h.age)} · ${h.gender}`}
                        />
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                to="/stable/$horseId"
                                params={{ horseId: h.id }}
                                hash="training"
                              >
                                <Button
                                  aria-label={`Open training room for ${h.name}`}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-gold/10 hover:text-gold text-cream/20"
                                >
                                  <Zap className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Training Room</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link to="/scheduler">
                                <Button
                                  aria-label={`Open mission plan for ${h.name}`}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-blue-400/10 hover:text-blue-400 text-cream/20"
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Race Plan</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {horses.map((h) => {
            const isSelected = selectedIds.includes(h.id);
            const disableCheck = !isSelected && selectedIds.length >= MAX_COMPARE;
            return (
              <div key={h.id} className="relative">
                <div className="absolute top-2 left-2 z-10 bg-slate-950/80 backdrop-blur rounded p-1">
                  <Checkbox
                    aria-label={`Select ${h.name} to compare`}
                    checked={isSelected}
                    disabled={disableCheck}
                    onCheckedChange={() => toggleSelect(h.id)}
                  />
                </div>
                <HorseCard
                  horse={h}
                  variant="full"
                  onClick={() => navigate({ to: "/stable/$horseId", params: { horseId: h.id } })}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Floating compare action bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-slate-900 border border-gold/30 shadow-2xl rounded-lg px-4 py-3 animate-in slide-in-from-bottom-4 duration-200">
          <span className="font-mono text-[10px] uppercase tracking-widest text-cream/60 whitespace-nowrap">
            {selectedIds.length}/{MAX_COMPARE} selected
          </span>
          {/* Horse name chips with reorder controls */}
          <div className="flex items-center gap-1.5">
            {selectedIds.map((id, idx) => {
              const h = horses.find((x) => x.id === id);
              if (!h) return null;
              return (
                <div key={id} className="flex items-center gap-0.5 bg-white/5 rounded px-1.5 py-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-cream/40 hover:text-cream"
                    disabled={idx === 0}
                    onClick={() => {
                      const next = [...selectedIds];
                      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                      setSelectedIds(next);
                    }}
                    aria-label={`Move ${h.name} left`}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-[10px] font-mono font-bold text-cream/80 max-w-[80px] truncate">
                    {h.name}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-cream/40 hover:text-cream"
                    disabled={idx === selectedIds.length - 1}
                    onClick={() => {
                      const next = [...selectedIds];
                      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                      setSelectedIds(next);
                    }}
                    aria-label={`Move ${h.name} right`}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-cream/40 hover:text-destructive"
                    onClick={() => toggleSelect(id)}
                    aria-label={`Remove ${h.name} from compare`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
          <Button
            size="sm"
            className="gap-2 bg-gold text-slate-950 hover:bg-gold/90 font-bold uppercase text-[10px] tracking-widest"
            disabled={selectedIds.length < 2}
            onClick={() => setCompareOpen(true)}
          >
            <GitCompare className="h-3.5 w-3.5" />
            Compare
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-cream/60 hover:text-cream"
            onClick={() => setSelectedIds([])}
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <HorseCompare
        horses={selectedHorses}
        allHorses={horses}
        open={compareOpen}
        onOpenChange={setCompareOpen}
      />
    </div>
  );
}
