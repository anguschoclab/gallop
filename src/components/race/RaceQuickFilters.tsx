/**
 * RaceQuickFilters — One-tap chip filters above the race feed. Each chip
 * toggles or sets a field on the existing route search params (driven by
 * useRaceFilters), letting players narrow the schedule without opening the
 * full filter panel.
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { RaceFilters } from "@/hooks/race/useRaceFilters";
import { CalendarClock, Zap, Mountain, Star, Users, CheckCircle2, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface RaceQuickFiltersProps {
  filters: RaceFilters;
  onPatch: (patch: Partial<RaceFilters>) => void;
  onReset: () => void;
  matchCount: number;
}

type ChipDef = {
  key: string;
  label: string;
  icon: LucideIcon;
  active: (f: RaceFilters) => boolean;
  toggle: (f: RaceFilters) => Partial<RaceFilters>;
};

const CHIPS: ChipDef[] = [
  {
    key: "week",
    label: "This Week",
    icon: CalendarClock,
    active: (f) => f.window === "7",
    toggle: (f) => ({ window: f.window === "7" ? "all" : "7" }),
  },
  {
    key: "month",
    label: "Next 30d",
    icon: CalendarClock,
    active: (f) => f.window === "30",
    toggle: (f) => ({ window: f.window === "30" ? "all" : "30" }),
  },
  {
    key: "sprint",
    label: "Sprint",
    icon: Zap,
    active: (f) => f.trip === "sprint",
    toggle: (f) => ({ trip: f.trip === "sprint" ? "all" : "sprint" }),
  },
  {
    key: "mile",
    label: "Mile",
    icon: Zap,
    active: (f) => f.trip === "mile",
    toggle: (f) => ({ trip: f.trip === "mile" ? "all" : "mile" }),
  },
  {
    key: "route",
    label: "Route",
    icon: Mountain,
    active: (f) => f.trip === "route",
    toggle: (f) => ({ trip: f.trip === "route" ? "all" : "route" }),
  },
  {
    key: "g1",
    label: "G1 Only",
    icon: Star,
    active: (f) => f.grade === "G1",
    toggle: (f) => ({ grade: f.grade === "G1" ? "all" : "G1" }),
  },
  {
    key: "turf",
    label: "Turf",
    icon: Mountain,
    active: (f) => f.surface === "Turf",
    toggle: (f) => ({ surface: f.surface === "Turf" ? "all" : "Turf" }),
  },
  {
    key: "dirt",
    label: "Dirt",
    icon: Mountain,
    active: (f) => f.surface === "Dirt",
    toggle: (f) => ({ surface: f.surface === "Dirt" ? "all" : "Dirt" }),
  },
  {
    key: "eligible",
    label: "My Eligible",
    icon: CheckCircle2,
    active: (f) => f.eligibleOnly === "1",
    toggle: (f) => ({ eligibleOnly: f.eligibleOnly === "1" ? undefined : "1" }),
  },
  {
    key: "open",
    label: "Open Field",
    icon: Users,
    active: (f) => f.openOnly === "1",
    toggle: (f) => ({ openOnly: f.openOnly === "1" ? undefined : "1" }),
  },
];

export function RaceQuickFilters({ filters, onPatch, onReset, matchCount }: RaceQuickFiltersProps) {
  const activeCount = CHIPS.filter((c) => c.active(filters)).length;

  return (
    <div className="flex items-center gap-2 p-2 border border-white/5 bg-slate-900/40 flex-wrap">
      <div className="flex items-center gap-2 pr-2 border-r border-white/5">
        <span className="text-[10px] font-mono uppercase tracking-wide text-cream/40">
          Quick Filters
        </span>
        <Badge
          variant="outline"
          className="h-5 px-1.5 text-[9px] font-mono tabular-nums border-gold/30 text-gold-muted"
        >
          {matchCount}
        </Badge>
      </div>

      {CHIPS.map((chip) => {
        const Icon = chip.icon;
        const active = chip.active(filters);
        return (
          <Button
            key={chip.key}
            size="sm"
            variant="ghost"
            onClick={() => onPatch(chip.toggle(filters))}
            className={cn(
              "h-7 px-2.5 gap-1.5 text-[10px] font-black uppercase tracking-wider rounded-none transition-colors",
              active
                ? "bg-gold text-slate-950 hover:bg-gold hover:text-slate-950"
                : "text-cream/60 hover:text-gold hover:bg-gold/10",
            )}
          >
            <Icon className="h-3 w-3" />
            {chip.label}
          </Button>
        );
      })}

      {activeCount > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onReset}
          className="h-7 px-2 gap-1 text-[10px] font-mono uppercase tracking-wide text-cream/40 hover:text-destructive ml-auto"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      )}
    </div>
  );
}
