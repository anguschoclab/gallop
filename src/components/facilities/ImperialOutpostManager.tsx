import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGame, useGameWithShallow } from "@/game/store";
import {
  OUTPOST_CONSTANTS,
  type Outpost,
  type FacilityBranch,
} from "@/core/facilities/outpostTypes";
import { FACILITY_NAMES, type FacilityType } from "@/core/facilities/facilityTypes";
import { MapPin, Users, Globe, Hammer, Zap, Heart, TrendingUp, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting";

export function ImperialOutpostManager() {
  const [selectedOutpostId, setSelectedOutpostId] = useState<string | null>(null);

  // Note: For now we'll assume player outposts are stored in a new state field
  // or we'll mock them from existing root facilities for this demo component.
  const outposts = (useGameWithShallow((s) => (s as any).playerOutposts) as Outpost[]) || [
    {
      id: "main",
      name: "Main Farm",
      region: "North America (East)",
      totalSlots: 12,
      facilities: {
        0: {
          type: "main_track",
          level: "elite",
          branch: "turf",
          maintenanceCost: 150,
          upgradeCost: 0,
          builtDay: 1,
        },
        4: {
          type: "barn",
          level: "premium",
          branch: "neutral",
          maintenanceCost: 60,
          upgradeCost: 0,
          builtDay: 1,
        },
        6: {
          type: "starting_gates",
          level: "standard",
          branch: "neutral",
          maintenanceCost: 25,
          upgradeCost: 0,
          builtDay: 10,
        },
      },
      headTrainerId: "trainer-1",
      acclimatizationDays: {},
    },
  ];

  const selectedOutpost = useMemo(
    () => outposts.find((o) => o.id === (selectedOutpostId || outposts[0].id)) || outposts[0],
    [outposts, selectedOutpostId],
  );
  const cash = useGame((s) => s.cash);

  // Calculate used slots
  const usedSlots = useMemo(
    () =>
      Object.entries(selectedOutpost.facilities).reduce((sum, [_, f]) => {
        return sum + (OUTPOST_CONSTANTS.SLOT_FOOTPRINTS[f.type] || 1);
      }, 0),
    [selectedOutpost.facilities],
  );

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
                ? "bg-gold text-t950"
                : "border-gold-muted text-cream-muted",
            )}
            onClick={() => setSelectedOutpostId(outpost.id)}
          >
            <Globe className="w-4 h-4" />
            {outpost.name} ({outpost.region})
          </Button>
        ))}
        <Button
          variant="outline"
          className="gap-2 border-dashed border-gold-muted text-gold shrink-0"
        >
          <MapPin className="w-4 h-4" /> Expand to New Region
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Acreage Plot Grid */}
        <Card className="lg:col-span-2 border-gold-muted bg-t900/50">
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
              <Badge variant="outline" className="text-gold border-gold/30">
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
                            : "bg-t800 border-gold-muted/30",
                      )}
                      style={{
                        gridColumn: `span ${Math.min(footprint, 2)}`,
                        gridRow: `span ${Math.ceil(footprint / 2)}`,
                      }}
                    >
                      <Hammer className="w-3 h-3 text-gold" />
                      <span className="text-[10px] font-bold text-cream uppercase leading-tight">
                        {FACILITY_NAMES[facilityAtSlot.type].split(" ")[0]}
                      </span>
                      <Badge className="h-3 text-[8px] px-1 bg-t700 text-gold-muted">
                        {facilityAtSlot.level}
                      </Badge>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className="aspect-square rounded border border-dashed border-gold-muted/20 bg-t950/30 flex items-center justify-center group cursor-pointer hover:border-gold/50"
                  >
                    <span className="text-[10px] text-cream-muted group-hover:text-gold">
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
          <Card className="border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-cream-muted">
                Head Trainer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-t800 rounded border border-gold-muted/10">
                <div className="w-10 h-10 rounded bg-t700 flex items-center justify-center">
                  <Users className="w-6 h-6 text-gold-muted" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-cream">Marcus Sterling</p>
                  <p className="text-[10px] text-gold uppercase font-bold">Elite Strategist</p>
                </div>
                <Button
                  aria-label="Swap head trainer"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-cream-muted"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-cream-muted">
                Specialization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-cream-muted">Current Focus</span>
                  <Badge className="bg-green-700 text-cream">TURF CATHEDRAL</Badge>
                </div>
                <p className="text-[10px] text-cream-muted italic">
                  +20% Stamina gains, +15% Recovery speed. -5% Dirt Beyer Figure.
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full text-xs h-8 border-gold-muted text-gold hover:bg-gold hover:text-t950"
              >
                Manage Tech Tree
              </Button>
            </CardContent>
          </Card>

          <Card className="border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-cream-muted">
                Logistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-cream-muted">Daily Upkeep</span>
                <span className="font-mono text-red-400">-{formatCurrency(450)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-cream-muted">Transport Fleet</span>
                <span className="text-cream">Elite (Level 4)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
