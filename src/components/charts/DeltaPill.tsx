/**
 * DeltaPill.tsx - Trend delta pill with arrow + tabular nums.
 */
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

interface DeltaPillProps {
  value: number;
  /** If true, formats as percentage (value is a fraction, e.g. 0.12 -> +12%) */
  asPercent?: boolean;
  /** Inverts the polarity of "good" (e.g. expenses going up is bad). */
  inverse?: boolean;
  className?: string;
}

export function DeltaPill({ value, asPercent, inverse, className }: DeltaPillProps) {
  const sign = value > 0 ? 1 : value < 0 ? -1 : 0;
  const positive = inverse ? sign < 0 : sign > 0;
  const negative = inverse ? sign > 0 : sign < 0;
  const Icon = sign === 0 ? Minus : sign > 0 ? ArrowUpRight : ArrowDownRight;
  const text = asPercent
    ? `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`
    : `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-semibold tabular-nums",
        positive && "bg-emerald-500/10 text-emerald-300",
        negative && "bg-[color-mix(in_oklab,var(--chart-5)_20%,transparent)] text-[var(--chart-5)]",
        !positive && !negative && "bg-white/5 text-cream/60",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {text}
    </span>
  );
}
