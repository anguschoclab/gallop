/**
 * RosterFilterBar.tsx - Filter bar for stable roster view
 *
 * Extracted from StableRosterView.tsx to isolate filter UI logic.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { Search, Filter, Activity, Heart, Tag, Users } from "lucide-react";

interface RosterFilterBarProps {
  status: string;
  counts: {
    active: number;
    retired: number;
    auctioned: number;
    all: number;
  };
  onStatusChange: (status: string) => void;
}

const STATUS_FILTERS = [
  { key: "active", label: "Active", countKey: "active" as const, icon: Activity, color: "text-success" },
  { key: "retired", label: "Retired", countKey: "retired" as const, icon: Heart, color: "text-pink-400" },
  { key: "auctioned", label: "Archived", countKey: "auctioned" as const, icon: Tag, color: "text-warning" },
  { key: "all", label: "Global", countKey: "all" as const, icon: Users, color: "text-cream" },
] as const;

export function RosterFilterBar({ status, counts, onStatusChange }: RosterFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-black/20 p-4 border border-white/5">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ key, label, countKey, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => onStatusChange(key)}
            className={cn(
              "px-4 py-2 flex items-center gap-3 border font-mono text-[10px] uppercase font-bold tracking-widest transition-all",
              status === key
                ? "bg-white/5 border-gold text-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                : "border-white/5 text-cream/40 hover:text-cream hover:bg-white/[0.02]",
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", status === key ? color : "opacity-40")} />
            {label}
            <span className="opacity-40 ml-1">[{String(counts[countKey]).padStart(2, "0")}]</span>
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
  );
}
