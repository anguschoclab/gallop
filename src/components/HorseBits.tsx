import type { Horse } from "@/game/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { calculateOverallRating } from "@/core/horse/stats";
import { cn } from "@/lib/utils";
import { SilkDot } from "./SilkDot";

/**
 * StatBar — Displays a stat with label and progress bar.
 *
 * Design Bible:
 * - Numbers use IBM Plex Mono with tabular-nums
 * - Clean, scannable layout
 */
export function StatBar({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground font-[family-name:var(--font-body)]">{label}</span>
        <span className="font-medium font-[family-name:var(--font-mono)] tabular-nums">
          {Math.round(value)}
        </span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

/**
 * HorseStats — Grid of stat bars for a horse.
 */
export function HorseStats({ horse, className }: { horse: Horse; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-4 gap-y-2", className)}>
      <StatBar label="Speed" value={horse.stats.speed} />
      <StatBar label="Stamina" value={horse.stats.stamina} />
      <StatBar label="Acceleration" value={horse.stats.acceleration} />
      <StatBar label="Consistency" value={horse.stats.consistency} />
    </div>
  );
}

/**
 * SilkBadge — A larger silk indicator (legacy, prefer SilkDot for new code).
 *
 * Design Bible:
 * - Circular badge with contextual border
 * - White border with shadow for depth
 */
export function SilkBadge({
  color,
  num,
  size = "md",
  className,
}: {
  color: string;
  num?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-bold",
        "border-2 border-white/60 dark:border-white/50 shadow-sm",
        sizeClasses[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {num ?? ""}
    </div>
  );
}

/**
 * HorseBit — Small inline display element (silk + name + status pill).
 *
 * Design Bible:
 * - Use anywhere a horse is mentioned in flowing copy or compact rows
 * - Silk dot beside every horse name
 * - Optional status pill for additional context
 */
export function HorseBit({
  horse,
  showStatus = false,
  status,
  className,
}: {
  horse: Horse;
  showStatus?: boolean;
  status?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <SilkDot color={horse.silk} size="sm" />
      <span className="font-medium font-[family-name:var(--font-display)] text-sm">
        {horse.name}
      </span>
      {showStatus && status && (
        <Badge className="text-[10px] h-4 px-1 bg-t700 text-cream font-[family-name:var(--font-mono)] tabular-nums">
          {status}
        </Badge>
      )}
    </div>
  );
}

/**
 * overall — Calculate overall rating for a horse.
 */
export function overall(h: Horse) {
  return calculateOverallRating(h);
}

/**
 * formatCurrency — Format a number as currency with proper typography.
 *
 * Design Bible:
 * - Uses IBM Plex Mono with tabular-nums
 * - Always use toLocaleString() for formatting
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

/**
 * formatTime — Format race time with proper decimals.
 *
 * Design Bible:
 * - Finish time: two decimal places (92.41s)
 * - Split time: one decimal place (23.4s)
 */
export function formatTime(seconds: number, decimals: 1 | 2 = 2): string {
  return `${seconds.toFixed(decimals)}s`;
}

/**
 * NumericValue — Wrapper for numeric values with proper font.
 *
 * Design Bible: Numbers are the protagonist — use monospace tabular-nums
 */
export function NumericValue({
  value,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number | string;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <span className={cn("font-[family-name:var(--font-mono)] tabular-nums", className)}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
}
