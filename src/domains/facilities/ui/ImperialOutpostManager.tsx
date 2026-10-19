import { TOOLTIP_DELAY_MS } from "@/shared/constants/uiConstants";
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useGame, useGameWithShallow } from "@/platform/game/store";
import { OUTPOST_CONSTANTS } from "@/domains/facilities/application/facilitiesFacade";
import {
  FACILITY_NAMES,
  facilityLevelToTierLabel,
} from "@/domains/facilities/application/facilitiesFacade";
import { MapPin, Users, Globe, Hammer, ArrowRightLeft } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/common/formatting";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

export function ImperialOutpostManager() {
  const [selectedOutpostId, setSelectedOutpostId] = useState<string | null>(null);

  const outposts = useGameWithShallow((s) => s.outposts ?? []);
  const cash = useGame((s) => s.cash);

  // Calculate used slots
  const usedSlots = useMemo(() => {
    if (outposts.length === 0) return 0;
    const outpost =
      outposts.find((o) => o.id === (selectedOutpostId || outposts[0].id)) || outposts[0];
    return Object.entries(outpost.facilities).reduce((sum, [_, f]) => {
      return sum + (OUTPOST_CONSTANTS.SLOT_FOOTPRINTS[f.type] || 1);
    }, 0);
  }, [outposts, selectedOutpostId]);

  if (outposts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-xl">
          <Globe size={48} className="mx-auto text-white/10 mb-4" />
          <p className="text-muted-foreground">
            No outposts established yet. Expand to new regions to begin.
          </p>
        </div>
      </div>
    );
  }

  const selectedOutpost =
    outposts.find((o) => o.id === (selectedOutpostId || outposts[0].id)) || outposts[0];

  return (
    <div className="space-y-6">
      {/* Region Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {outposts.map((outpost) => (
          <Button
            key={outpost.id}
            variant={selectedOutpost.id === outpost.id ? "default" : "outline"}
            className={cn(
              "gap-2 shrink-0",
              selectedOutpost.id === outpost.id
                ? "bg-primary text-background"
                : "border-border text-muted-foreground",
            )}
            onClick={() => setSelectedOutpostId(outpost.id)}
          >
            <Globe className="w-4 h-4" />
            {outpost.name} ({outpost.region})
          </Button>
        ))}
        <Button
          variant="outline"
          className="gap-2 border-dashed border-border text-primary shrink-0"
        >
          <MapPin className="w-4 h-4" /> Expand to New Region
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Acreage Plot Grid */}
        <Card className="lg:col-span-2 border-border bg-surface/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-[family-name:var(--font-display)]">
                  Acreage Management
                </CardTitle>
                <CardDescription>
                  {usedSlots} / {selectedOutpost.totalSlots} Slots Developed
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-primary border-primary/30">
                {selectedOutpost.region.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array.from({ length: selectedOutpost.totalSlots }).map((_, i) => {
                // This is a simplified view of the slot map
                const facilityAtSlot = selectedOutpost.facilities[i];
                const footprint = facilityAtSlot
                  ? OUTPOST_CONSTANTS.SLOT_FOOTPRINTS[facilityAtSlot.type]
                  : 1;

                if (facilityAtSlot) {
                  return (
                    <div
                      key={i}
                      className={cn(
                        "p-2 rounded border flex flex-col items-center justify-center text-center gap-1 transition-all hover:brightness-110",
                        facilityAtSlot.branch === "turf"
                          ? "bg-green-900/40 border-green-700/50"
                          : facilityAtSlot.branch === "dirt"
                            ? "bg-amber-900/40 border-amber-700/50"
                            : "bg-card border-border/30",
                      )}
                      style={{
                        gridColumn: `span ${Math.min(footprint, 2)}`,
                        gridRow: `span ${Math.ceil(footprint / 2)}`,
                      }}
                    >
                      <Hammer className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-foreground uppercase leading-tight">
                        {FACILITY_NAMES[facilityAtSlot.type].split(" ")[0]}
                      </span>
                      <Badge className="h-3 text-[8px] px-1 bg-muted text-primary/30">
                        {facilityLevelToTierLabel(facilityAtSlot.level)}
                      </Badge>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className="aspect-square rounded border border-dashed border-border/20 bg-background/30 flex items-center justify-center group cursor-pointer hover:border-primary/50"
                  >
                    <span className="text-[10px] text-muted-foreground group-hover:text-primary">
                      Empty
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Outpost Strategic Stats */}
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Head Trainer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-card rounded border border-border/10">
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary/30" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">
                    {selectedOutpost.headTrainerId
                      ? `Trainer ${selectedOutpost.headTrainerId}`
                      : "No trainer assigned"}
                  </p>
                  <p className="text-[10px] text-primary uppercase font-bold">Unassigned</p>
                </div>
                <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        aria-label="Swap head trainer"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Swap head trainer</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Specialization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Current Focus</span>
                  <Badge className="bg-muted text-muted-foreground">Not Set</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  No specialization assigned. Manage the tech tree to configure bonuses.
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full text-xs h-8 border-border text-primary hover:bg-primary hover:text-background"
              >
                Manage Tech Tree
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Logistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Daily Upkeep</span>
                <span className="font-mono text-red-400">
                  -
                  {formatCurrency(
                    Object.values(selectedOutpost.facilities).reduce(
                      (sum, f) => sum + (f.maintenanceCost || 0),
                      0,
                    ),
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Transport Fleet</span>
                <span className="text-foreground">Not Deployed</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
