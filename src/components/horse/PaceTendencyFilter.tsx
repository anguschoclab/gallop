/**
 * PaceTendencyFilter — Compact button group for filtering horses by their
 * dominant running tendency (front / mid / off / any), with optional trip and
 * surface selectors. Used in the stable roster and race entry flow.
 */
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { Gauge } from "lucide-react";
import {
  type DistanceBucket,
  type SurfaceFilter,
  type TendencyFilter,
} from "@/core/horse/paceTendency";

const TENDENCIES: { value: TendencyFilter; label: string; short: string }[] = [
  { value: "any", label: "All Styles", short: "All" },
  { value: "front", label: "Front-Runner", short: "Front" },
  { value: "mid", label: "Mid-Pack", short: "Mid" },
  { value: "off", label: "Off-Pace", short: "Off" },
];

interface PaceTendencyFilterProps {
  tendency: TendencyFilter;
  onTendency: (t: TendencyFilter) => void;
  distance?: DistanceBucket;
  onDistance?: (d: DistanceBucket) => void;
  surface?: SurfaceFilter;
  onSurface?: (s: SurfaceFilter) => void;
  /** Hide trip/surface selectors when the context already locks them (e.g. race entry). */
  lockTrip?: boolean;
  className?: string;
}

export function PaceTendencyFilter({
  tendency,
  onTendency,
  distance = "any",
  onDistance,
  surface = "any",
  onSurface,
  lockTrip = false,
  className,
}: PaceTendencyFilterProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 p-2 border border-white/5 bg-slate-900/30",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-cream/40 pr-1">
        <Gauge className="h-3 w-3 text-gold/60" />
        Pace
      </div>
      <div className="flex items-center gap-0.5">
        {TENDENCIES.map((t) => (
          <Button
            key={t.value}
            size="sm"
            variant="ghost"
            onClick={() => onTendency(t.value)}
            className={cn(
              "h-7 px-2.5 text-[10px] font-black uppercase tracking-wider rounded-none",
              tendency === t.value
                ? "bg-gold text-slate-950 hover:bg-gold hover:text-slate-950"
                : "text-cream/50 hover:text-gold hover:bg-gold/10",
            )}
            title={t.label}
          >
            {t.short}
          </Button>
        ))}
      </div>

      {!lockTrip && onDistance && (
        <Select value={distance} onValueChange={(v) => onDistance(v as DistanceBucket)}>
          <SelectTrigger className="h-7 w-[140px] text-[10px] font-mono uppercase border-white/10 bg-black/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Trip</SelectItem>
            <SelectItem value="sprint">Sprint ≤1400m</SelectItem>
            <SelectItem value="mile">Mile 1401–1900m</SelectItem>
            <SelectItem value="route">Route &gt;1900m</SelectItem>
          </SelectContent>
        </Select>
      )}

      {!lockTrip && onSurface && (
        <Select value={surface} onValueChange={(v) => onSurface(v as SurfaceFilter)}>
          <SelectTrigger className="h-7 w-[110px] text-[10px] font-mono uppercase border-white/10 bg-black/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Surface</SelectItem>
            <SelectItem value="Turf">Turf</SelectItem>
            <SelectItem value="Dirt">Dirt</SelectItem>
            <SelectItem value="Synthetic">Synthetic</SelectItem>
          </SelectContent>
        </Select>
      )}

      {lockTrip && (
        <span className="text-[10px] font-mono uppercase tracking-wide text-cream/30">
          · scoped to this race's trip & surface
        </span>
      )}
    </div>
  );
}
