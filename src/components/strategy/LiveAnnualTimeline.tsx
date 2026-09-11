import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Flag,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Compass,
  ArrowRight,
} from "lucide-react";
import {
  calculateVenuePrestige,
  getStrategyPrestigeTier,
  getPrestigeTierBadgeClass,
} from "@/services/prestige/prestigeFacade";
import { getTrackById } from "@/data/tracks";
import { TOOLTIP_DELAY_MS } from "@/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CampaignRaceSlot } from "@/services/calendar/calendarFacade";
import type { Race } from "@/game/types";

function getRaceTrackName(race: Race): string {
  if (race.graded?.track) return race.graded.track;
  if (race.trackId) {
    const t = getTrackById(race.trackId);
    if (t) return t.name;
  }
  return "Track";
}

interface LiveAnnualTimelineProps {
  currentDay: number;
  slots: CampaignRaceSlot[];
  getRace: (raceId: string) => Race | undefined;
  onAddSlot?: (slot: CampaignRaceSlot) => void;
  onRemoveSlot?: (slotIndex: number) => void;
}

const MONTHS = [
  { name: "Jan", start: 1, end: 31 },
  { name: "Feb", start: 32, end: 59 },
  { name: "Mar", start: 60, end: 90 },
  { name: "Apr", start: 91, end: 120 },
  { name: "May", start: 121, end: 151 },
  { name: "Jun", start: 152, end: 181 },
  { name: "Jul", start: 182, end: 212 },
  { name: "Aug", start: 213, end: 243 },
  { name: "Sep", start: 244, end: 273 },
  { name: "Oct", start: 274, end: 304 },
  { name: "Nov", start: 305, end: 334 },
  { name: "Dec", start: 335, end: 365 },
];

export function LiveAnnualTimeline({
  currentDay,
  slots,
  getRace,
  onAddSlot,
  onRemoveSlot,
}: LiveAnnualTimelineProps) {
  const [filterRole, setFilterRole] = useState<string>("all");

  const sortedSlots = [...slots].sort((a, b) => a.dayTarget - b.dayTarget);

  const filteredSlots = sortedSlots.filter((slot) => {
    if (filterRole === "all") return true;
    return slot.role === filterRole;
  });

  const getRoleBadge = (role: CampaignRaceSlot["role"]) => {
    switch (role) {
      case "target":
        return (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 uppercase text-[10px] tracking-wide">
            Target Race
          </Badge>
        );
      case "prep":
        return (
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 uppercase text-[10px] tracking-wide">
            Prep Race
          </Badge>
        );
      case "comeback":
        return (
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 uppercase text-[10px] tracking-wide">
            Comeback
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: CampaignRaceSlot["status"], fieldStatus?: string) => {
    if (fieldStatus === "full") {
      return (
        <Badge variant="destructive" className="gap-1 text-[10px]">
          <AlertTriangle className="w-3 h-3" /> Bumped: Field Full
        </Badge>
      );
    }
    switch (status) {
      case "planned":
        return (
          <Badge variant="outline" className="text-muted-foreground border-border text-[10px]">
            Planned
          </Badge>
        );
      case "entered":
        return (
          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px]">
            Entered
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1 text-[10px]">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </Badge>
        );
      case "cancelled":
      case "skipped":
        return (
          <Badge variant="destructive" className="text-[10px]">
            {status === "cancelled" ? "Cancelled" : "Skipped"}
          </Badge>
        );
    }
  };

  // Calculate timeline percentage for currentDay
  const currentDayPercent = Math.min(100, Math.max(0, (currentDay / 365) * 100));

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-base font-semibold">
                Live Annual Campaign Timeline
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                365-Day Progression • Current: Day {currentDay}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => setFilterRole("all")}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  filterRole === "all"
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({slots.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterRole("target")}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  filterRole === "target"
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Targets
              </button>
              <button
                type="button"
                onClick={() => setFilterRole("prep")}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  filterRole === "prep"
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Preps
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* 365-Day Annual Rail */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
            <span>Day 1 (Jan)</span>
            <span className="text-primary font-semibold">Today: Day {currentDay}</span>
            <span>Day 365 (Dec)</span>
          </div>

          <div className="relative w-full h-8 bg-muted/40 rounded-lg border border-border/50 overflow-hidden">
            {/* Month grid dividers */}
            <div className="absolute inset-0 grid grid-cols-12 pointer-events-none divide-x divide-border/20">
              {MONTHS.map((m) => (
                <div
                  key={m.name}
                  className="h-full flex items-center justify-center text-[9px] text-muted-foreground/60 select-none font-medium"
                >
                  {m.name}
                </div>
              ))}
            </div>

            {/* Current day cursor */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-primary z-20 shadow-md"
              style={{ left: `${currentDayPercent}%` }}
              title={`Current Day: ${currentDay}`}
            />

            {/* Slot tick marks on rail */}
            {sortedSlots.map((slot) => {
              const race = slot.raceId ? getRace(slot.raceId) : undefined;
              const slotDay = race?.day ?? slot.dayTarget;
              const pct = Math.min(100, Math.max(0, (slotDay / 365) * 100));
              const isTarget = slot.role === "target";

              return (
                <div
                  key={`${slot.dayTarget}-${slot.raceId || "unassigned"}`}
                  className={`absolute top-1 bottom-1 w-2.5 rounded-sm z-10 -ml-1 border ${
                    isTarget ? "bg-amber-400 border-amber-300" : "bg-blue-400 border-blue-300"
                  }`}
                  style={{ left: `${pct}%` }}
                  title={`${isTarget ? "Target" : "Prep"}: Day ${slotDay} ${
                    race?.name ? `(${race.name})` : ""
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Slot Cards List */}
        <div className="space-y-3">
          {filteredSlots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/60 rounded-lg">
              <Compass className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No campaign slots scheduled. Use &ldquo;Auto-Generate Prep Chain&rdquo; or add a slot
              manually.
            </div>
          ) : (
            filteredSlots.map((slot, index) => {
              const origIndex = slots.indexOf(slot);
              const race = slot.raceId ? getRace(slot.raceId) : undefined;
              const slotDay = race?.day ?? slot.dayTarget;
              const isPast = slotDay < currentDay;

              // Previous slot rest window
              const prevSlot = index > 0 ? filteredSlots[index - 1] : null;
              const prevRace = prevSlot?.raceId ? getRace(prevSlot.raceId) : undefined;
              const prevDay = prevRace?.day ?? prevSlot?.dayTarget;
              const restDays = prevDay !== undefined ? slotDay - prevDay : null;

              const trackName = race ? getRaceTrackName(race) : "Track";
              const prestigeScore = race ? calculateVenuePrestige(trackName, race.trackId) : 50;
              const prestigeTier = getStrategyPrestigeTier(prestigeScore);

              return (
                <div key={`${slot.dayTarget}-${slot.raceId || index}`} className="space-y-2">
                  {/* Rest Window indicator between consecutive races */}
                  {restDays !== null && (
                    <div className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground font-mono">
                      <div className="h-px bg-border/50 flex-1" />
                      <div
                        className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] ${
                          restDays < 14
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : restDays < 21
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-muted/40 text-muted-foreground border-border/40"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{restDays} Days Rest</span>
                        {restDays < 14 && (
                          <span className="font-bold text-[10px] ml-1">(Tight turn-around)</span>
                        )}
                      </div>
                      <div className="h-px bg-border/50 flex-1" />
                    </div>
                  )}

                  {/* Slot Card */}
                  <div
                    className={`border rounded-lg p-3.5 transition-colors ${
                      isPast
                        ? "bg-muted/10 border-border/30 opacity-70"
                        : slot.role === "target"
                          ? "bg-amber-500/5 border-amber-500/30 shadow-sm"
                          : "bg-muted/20 border-border/40 hover:border-border/80"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getRoleBadge(slot.role)}
                        {getStatusBadge(slot.status, slot.fieldStatus)}
                        {race?.graded && (
                          <Badge variant="secondary" className="font-bold text-[10px]">
                            {race.graded.grade}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-muted-foreground">
                          Day {slotDay} (±{slot.dayWindow}d window)
                        </span>
                        {onRemoveSlot && (
                          <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                                  onClick={() => onRemoveSlot(origIndex)}
                                  aria-label="Remove slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove slot</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-base font-semibold text-foreground flex items-center gap-1.5">
                          {race ? (
                            <span>{race.name}</span>
                          ) : (
                            <span className="italic text-muted-foreground">
                              Unassigned Slot ({slot.constraintGradeMin || "Any Grade"})
                            </span>
                          )}
                        </div>

                        {race && (
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-primary" />
                              {trackName}
                            </span>
                            <span>•</span>
                            <span>{race.distance}m</span>
                            <span>•</span>
                            <span>{race.surface}</span>
                            <span>•</span>
                            <span className="font-mono">
                              Field: {race.entries?.length ?? 0}/{race.fieldSize}
                              {race.entries?.length >= race.fieldSize && (
                                <span className="text-rose-400 ml-1 font-bold">(Full)</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Venue Prestige Tag */}
                      {race && (
                        <div className="flex sm:flex-col items-end justify-between shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-xs gap-1 font-semibold ${getPrestigeTierBadgeClass(
                              prestigeTier,
                            )}`}
                          >
                            <span>{prestigeTier}</span>
                            <span className="font-mono text-[10px] opacity-80">
                              ({prestigeScore} pts)
                            </span>
                          </Badge>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            Track Prestige Rating
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
