import type { Horse } from "@/game/types";
import { Progress } from "@/components/ui/progress";
import { calculateOverallRating } from "@/core/horse/stats";

export function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{Math.round(value)}</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

export function HorseStats({ horse }: { horse: Horse }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      <StatBar label="Speed" value={horse.stats.speed} />
      <StatBar label="Stamina" value={horse.stats.stamina} />
      <StatBar label="Acceleration" value={horse.stats.acceleration} />
      <StatBar label="Consistency" value={horse.stats.consistency} />
    </div>
  );
}

export function SilkBadge({ color, num }: { color: string; num?: number }) {
  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow"
      style={{ backgroundColor: color }}
    >
      {num ?? ""}
    </div>
  );
}

export function overall(h: Horse) {
  return calculateOverallRating(h);
}
