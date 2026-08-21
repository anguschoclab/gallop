/**
 * StableRosterLedger.tsx - Ledger table view for stable roster
 *
 * Extracted from StableRosterView.tsx for modularity.
 */

import { Link } from "@tanstack/react-router";
import { TOOLTIP_DELAY_MS, MAX_COMPARE_HORSES } from "@/constants";
import { HorseBit, overall } from "@/components/horse/HorseBits";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { cn } from "@/lib/cn";
import type { Horse } from "@/game/types";
import { Zap, Clock, ChevronRight } from "lucide-react";

interface StableRosterLedgerProps {
  horses: Horse[];
  selectedIds: string[];
  toggleSelect: (id: string) => void;
}

export function StableRosterLedger({ horses, selectedIds, toggleSelect }: StableRosterLedgerProps) {
  return (
    <div className="border border-white/5 bg-slate-900/20 overflow-x-auto shadow-2xl">
      <table className="w-full text-left border-collapse">
        <thead className="bg-black/40 border-b border-white/10">
          <tr className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-muted/60">
            <th className="px-3 py-3 font-black w-1"></th>
            <th className="px-3 py-3 font-black w-1">#</th>
            <th className="px-4 py-3 font-black">Horse</th>
            <th className="px-4 py-3 font-black text-center">Age</th>
            <th className="px-4 py-3 font-black text-center">OVR</th>
            <th className="px-4 py-3 font-black text-center">Condition</th>
            <th className="px-4 py-3 font-black text-center">Peaking</th>
            <th className="px-6 py-3 font-black text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {horses.map((h, i) => {
            const ovrVal = overall(h);
            const isSelected = selectedIds.includes(h.id);
            const disableCheck = !isSelected && selectedIds.length >= MAX_COMPARE_HORSES;
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
                      E:{Math.round(h.energy)}%
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
                    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to="/stable/$horseId" params={{ horseId: h.id }} hash="training">
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
                    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
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
  );
}
